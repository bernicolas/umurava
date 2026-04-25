import type { Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { Applicant, Job } from "../models";
import { ScreeningResult } from "../models/ScreeningResult";
import { ScreeningHistory } from "../models/ScreeningHistory";
import { sendSuccess, sendPaginated, AppError } from "../utils";
import {
   parseSpreadsheet,
   parsePdfResume,
   parseResumeToProfile,
} from "../services";
import type { TalentProfile } from "../types";

export const bulkProfileValidation = [
   body("profiles")
      .isArray({ min: 1 })
      .withMessage("profiles must be a non-empty array"),
];

const REQUIRED_KEYS: (keyof TalentProfile)[] = [
   "firstName",
   "lastName",
   "email",
   "headline",
   "location",
   "skills",
   "experience",
   "education",
   "projects",
   "availability",
];

export async function addPlatformApplicants(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));
   if (job.status === "closed") {
      return next(
         new AppError(
            "This job is closed and no longer accepting new applicants",
            403,
         ),
      );
   }

   const profiles: unknown = req.body.profiles;

   if (!Array.isArray(profiles) || profiles.length === 0) {
      return next(new AppError('"profiles" must be a non-empty array', 400));
   }

   const invalid = profiles.some(
      (p) =>
         typeof p !== "object" ||
         p === null ||
         REQUIRED_KEYS.some((k) => !(k in p)),
   );
   if (invalid) {
      return next(
         new AppError("One or more profiles are missing required fields", 422),
      );
   }

   const docs = (profiles as TalentProfile[]).map((p) => ({
      jobId,
      source: "platform",
      profile: p,
   }));

   const inserted = await Applicant.insertMany(docs);

   sendSuccess(
      res,
      { count: inserted.length },
      `${inserted.length} applicants added`,
      201,
   );
}

export async function uploadExternalApplicants(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));
   if (job.status === "closed") {
      return next(
         new AppError(
            "This job is closed and no longer accepting new applicants",
            403,
         ),
      );
   }

   if (!req.file) return next(new AppError("No file uploaded", 400));

   const profiles = parseSpreadsheet(req.file.buffer, req.file.mimetype);
   const docs = profiles.map((p) => ({
      jobId,
      source: "external",
      profile: p,
   }));
   const inserted = await Applicant.insertMany(docs);

   sendSuccess(
      res,
      { count: inserted.length },
      `${inserted.length} applicants imported`,
      201,
   );
}

export async function uploadResumeApplicant(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));
   if (job.status === "closed") {
      return next(
         new AppError(
            "This job is closed and no longer accepting new applicants",
            403,
         ),
      );
   }

   if (!req.file) return next(new AppError("No file uploaded", 400));
   if (req.file.mimetype !== "application/pdf") {
      return next(new AppError("Only PDF resumes are accepted", 400));
   }

   const profile = await parseResumeToProfile(req.file.buffer);
   const inserted = await Applicant.create({
      jobId,
      source: "external",
      profile,
   });

   sendSuccess(
      res,
      { count: 1, applicant: inserted },
      "Resume parsed and applicant added",
      201,
   );
}

export async function uploadResumeApplicantsBulk(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));
   if (job.status === "closed") {
      return next(
         new AppError(
            "This job is closed and no longer accepting new applicants",
            403,
         ),
      );
   }

   const files = req.files as Express.Multer.File[];
   if (!files || files.length === 0)
      return next(new AppError("No files uploaded", 400));
   if (files.length > 10)
      return next(new AppError("Maximum 10 resumes per upload", 400));

   const nonPdfs = files.filter((f) => f.mimetype !== "application/pdf");
   if (nonPdfs.length > 0) {
      return next(
         new AppError(
            `Only PDF resumes are accepted. Invalid: ${nonPdfs.map((f) => f.originalname).join(", ")}`,
            400,
         ),
      );
   }

   // Parse all resumes concurrently
   const results = await Promise.allSettled(
      files.map((file) => parseResumeToProfile(file.buffer)),
   );

   const applicants: unknown[] = [];
   const errors: string[] = [];

   for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const fileName = files[i]!.originalname;

      if (result.status === "fulfilled") {
         const inserted = await Applicant.create({
            jobId,
            source: "external",
            profile: result.value,
         });
         applicants.push(inserted);
      } else {
         errors.push(
            `${fileName}: ${result.reason?.message ?? "Unknown error"}`,
         );
      }
   }

   sendSuccess(
      res,
      { count: applicants.length, applicants, errors },
      `${applicants.length} of ${files.length} resumes parsed successfully`,
      201,
   );
}

export async function getApplicants(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
   const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10)),
   );

   const [applicants, total] = await Promise.all([
      Applicant.find({ jobId })
         .sort({ createdAt: -1 })
         .skip((page - 1) * limit)
         .limit(limit)
         .select("-profile.bio -rawData"),
      Applicant.countDocuments({ jobId }),
   ]);

   sendPaginated(res, applicants, total, page, limit);
}

export async function deleteApplicant(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const jobId = req.params["jobId"];
   const job = await Job.findById(jobId);
   if (!job) return next(new AppError("Job not found", 404));

   const deleted = await Applicant.findOneAndDelete({
      _id: req.params["applicantId"],
      jobId,
   });
   if (!deleted) return next(new AppError("Applicant not found", 404));

   sendSuccess(res, null, "Applicant removed");
}

export async function getApplicantById(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const applicant = await Applicant.findById(req.params["applicantId"]);
   if (!applicant) return next(new AppError("Applicant not found", 404));

   const applicantIdStr = applicant._id.toString();

   const [job, screeningResult, historyRuns] = await Promise.all([
      Job.findById(applicant.jobId).select(
         "title location type status requiredSkills requiredExperience shortlistSize",
      ),
      ScreeningResult.findOne({ jobId: applicant.jobId }),
      ScreeningHistory.find({ jobId: applicant.jobId }).sort({
         screenedAt: -1,
      }),
   ]);

   const screeningEntry =
      screeningResult?.shortlist?.find(
         (c) => c.candidateId === applicantIdStr,
      ) ?? null;

   // Build per-run history for this specific applicant across all history runs
   const screeningHistory = historyRuns
      .map((run) => {
         const entry = run.shortlist.find(
            (c) => c.candidateId === applicantIdStr,
         );
         if (!entry) return null;
         return {
            runNumber: run.runNumber,
            screenedAt: run.screenedAt,
            matchScore: entry.matchScore,
            rank: entry.rank,
            criteriaScores: entry.criteriaScores ?? null,
            strengths: entry.strengths,
            gaps: entry.gaps,
            recommendation: entry.recommendation,
            totalApplicants: run.totalApplicants,
            shortlistSize: run.shortlistSize,
            modelUsed: run.modelUsed,
         };
      })
      .filter(Boolean);

   sendSuccess(res, {
      applicant,
      job,
      screening: screeningEntry
         ? {
              matchScore: screeningEntry.matchScore,
              rank: screeningEntry.rank,
              criteriaScores: screeningEntry.criteriaScores ?? null,
              strengths: screeningEntry.strengths,
              gaps: screeningEntry.gaps,
              recommendation: screeningEntry.recommendation,
              screenedAt: screeningResult!.screenedAt,
              totalApplicants: screeningResult!.totalApplicants,
              shortlistSize: screeningResult!.shortlistSize,
           }
         : null,
      screeningHistory,
   });
}
