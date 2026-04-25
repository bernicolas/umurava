import type {
   Request as Req,
   Response as Res,
   NextFunction as Next,
} from "express";
import {
   Job,
   ScreeningHistory,
   ScreeningResult,
   Applicant,
   EmailSettings,
   User,
} from "../models";
import { sendSuccess, AppError } from "../utils";
import { sendBulkEmails } from "../services/email.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "gemini-2.5-flash" → "Gemini 2.5 Flash" */
function formatModelName(raw: string): string {
   return raw
      .replace(/^gemini[-\s]?/i, "Gemini ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
}

/** "Jane Smith" → "Jane" */
function firstName(full: string): string {
   return full.split(" ")[0] ?? full;
}

export interface ActivityItem {
   id: string;
   type:
      | "job_created"
      | "screening"
      | "finalized"
      | "email_invitation"
      | "email_regret";
   title: string;
   description?: string;
   at: string;
   jobId?: string;
   jobTitle?: string;
   meta?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// GET /jobs/:jobId/screening/activity
// ──────────────────────────────────────────────
export async function getJobActivity(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const events: ActivityItem[] = [];

   const [job, historyRuns, screeningResult] = await Promise.all([
      Job.findById(jobId)
         .select("title location type createdAt createdBy")
         .lean(),
      ScreeningHistory.find({ jobId }).sort({ screenedAt: 1 }).lean(),
      ScreeningResult.findOne({ jobId }).lean(),
   ]);

   if (!job) {
      return next(new AppError("Job not found", 404));
   }

   // Look up recruiter names for audit trail
   const userIdsToFetch = new Set<string>();
   const jobDoc = job as unknown as {
      title: string;
      type?: string;
      location?: string;
      createdAt?: Date;
      createdBy?: unknown;
   };
   if (jobDoc.createdBy) userIdsToFetch.add(String(jobDoc.createdBy));
   if (screeningResult?.finalSelection?.finalizedBy)
      userIdsToFetch.add(String(screeningResult.finalSelection.finalizedBy));

   const usersArr = userIdsToFetch.size
      ? await User.find({ _id: { $in: [...userIdsToFetch] } })
           .select("name")
           .lean()
      : [];
   const userMap = new Map(
      (usersArr as unknown as { _id: unknown; name: string }[]).map((u) => [
         String(u._id),
         u.name,
      ]),
   );

   const creatorName = userMap.get(String(jobDoc.createdBy)) ?? "";

   events.push({
      id: `job_created_${jobId}`,
      type: "job_created",
      title: creatorName
         ? `${creatorName} posted this position`
         : "Position Posted",
      description: [jobDoc.title, jobDoc.type, jobDoc.location]
         .filter(Boolean)
         .join(" · "),
      at: jobDoc.createdAt?.toISOString() ?? new Date(0).toISOString(),
      jobId: String(jobId),
      jobTitle: jobDoc.title,
      meta: { creatorName },
   });

   for (const run of historyRuns) {
      const aiName = formatModelName(run.modelUsed);
      events.push({
         id: `screening_${String(run._id)}`,
         type: "screening",
         title: `${aiName} screened ${run.totalApplicants} applicant${run.totalApplicants === 1 ? "" : "s"}`,
         description: `Recommended ${run.shortlistSize} for shortlist · top match score ${run.topScore}%`,
         at: run.screenedAt.toISOString(),
         jobId: String(jobId),
         jobTitle: jobDoc.title,
         meta: {
            runNumber: run.runNumber,
            totalApplicants: run.totalApplicants,
            shortlistSize: run.shortlistSize,
            topScore: run.topScore,
            avgScore: run.avgScore,
            modelUsed: run.modelUsed,
            aiName,
         },
      });
   }

   if (screeningResult) {
      const fs = screeningResult.finalSelection;
      if (fs?.finalizedAt) {
         const finalizerName = userMap.get(String(fs.finalizedBy)) ?? "";
         const fn = finalizerName ? firstName(finalizerName) : "Recruiter";
         const sel = fs.selectedCandidateIds.length;
         const rej = fs.rejectedCandidateIds.length;
         const pool = fs.talentPoolCandidateIds.length;
         const parts = [
            sel > 0 && `selected ${sel}`,
            rej > 0 && `rejected ${rej}`,
            pool > 0 && `added ${pool} to talent pool`,
         ].filter(Boolean);
         events.push({
            id: `finalized_${jobId}`,
            type: "finalized",
            title: `${fn} finalized the selection`,
            description: parts.length
               ? parts.join(", ")
               : "No candidates were categorized",
            at: fs.finalizedAt.toISOString(),
            jobId: String(jobId),
            jobTitle: jobDoc.title,
            meta: {
               selectedCount: sel,
               poolCount: pool,
               rejectedCount: rej,
               selectionType: fs.selectionType,
               finalizerName,
            },
         });
      }

      const el = screeningResult.emailLog;
      if (el?.interviewInvitationsSent && el.interviewInvitationsSentAt) {
         const n = el.interviewInvitationCount ?? 0;
         events.push({
            id: `email_invitation_${jobId}`,
            type: "email_invitation",
            title: `${n} interview invitation${n === 1 ? "" : "s"} sent`,
            description: `Selected candidate${n === 1 ? "" : "s"} notified of interview`,
            at: el.interviewInvitationsSentAt.toISOString(),
            jobId: String(jobId),
            jobTitle: jobDoc.title,
            meta: { count: n },
         });
      }

      if (el?.regretLettersSent && el.regretLettersSentAt) {
         const n = el.regretLetterCount ?? 0;
         events.push({
            id: `email_regret_${jobId}`,
            type: "email_regret",
            title: `${n} regret letter${n === 1 ? "" : "s"} sent`,
            description: `Unsuccessful candidate${n === 1 ? "" : "s"} notified`,
            at: el.regretLettersSentAt.toISOString(),
            jobId: String(jobId),
            jobTitle: jobDoc.title,
            meta: { count: n },
         });
      }
   }

   events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

   sendSuccess(res, { events, total: events.length });
}

// ──────────────────────────────────────────────
// GET /activity/global?limit=30
// Aggregates recent activity across ALL jobs for the current user's org
// ──────────────────────────────────────────────
export async function getGlobalActivity(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const limit = Math.min(Number(req.query.limit) || 30, 100);
   const userId = req.user!.userId;

   const events: ActivityItem[] = [];

   const jobs = await Job.find({ createdBy: userId })
      .select("title location type createdAt createdBy")
      .sort({ createdAt: -1 })
      .lean();

   if (!jobs.length) {
      return sendSuccess(res, { events: [], total: 0 });
   }

   const jobIds = jobs.map((j) => j._id);
   const jobMap = new Map(
      jobs.map((j) => [
         String(j._id),
         j as unknown as {
            title: string;
            type?: string;
            location?: string;
            createdAt?: Date;
            createdBy?: unknown;
         },
      ]),
   );

   // Fetch screening data in parallel
   const [historyRuns, screeningResults] = await Promise.all([
      ScreeningHistory.find({ jobId: { $in: jobIds } })
         .sort({ screenedAt: -1 })
         .limit(50)
         .lean(),
      ScreeningResult.find({ jobId: { $in: jobIds } })
         .select("jobId finalSelection emailLog")
         .lean(),
   ]);

   // Batch-fetch all recruiter names needed for audit trail
   const userIdsToFetch = new Set<string>([String(userId)]);
   for (const result of screeningResults) {
      if (result.finalSelection?.finalizedBy)
         userIdsToFetch.add(String(result.finalSelection.finalizedBy));
   }
   const usersArr = await User.find({ _id: { $in: [...userIdsToFetch] } })
      .select("name")
      .lean();
   const userMap = new Map(
      (usersArr as unknown as { _id: unknown; name: string }[]).map((u) => [
         String(u._id),
         u.name,
      ]),
   );
   const creatorName = userMap.get(String(userId)) ?? "";

   // Job creation events
   for (const job of jobs) {
      const j = job as unknown as {
         _id: unknown;
         title: string;
         type?: string;
         location?: string;
         createdAt?: Date;
      };
      events.push({
         id: `job_created_${String(j._id)}`,
         type: "job_created",
         title: creatorName
            ? `${creatorName} posted this position`
            : "Position Posted",
         description: [j.title, j.type, j.location].filter(Boolean).join(" · "),
         at: j.createdAt?.toISOString() ?? new Date(0).toISOString(),
         jobId: String(j._id),
         jobTitle: j.title,
         meta: { creatorName },
      });
   }

   // Screening history runs
   for (const run of historyRuns) {
      const job = jobMap.get(String(run.jobId));
      const aiName = formatModelName(run.modelUsed);
      events.push({
         id: `screening_${String(run._id)}`,
         type: "screening",
         title: `${aiName} screened ${run.totalApplicants} applicant${run.totalApplicants === 1 ? "" : "s"}`,
         description: `Recommended ${run.shortlistSize} for shortlist · top match score ${run.topScore}%`,
         at: run.screenedAt.toISOString(),
         jobId: String(run.jobId),
         jobTitle: job?.title,
         meta: {
            runNumber: run.runNumber,
            totalApplicants: run.totalApplicants,
            shortlistSize: run.shortlistSize,
            topScore: run.topScore,
            avgScore: run.avgScore,
            modelUsed: run.modelUsed,
            aiName,
         },
      });
   }

   // Finalization + email events
   for (const result of screeningResults) {
      const job = jobMap.get(String(result.jobId));
      const fs = result.finalSelection;
      if (fs?.finalizedAt) {
         const finalizerName = userMap.get(String(fs.finalizedBy)) ?? "";
         const fn = finalizerName ? firstName(finalizerName) : "Recruiter";
         const sel = fs.selectedCandidateIds.length;
         const rej = fs.rejectedCandidateIds.length;
         const pool = fs.talentPoolCandidateIds.length;
         const parts = [
            sel > 0 && `selected ${sel}`,
            rej > 0 && `rejected ${rej}`,
            pool > 0 && `added ${pool} to talent pool`,
         ].filter(Boolean);
         events.push({
            id: `finalized_${String(result.jobId)}`,
            type: "finalized",
            title: `${fn} finalized the selection`,
            description: parts.length
               ? parts.join(", ")
               : "No candidates were categorized",
            at: fs.finalizedAt.toISOString(),
            jobId: String(result.jobId),
            jobTitle: job?.title,
            meta: {
               selectedCount: sel,
               poolCount: pool,
               rejectedCount: rej,
               selectionType: fs.selectionType,
               finalizerName,
            },
         });
      }

      const el = result.emailLog;
      if (el?.interviewInvitationsSent && el.interviewInvitationsSentAt) {
         const n = el.interviewInvitationCount ?? 0;
         events.push({
            id: `email_invitation_${String(result.jobId)}`,
            type: "email_invitation",
            title: `${n} interview invitation${n === 1 ? "" : "s"} sent`,
            description: `Selected candidate${n === 1 ? "" : "s"} notified of interview`,
            at: el.interviewInvitationsSentAt.toISOString(),
            jobId: String(result.jobId),
            jobTitle: job?.title,
            meta: { count: n },
         });
      }
      if (el?.regretLettersSent && el.regretLettersSentAt) {
         const n = el.regretLetterCount ?? 0;
         events.push({
            id: `email_regret_${String(result.jobId)}`,
            type: "email_regret",
            title: `${n} regret letter${n === 1 ? "" : "s"} sent`,
            description: `Unsuccessful candidate${n === 1 ? "" : "s"} notified`,
            at: el.regretLettersSentAt.toISOString(),
            jobId: String(result.jobId),
            jobTitle: job?.title,
            meta: { count: n },
         });
      }
   }

   events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
   const sliced = events.slice(0, limit);

   sendSuccess(res, { events: sliced, total: events.length });
}

// ──────────────────────────────────────────────
// POST /jobs/:jobId/screening/activity/compose
// Body: { to, subject, bodyHtml }
// ──────────────────────────────────────────────
export async function composeJobEmail(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const userId = req.user!.userId;
   const { to, customTo, cc, subject, bodyHtml, sendMeCopy } = req.body as {
      to: "selected" | "rejected" | "pool" | "all" | "custom";
      customTo?: string[];
      cc?: string[];
      subject: string;
      bodyHtml: string;
      sendMeCopy?: boolean;
   };

   const validGroups = ["selected", "rejected", "pool", "all", "custom"];
   if (!validGroups.includes(to)) {
      return next(
         new AppError(
            "to must be one of: selected, rejected, pool, all, custom",
            422,
         ),
      );
   }
   if (to === "custom" && (!Array.isArray(customTo) || !customTo.length)) {
      return next(
         new AppError('customTo emails are required when to is "custom"', 422),
      );
   }
   if (!subject?.trim()) {
      return next(new AppError("subject is required", 422));
   }
   if (!bodyHtml?.trim()) {
      return next(new AppError("bodyHtml is required", 422));
   }

   const [emailSettings, user] = await Promise.all([
      EmailSettings.findOne({ userId }).select("+smtpPassEncrypted").lean(),
      (await import("../models")).User.findById(userId)
         .select("name email")
         .lean(),
   ]);

   if (!emailSettings) {
      return next(
         new AppError(
            "Email settings not configured. Please configure SMTP in Settings → Email.",
            400,
         ),
      );
   }

   let recipients: { email: string; firstName: string; lastName: string }[] =
      [];

   if (to === "custom") {
      // Build minimal recipient records from raw email addresses
      recipients = (customTo ?? []).map((email) => {
         const [localPart] = email.split("@");
         return { email, firstName: localPart ?? "Candidate", lastName: "" };
      });
   } else {
      const result = await ScreeningResult.findOne({ jobId }).lean();
      if (!result) {
         return next(
            new AppError("No screening result found for this job", 404),
         );
      }

      const fs = result.finalSelection;
      let candidateIds: string[];
      if (to === "selected") {
         candidateIds = fs?.selectedCandidateIds ?? [];
      } else if (to === "rejected") {
         candidateIds = fs?.rejectedCandidateIds ?? [];
      } else if (to === "pool") {
         candidateIds = fs?.talentPoolCandidateIds ?? [];
      } else {
         candidateIds = result.shortlist.map((c) => c.candidateId);
      }

      if (!candidateIds.length) {
         return next(
            new AppError(`No candidates found in the "${to}" group`, 400),
         );
      }

      const applicants = await Applicant.find({
         _id: { $in: candidateIds },
         jobId,
      })
         .select("profile.firstName profile.lastName profile.email")
         .lean();

      recipients = applicants.map((a) => ({
         email: a.profile.email,
         firstName: a.profile.firstName,
         lastName: a.profile.lastName,
      }));
   }

   // Optionally include the recruiter as an extra recipient (send me a copy)
   if (sendMeCopy && user && "email" in user) {
      const recruiterEmail = (user as { email: string; name?: string }).email;
      const recruiterName = (user as { name?: string }).name ?? "";
      const [fn = "Me", ln = ""] = recruiterName.split(" ");
      recipients = [
         ...recipients,
         { email: recruiterEmail, firstName: fn, lastName: ln },
      ];
   }

   const recruiterName =
      user && "name" in user ? ((user as { name?: string }).name ?? "") : "";
   const { isValidObjectId } = await import("mongoose");
   const job = isValidObjectId(jobId)
      ? ((await Job.findById(jobId).select("title").lean()) as {
           title?: string;
        } | null)
      : null;

   const { sent, failed, errors } = await sendBulkEmails(
      emailSettings as unknown as import("../models/EmailSettings").IEmailSettings,
      recipients,
      subject,
      bodyHtml,
      { jobTitle: job?.title ?? "", recruiterName, cc },
   );

   sendSuccess(res, {
      sent,
      failed,
      errors,
      message:
         failed > 0
            ? `${sent} email(s) sent. ${failed} failed.`
            : `${sent} email(s) sent successfully.`,
   });
}
