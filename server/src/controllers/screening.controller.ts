

import type {
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction as ExpressNextFunction,
} from "express";
import {
   Job,
   Applicant,
   ScreeningResult,
   ScreeningHistory,
   ScreeningConfig,
} from "../models";
import { screenApplicants } from "../services";
import { sendSuccess, AppError } from "../utils";
import { notifier } from "../services/notificationBroadcaster";
import { runPaginatedScreening } from "../services/paginatedScreening";
import type { ScreeningPrefs } from "../types";

interface CriteriaScoresAcc {
   skills: number;
   experience: number;
   education: number;
   projects: number;
   availability: number;
}

interface CombinedCandidate {
   candidateId: string;
   rank: number;
   avgScore: number;
   runScores: Record<number, number>;
   appearances: number;
   avgCriteriaScores?: CriteriaScoresAcc;
   strengths: string[];
   gaps: string[];
   recommendation: string;
   applicant?: unknown;
}

interface CombinedShortlistResult {
   jobId: string;
   runIds: string[];
   runNumbers: number[];
   totalRuns: number;
   shortlistSize: number;
   candidates: CombinedCandidate[];
   computedAt: string;
}

/** A screening lock older than this is considered stale and will be auto-released */
const SCREENING_STALE_MS = 5 * 60 * 1000; // 5 minutes

export async function triggerScreening(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   // Guard against concurrent runs, but auto-release stale locks so retries always work
   if (job.screeningStatus === "running") {
      const isStale =
         !job.screeningStartedAt ||
         Date.now() - job.screeningStartedAt.getTime() > SCREENING_STALE_MS;
      if (!isStale) {
         return next(
            new AppError("Screening is already in progress. Please wait.", 409),
         );
      }
      // Stale lock (>5 min or no timestamp) — fall through and re-run
   }

   const applicants = await Applicant.find({ jobId });
   if (applicants.length === 0) {
      return next(new AppError("No applicants to screen", 400));
   }

   // Load recruiter's AI preferences (owned by job creator)
   const configDoc = await ScreeningConfig.findOne({ userId: job.createdBy });
   const prefs: ScreeningPrefs | undefined = configDoc
      ? {
           scoringWeights: configDoc.scoringWeights,
           minScoreThreshold: configDoc.minScoreThreshold,
           customInstructions: configDoc.customInstructions,
           preferImmediateAvailability: configDoc.preferImmediateAvailability,
        }
      : undefined;

   // Mark AI screening as in-progress; job.status (lifecycle) remains unchanged
   const prevScreeningStatus = job.screeningStatus;
   job.screeningStatus = "running";
   job.screeningStartedAt = new Date();
   await job.save();

   notifier.broadcast({
      id: `screening-started-${jobId}-${Date.now()}`,
      type: "screening_started",
      title: "AI screening started",
      body: job.title,
      jobId: String(jobId),
      at: new Date().toISOString(),
   });

   // Allow per-run shortlist size override from request body (validated against allowed values)
   const VALID_SIZES = [5, 10, 15, 20, 30, 50] as const;
   const { shortlistSize: bodySize } = req.body as { shortlistSize?: number };
   const resolvedShortlistSize = VALID_SIZES.includes(
      bodySize as (typeof VALID_SIZES)[number],
   )
      ? (bodySize as (typeof VALID_SIZES)[number])
      : job.shortlistSize;

   let shortlist: Awaited<ReturnType<typeof screenApplicants>>["shortlist"];
   let modelUsed: string;
   let promptSnapshot: string;

   try {
      ({ shortlist, modelUsed, promptSnapshot } = await screenApplicants(
         job,
         applicants,
         resolvedShortlistSize,
         prefs,
      ));
   } catch (err) {
      // Release screening lock; restore previous screeningStatus so retries work
      job.screeningStatus = prevScreeningStatus;
      job.screeningStartedAt = undefined;
      await job.save();
      notifier.broadcast({
         id: `screening-failed-${jobId}-${Date.now()}`,
         type: "screening_failed",
         title: "Screening failed",
         body: job.title,
         jobId: String(jobId),
         at: new Date().toISOString(),
      });
      return next(err as Error);
   }

   // Enforce min score threshold as a hard server-side filter (AI guidance + hard enforcement)
   const threshold = prefs?.minScoreThreshold ?? 0;
   if (threshold > 0) {
      shortlist = shortlist.filter((c) => c.matchScore >= threshold);
   }

   const screenedAt = new Date();

   const result = await ScreeningResult.findOneAndUpdate(
      { jobId },
      {
         jobId,
         totalApplicants: applicants.length,
         shortlistSize: shortlist.length,
         shortlist,
         screenedAt,
         modelUsed,
         promptSnapshot,
      },
      { upsert: true, new: true },
   );

   // Append to immutable history log
   const topScore =
      shortlist.length > 0
         ? Math.max(...shortlist.map((c) => c.matchScore))
         : 0;
   const avgScore =
      shortlist.length > 0
         ? Math.round(
              shortlist.reduce((s, c) => s + c.matchScore, 0) /
                 shortlist.length,
           )
         : 0;
   const runNumber = (await ScreeningHistory.countDocuments({ jobId })) + 1;
   await ScreeningHistory.create({
      jobId,
      runNumber,
      totalApplicants: applicants.length,
      shortlistSize: shortlist.length,
      topScore,
      avgScore,
      modelUsed,
      screenedAt,
      shortlist, // full shortlist stored so history runs are viewable
   });

   job.screeningStatus = "done";
   job.lastScreenedApplicantCount = applicants.length;
   job.screeningStartedAt = undefined;
   await job.save();

   notifier.broadcast({
      id: `screening-done-${jobId}-${Date.now()}`,
      type: "screening_done",
      title: "Screening complete",
      body: `${shortlist.length} candidate${shortlist.length !== 1 ? "s" : ""} shortlisted for "${job.title}"`,
      jobId: String(jobId),
      at: new Date().toISOString(),
   });

   sendSuccess(res, result!.toObject(), "Screening completed");
}

export async function getScreeningResult(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   const result = await ScreeningResult.findOne({ jobId });
   if (!result)
      return next(new AppError("No screening results found for this job", 404));

   const enriched = await Promise.all(
      result.shortlist.map(async (entry) => {
         const applicant = await Applicant.findById(entry.candidateId).select(
            "profile.firstName profile.lastName profile.email profile.headline profile.location profile.skills profile.availability profile.socialLinks source",
         );
         // Cast to Document to call toObject() — Mongoose subdocs don't expose it on the typed interface
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const plain = (entry as any).toObject?.() ?? {
            candidateId: entry.candidateId,
            rank: entry.rank,
            matchScore: entry.matchScore,
            strengths: entry.strengths,
            gaps: entry.gaps,
            recommendation: entry.recommendation,
         };
         return { ...plain, applicant };
      }),
   );

   sendSuccess(res, { ...result.toObject(), shortlist: enriched });
}

export async function getScreeningHistory(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   const history = await ScreeningHistory.find({ jobId })
      .sort({ screenedAt: -1 })
      .limit(50);

   sendSuccess(res, history);
}

export async function getHistoryRunDetail(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const { jobId, historyId } = req.params as {
      jobId: string;
      historyId: string;
   };

   const run = await ScreeningHistory.findById(historyId);
   if (!run || String(run.jobId) !== jobId) {
      return next(new AppError("History run not found", 404));
   }

   const enriched = await Promise.all(
      run.shortlist.map(async (entry) => {
         const applicant = await Applicant.findById(entry.candidateId).select(
            "profile.firstName profile.lastName profile.email profile.headline profile.location profile.skills profile.availability profile.socialLinks source",
         );
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const plain = (entry as any).toObject?.() ?? { ...entry };
         return { ...plain, applicant };
      }),
   );

   sendSuccess(res, { ...run.toObject(), shortlist: enriched });
}

export async function getAllShortlists(
   _req: ExpressRequest,
   res: ExpressResponse,
): Promise<void> {
   const results = await ScreeningResult.find({})
      .sort({ screenedAt: -1 })
      .lean();

   const jobIds = results.map((r) => r.jobId);
   const jobs = await Job.find({ _id: { $in: jobIds } })
      .select("title location type status requiredSkills shortlistSize")
      .lean();

   const jobMap = new Map(jobs.map((j) => [String(j._id), j]));

   const applicantIds = results.flatMap((r) =>
      r.shortlist.map((c) => c.candidateId),
   );
   const applicants = await Applicant.find({ _id: { $in: applicantIds } })
      .select(
         "profile.firstName profile.lastName profile.email profile.headline profile.location profile.skills profile.availability profile.socialLinks source",
      )
      .lean();
   const applicantMap = new Map(applicants.map((a) => [String(a._id), a]));

   const enriched = results.map((result) => ({
      ...result,
      job: jobMap.get(String(result.jobId)) ?? null,
      shortlist: result.shortlist.map((entry) => ({
         ...entry,
         applicant: applicantMap.get(String(entry.candidateId)) ?? null,
      })),
   }));

   sendSuccess(res, enriched);
}

export async function triggerPaginatedScreening(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   if (job.screeningStatus === "running") {
      const isStale =
         !job.screeningStartedAt ||
         Date.now() - job.screeningStartedAt.getTime() > SCREENING_STALE_MS;
      if (!isStale) {
         return next(
            new AppError("Screening is already in progress. Please wait.", 409),
         );
      }
   }

   const applicantCount = await Applicant.countDocuments({ jobId });
   if (applicantCount === 0)
      return next(new AppError("No applicants to screen", 400));

   job.screeningStatus = "running";
   job.screeningStartedAt = new Date();
   await job.save();

   notifier.broadcast({
      id: `screening-started-${jobId}-${Date.now()}`,
      type: "screening_started",
      title: "AI screening started",
      body: job.title,
      jobId: String(jobId),
      at: new Date().toISOString(),
   });

   // Allow per-run shortlist size override from request body (validated against allowed values)
   const VALID_SIZES_PAG = [5, 10, 15, 20, 30, 50] as const;
   const { shortlistSize: bodySize } = req.body as { shortlistSize?: number };
   const resolvedShortlistSize = VALID_SIZES_PAG.includes(
      bodySize as (typeof VALID_SIZES_PAG)[number],
   )
      ? (bodySize as number)
      : job.shortlistSize;

   setImmediate(() => {
      runPaginatedScreening(String(jobId), resolvedShortlistSize).catch(
         (err) => {
            console.error("[paginated-screening] background job error:", err);
            Job.findByIdAndUpdate(jobId, {
               screeningStatus: "none",
               screeningStartedAt: undefined,
            }).catch(() => {});
            notifier.broadcast({
               id: `screening-failed-${jobId}-${Date.now()}`,
               type: "screening_failed",
               title: "Screening failed",
               body: (err as Error).message ?? job.title,
               jobId: String(jobId),
               at: new Date().toISOString(),
            });
         },
      );
   });

   res.status(202).json({
      success: true,
      message: "Paginated screening started",
      data: {
         status: "running",
         totalApplicants: applicantCount,
         totalPages: Math.ceil(applicantCount / 30),
         pageSize: 30,
      },
   });
}

// ─── POST /jobs/:jobId/screening/combine ─────────────────────────────────────

export async function combineScreeningRuns(
   req: ExpressRequest,
   res: ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   const { runIds, strategy = "average" } = req.body as {
      runIds?: string[];
      strategy?: "average" | "max" | "min";
   };
   if (!Array.isArray(runIds) || runIds.length < 2) {
      return next(new AppError("Provide at least 2 runIds to combine", 400));
   }
   if (!["average", "max", "min"].includes(strategy)) {
      return next(
         new AppError('strategy must be "average", "max", or "min"', 400),
      );
   }

   const runs = await ScreeningHistory.find({ _id: { $in: runIds }, jobId });
   if (runs.length < 2) {
      return next(
         new AppError("Could not find at least 2 runs for this job", 404),
      );
   }

   type Acc = {
      totalScore: number;
      totalCriteria: CriteriaScoresAcc;
      appearances: number;
      runScores: Record<number, number>;
      strengths: string[];
      gaps: string[];
      recommendation: string;
   };
   const accMap = new Map<string, Acc>();

   for (const run of runs) {
      for (const c of run.shortlist) {
         const id = String(c.candidateId);
         const acc = accMap.get(id) ?? {
            totalScore: 0,
            totalCriteria: {
               skills: 0,
               experience: 0,
               education: 0,
               projects: 0,
               availability: 0,
            },
            appearances: 0,
            runScores: {},
            strengths: c.strengths,
            gaps: c.gaps,
            recommendation: c.recommendation,
         };

         acc.totalScore += c.matchScore;
         acc.runScores[run.runNumber] = c.matchScore;
         acc.appearances += 1;

         if (c.criteriaScores) {
            acc.totalCriteria.skills += c.criteriaScores.skills ?? 0;
            acc.totalCriteria.experience += c.criteriaScores.experience ?? 0;
            acc.totalCriteria.education += c.criteriaScores.education ?? 0;
            acc.totalCriteria.projects += c.criteriaScores.projects ?? 0;
            acc.totalCriteria.availability +=
               c.criteriaScores.availability ?? 0;
         }

         accMap.set(id, acc);
      }
   }

   const candidateIds = [...accMap.keys()];
   const applicants = await Applicant.find({ _id: { $in: candidateIds } })
      .select(
         "profile.firstName profile.lastName profile.email profile.headline profile.location profile.skills profile.availability profile.socialLinks source",
      )
      .lean();
   const applicantMap = new Map(applicants.map((a) => [String(a._id), a]));

   const combined: CombinedCandidate[] = [];
   for (const [candidateId, acc] of accMap) {
      const n = acc.appearances;
      const allRunScores = Object.values(acc.runScores);
      let finalScore: number;
      if (strategy === "max") {
         finalScore = Math.round(Math.max(...allRunScores));
      } else if (strategy === "min") {
         finalScore = Math.round(Math.min(...allRunScores));
      } else {
         finalScore = Math.round(acc.totalScore / n);
      }
      combined.push({
         candidateId,
         rank: 0,
         avgScore: finalScore,
         runScores: acc.runScores,
         appearances: n,
         avgCriteriaScores: {
            skills: Math.round(acc.totalCriteria.skills / n),
            experience: Math.round(acc.totalCriteria.experience / n),
            education: Math.round(acc.totalCriteria.education / n),
            projects: Math.round(acc.totalCriteria.projects / n),
            availability: Math.round(acc.totalCriteria.availability / n),
         },
         strengths: acc.strengths,
         gaps: acc.gaps,
         recommendation: acc.recommendation,
         applicant: applicantMap.get(candidateId),
      });
   }

   combined.sort((a, b) => b.avgScore - a.avgScore);
   const top = combined
      .slice(0, job.shortlistSize)
      .map((c, i) => ({ ...c, rank: i + 1 }));

   const result: CombinedShortlistResult = {
      jobId: String(jobId),
      runIds: runs.map((r) => String(r._id)),
      runNumbers: runs.map((r) => r.runNumber),
      totalRuns: runs.length,
      shortlistSize: job.shortlistSize,
      candidates: top,
      computedAt: new Date().toISOString(),
   };

   sendSuccess(res, result);
}
