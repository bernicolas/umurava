import type {
   Request as Req,
   Response as Res,
   NextFunction as Next,
} from "express";
import { TalentPool, Applicant } from "../models";
import { sendSuccess, sendPaginated, AppError } from "../utils";

// GET /talent-pool
export async function getTalentPool(
   req: Req,
   res: Res,
   _next: Next,
): Promise<void> {
   const userId = req.user!.userId;
   const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
   const limit = Math.min(
      50,
      Math.max(1, parseInt((req.query.limit as string) ?? "20", 10)),
   );
   const skip = (page - 1) * limit;
   const jobId = req.query.jobId as string | undefined;
   const status = req.query.status as string | undefined;

   const filter: Record<string, unknown> = { addedBy: userId };
   if (jobId) filter.jobId = jobId;
   if (
      status &&
      ["active", "contacted", "hired", "archived"].includes(status)
   ) {
      filter.status = status;
   }

   const [entries, total] = await Promise.all([
      TalentPool.find(filter)
         .sort({ addedAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean(),
      TalentPool.countDocuments(filter),
   ]);

   // Enrich with applicant profile data
   const applicantIds = entries.map((e) => e.applicantId);
   const applicants = await Applicant.find({ _id: { $in: applicantIds } })
      .select(
         "profile.firstName profile.lastName profile.email profile.headline profile.skills profile.location profile.availability profile.socialLinks",
      )
      .lean();

   const applicantMap = new Map(applicants.map((a) => [a._id.toString(), a]));

   const enriched = entries.map((entry) => ({
      ...entry,
      applicant: applicantMap.get(entry.applicantId.toString()) ?? null,
   }));

   sendPaginated(res, enriched, total, page, limit);
}

// PATCH /talent-pool/:id
export async function updateTalentPoolEntry(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { id } = req.params;
   const userId = req.user!.userId;
   const { notes, status } = req.body as {
      notes?: string;
      status?: string;
   };

   const entry = await TalentPool.findOne({ _id: id, addedBy: userId });
   if (!entry) {
      return next(new AppError("Talent pool entry not found", 404));
   }

   if (notes !== undefined) entry.notes = notes;
   if (
      status &&
      ["active", "contacted", "hired", "archived"].includes(status)
   ) {
      entry.status = status as "active" | "contacted" | "hired" | "archived";
   }

   await entry.save();
   sendSuccess(res, entry);
}

// DELETE /talent-pool/:id
export async function removeTalentPoolEntry(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const { id } = req.params;
   const userId = req.user!.userId;

   const deleted = await TalentPool.findOneAndDelete({
      _id: id,
      addedBy: userId,
   });
   if (!deleted) {
      return next(new AppError("Talent pool entry not found", 404));
   }

   sendSuccess(res, { message: "Removed from talent pool" });
}
