import type {
   Request as Req,
   Response as Res,
   NextFunction as Next,
} from "express";
import { Types } from "mongoose";
import {
   ScreeningResult,
   Applicant,
   TalentPool,
   EmailSettings,
   Job,
   User,
} from "../models";
import { sendSuccess, AppError } from "../utils";
import { sendBulkEmails } from "../services/email.service";

// ──────────────────────────────────────────────
// GET /jobs/:jobId/screening/finalization
// ──────────────────────────────────────────────
export async function getFinalization(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const result = await ScreeningResult.findOne({ jobId });
   if (!result) {
      return next(new AppError("No screening result found for this job", 404));
   }

   sendSuccess(res, {
      finalized: !!result.finalSelection?.finalizedAt,
      finalSelection: result.finalSelection ?? null,
      emailLog: result.emailLog ?? null,
      shortlist: result.shortlist,
   });
}

// ──────────────────────────────────────────────
// POST /jobs/:jobId/screening/finalize
// Body: { selectionType, selectedCandidateIds, rejectedCandidateIds, talentPoolCandidateIds }
// ──────────────────────────────────────────────
export async function finalizeCandidates(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const userId = req.user!.userId;
   const {
      selectionType,
      selectedCandidateIds,
      rejectedCandidateIds,
      talentPoolCandidateIds,
   } = req.body as {
      selectionType: "ai_recommended" | "manual";
      selectedCandidateIds: string[];
      rejectedCandidateIds: string[];
      talentPoolCandidateIds: string[];
   };

   if (!["ai_recommended", "manual"].includes(selectionType)) {
      return next(
         new AppError(
            'selectionType must be "ai_recommended" or "manual"',
            422,
         ),
      );
   }
   if (!Array.isArray(selectedCandidateIds)) {
      return next(new AppError("selectedCandidateIds must be an array", 422));
   }

   const result = await ScreeningResult.findOne({ jobId });
   if (!result) {
      return next(new AppError("No screening result found for this job", 404));
   }

   result.finalSelection = {
      selectedCandidateIds: selectedCandidateIds.map(String),
      rejectedCandidateIds: (rejectedCandidateIds ?? []).map(String),
      talentPoolCandidateIds: (talentPoolCandidateIds ?? []).map(String),
      selectionType,
      finalizedAt: new Date(),
      finalizedBy: new Types.ObjectId(userId),
   };

   await result.save();

   // Upsert talent pool entries for near-miss candidates
   const tpIds = result.finalSelection.talentPoolCandidateIds;
   if (tpIds.length > 0) {
      const job = await Job.findById(jobId).select("title").lean();
      const jobTitle = job?.title ?? "Position";

      const bulkOps = tpIds.map((candidateId) => {
         const scoreEntry = result.shortlist.find(
            (s) => s.candidateId === candidateId,
         );
         return {
            updateOne: {
               filter: {
                  jobId: new Types.ObjectId(jobId),
                  applicantId: new Types.ObjectId(candidateId),
               },
               update: {
                  $setOnInsert: {
                     jobId: new Types.ObjectId(jobId),
                     applicantId: new Types.ObjectId(candidateId),
                     addedBy: new Types.ObjectId(userId),
                     addedAt: new Date(),
                     matchScore: scoreEntry?.matchScore ?? 0,
                     jobTitle,
                     reason:
                        "Strong candidate — added to talent pool for future opportunities",
                     status: "active" as const,
                     regretLetterSent: false,
                  },
               },
               upsert: true,
            },
         };
      });

      await TalentPool.bulkWrite(bulkOps);
   }

   sendSuccess(res, {
      finalSelection: result.finalSelection,
      talentPoolEntriesCreated: tpIds.length,
   });
}

// ──────────────────────────────────────────────
// POST /jobs/:jobId/screening/send-invitations
// Body: { interviewDetails?, customSubject?, customBody? }
// ──────────────────────────────────────────────
export async function sendInterviewInvitations(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const userId = req.user!.userId;
   const { interviewDetails, customSubject, customBody } = req.body as {
      interviewDetails?: string;
      customSubject?: string;
      customBody?: string;
   };

   const result = await ScreeningResult.findOne({ jobId });
   if (!result?.finalSelection?.selectedCandidateIds?.length) {
      return next(
         new AppError(
            "No finalized selection found. Please finalize candidates first.",
            400,
         ),
      );
   }

   // Load email settings with the encrypted password
   const emailSettings = await EmailSettings.findOne({ userId }).select(
      "+smtpPassEncrypted",
   );
   if (!emailSettings) {
      return next(
         new AppError(
            "Email settings not configured. Please configure SMTP in Settings → Email.",
            400,
         ),
      );
   }

   const [applicants, job, recruiter] = await Promise.all([
      Applicant.find({
         _id: { $in: result.finalSelection.selectedCandidateIds },
         jobId,
      })
         .select("profile.firstName profile.lastName profile.email")
         .lean(),
      Job.findById(jobId).select("title").lean(),
      User.findById(userId).select("name").lean(),
   ]);

   const recipients = applicants.map((a) => ({
      email: a.profile.email,
      firstName: a.profile.firstName,
      lastName: a.profile.lastName,
   }));

   const jobTitle = job?.title ?? "Position";
   const recruiterName = recruiter?.name ?? "Recruitment Team";

   const { sent, failed, errors } = await sendBulkEmails(
      emailSettings,
      recipients,
      customSubject ?? emailSettings.interviewSubject,
      customBody ?? emailSettings.interviewBody,
      { jobTitle, recruiterName, interviewDetails: interviewDetails ?? "" },
   );

   result.emailLog = {
      ...(result.emailLog ?? {
         interviewInvitationsSent: false,
         regretLettersSent: false,
      }),
      interviewInvitationsSent: true,
      interviewInvitationsSentAt: new Date(),
      interviewInvitationCount: sent,
   };
   await result.save();

   sendSuccess(res, {
      sent,
      failed,
      errors,
      message:
         failed > 0
            ? `${sent} invitation(s) sent. ${failed} failed.`
            : `${sent} invitation(s) sent successfully.`,
   });
}

// ──────────────────────────────────────────────
// POST /jobs/:jobId/screening/send-regret-letters
// Body: { targetGroup: "rejected"|"talent_pool"|"all", customSubject?, customBody? }
// ──────────────────────────────────────────────
export async function sendRegretLetters(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const userId = req.user!.userId;
   const {
      targetGroup = "all",
      customSubject,
      customBody,
   } = req.body as {
      targetGroup?: "rejected" | "talent_pool" | "all";
      customSubject?: string;
      customBody?: string;
   };

   const result = await ScreeningResult.findOne({ jobId });
   if (!result?.finalSelection) {
      return next(
         new AppError(
            "No finalized selection found. Please finalize candidates first.",
            400,
         ),
      );
   }

   const emailSettings = await EmailSettings.findOne({ userId }).select(
      "+smtpPassEncrypted",
   );
   if (!emailSettings) {
      return next(
         new AppError(
            "Email settings not configured. Please configure SMTP in Settings → Email.",
            400,
         ),
      );
   }

   // Determine which candidate IDs to email based on targetGroup
   const tpSet = new Set(result.finalSelection.talentPoolCandidateIds);
   let targetIds: string[];

   if (targetGroup === "talent_pool") {
      targetIds = result.finalSelection.talentPoolCandidateIds;
   } else if (targetGroup === "rejected") {
      // Rejected but NOT in the talent pool
      targetIds = result.finalSelection.rejectedCandidateIds.filter(
         (id) => !tpSet.has(id),
      );
   } else {
      // All rejected candidates (includes talent pool)
      targetIds = result.finalSelection.rejectedCandidateIds;
   }

   if (!targetIds.length) {
      return next(
         new AppError("No recipients found for the selected group", 400),
      );
   }

   const [applicants, job, recruiter] = await Promise.all([
      Applicant.find({ _id: { $in: targetIds }, jobId })
         .select("profile.firstName profile.lastName profile.email")
         .lean(),
      Job.findById(jobId).select("title").lean(),
      User.findById(userId).select("name").lean(),
   ]);

   const recipients = applicants.map((a) => ({
      email: a.profile.email,
      firstName: a.profile.firstName,
      lastName: a.profile.lastName,
   }));

   const jobTitle = job?.title ?? "Position";
   const recruiterName = recruiter?.name ?? "Recruitment Team";

   const { sent, failed, errors } = await sendBulkEmails(
      emailSettings,
      recipients,
      customSubject ?? emailSettings.regretSubject,
      customBody ?? emailSettings.regretBody,
      { jobTitle, recruiterName },
   );

   // Mark regret letters sent on relevant TalentPool entries
   const tpTargets = targetIds.filter((id) => tpSet.has(id));
   if (tpTargets.length > 0) {
      await TalentPool.updateMany(
         { jobId, applicantId: { $in: tpTargets } },
         {
            $set: {
               regretLetterSent: true,
               regretLetterSentAt: new Date(),
            },
         },
      );
   }

   result.emailLog = {
      ...(result.emailLog ?? {
         interviewInvitationsSent: false,
         regretLettersSent: false,
      }),
      regretLettersSent: true,
      regretLettersSentAt: new Date(),
      regretLetterCount: sent,
   };
   await result.save();

   sendSuccess(res, {
      sent,
      failed,
      errors,
      message:
         failed > 0
            ? `${sent} regret letter(s) sent. ${failed} failed.`
            : `${sent} regret letter(s) sent successfully.`,
   });
}

// ──────────────────────────────────────────────
// PUT /jobs/:jobId/screening/interview-rounds
// Body: { rounds: IInterviewRound[] }
// ──────────────────────────────────────────────
export async function saveInterviewRounds(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { jobId } = req.params;
   const { rounds } = req.body as {
      rounds: Array<{
         roundNumber: number;
         title: string;
         type: string;
         scheduledDate?: string;
         location?: string;
         notes?: string;
         interviewers?: string[];
      }>;
   };

   if (!Array.isArray(rounds)) {
      return next(new AppError("rounds must be an array", 422));
   }

   const result = await ScreeningResult.findOne({ jobId });
   if (!result?.finalSelection) {
      return next(
         new AppError("No finalized selection found for this job", 404),
      );
   }

   result.finalSelection.interviewRounds = rounds.map((r, i) => ({
      roundNumber: r.roundNumber ?? i + 1,
      title: r.title,
      type: r.type as
         | "phone"
         | "technical"
         | "cultural"
         | "panel"
         | "final"
         | "other",
      scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : undefined,
      location: r.location,
      notes: r.notes,
      interviewers: r.interviewers ?? [],
   }));

   await result.save();
   sendSuccess(res, result.finalSelection, "Interview rounds saved");
}
