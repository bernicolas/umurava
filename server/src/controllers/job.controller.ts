import type { Request, Response, NextFunction } from "express";
import { body, param, query } from "express-validator";
import { Job, Applicant, ScreeningHistory } from "../models";
import { sendSuccess, sendPaginated, AppError } from "../utils";
import { notifier } from "../services/notificationBroadcaster";

export const jobValidation = [
   body("title").trim().notEmpty().withMessage("Title is required"),
   body("description").trim().notEmpty().withMessage("Description is required"),
   body("requirements")
      .trim()
      .notEmpty()
      .withMessage("Requirements are required"),
   body("requiredSkills")
      .isArray({ min: 1 })
      .withMessage("At least one required skill"),
   body("requiredExperience")
      .isInt({ min: 0 })
      .withMessage("Required experience must be >= 0"),
   body("location").trim().notEmpty(),
   body("type").isIn(["Full-time", "Part-time", "Contract", "Internship"]),
   body("shortlistSize").optional().isIn([5, 10, 15, 20, 30, 50]),
];

export async function createJob(req: Request, res: Response): Promise<void> {
   const job = await Job.create({ ...req.body, createdBy: req.user!.userId });
   notifier.broadcast({
      id: `job-created-${job._id}-${Date.now()}`,
      type: "job_created",
      title: "New job posted",
      body: job.title as string,
      jobId: String(job._id),
      at: new Date().toISOString(),
   });
   sendSuccess(res, job, "Job created", 201);
}

export async function getJobs(req: Request, res: Response): Promise<void> {
   const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
   const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10)),
   );
   const status = req.query["status"] as string | undefined;

   const filter: Record<string, unknown> = {};
   if (status) filter["status"] = status;

   const [total, jobs] = await Promise.all([
      Job.countDocuments(filter),
      Job.aggregate([
         { $match: filter },
         { $sort: { createdAt: -1 } },
         { $skip: (page - 1) * limit },
         { $limit: limit },
         {
            $lookup: {
               from: "applicants",
               let: { jobId: "$_id" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$jobId", "$$jobId"] } } },
                  { $count: "n" },
               ],
               as: "_applicantData",
            },
         },
         {
            $addFields: {
               applicantCount: {
                  $ifNull: [{ $arrayElemAt: ["$_applicantData.n", 0] }, 0],
               },
            },
         },
         { $project: { _applicantData: 0 } },
      ]),
   ]);

   sendPaginated(res, jobs, total, page, limit);
}

export async function getJob(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const job = await Job.findById(req.params["id"]);
   if (!job) return next(new AppError("Job not found", 404));
   sendSuccess(res, job);
}

export async function updateJob(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const job = await Job.findOneAndUpdate({ _id: req.params["id"] }, req.body, {
      new: true,
      runValidators: true,
   });
   if (!job) return next(new AppError("Job not found", 404));
   sendSuccess(res, job, "Job updated");
}

export async function closeJob(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const job = await Job.findOne({
      _id: req.params["id"],
   });
   if (!job) return next(new AppError("Job not found", 404));
   if (job.screeningStatus === "running") {
      return next(
         new AppError("Cannot close a job while screening is in progress", 409),
      );
   }
   job.status = "closed";
   await job.save();
   notifier.broadcast({
      id: `job-closed-${job._id}-${Date.now()}`,
      type: "job_closed",
      title: "Job closed",
      body: job.title,
      jobId: String(job._id),
      at: new Date().toISOString(),
   });
   sendSuccess(res, job, "Job closed");
}

export async function publishJob(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const job = await Job.findById(req.params["id"]);
   if (!job) return next(new AppError("Job not found", 404));
   if (job.status === "open") {
      sendSuccess(res, job, "Job is already open");
      return;
   }
   job.status = "open";
   await job.save();
   notifier.broadcast({
      id: `job-published-${job._id}-${Date.now()}`,
      type: "job_created",
      title: "Job published",
      body: job.title,
      jobId: String(job._id),
      at: new Date().toISOString(),
   });
   sendSuccess(res, job, "Job published");
}

export async function deleteJob(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   console.log(req.params);
   const job = await Job.findOneAndDelete({
      _id: req.params["id"],
   });
   if (!job) return next(new AppError("Job not found", 404));
   sendSuccess(res, null, "Job deleted");
}

const MONTH_NAMES = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
];

export async function getDashboardStats(
   req: Request,
   res: Response,
): Promise<void> {
   // Count across ALL jobs — consistent with getJobs which has no createdBy filter
   const sixMonthsAgo = new Date();
   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
   sixMonthsAgo.setDate(1);
   sixMonthsAgo.setHours(0, 0, 0, 0);

   const [totalApplicants, screeningRuns, applicantsByMonth] =
      await Promise.all([
         Applicant.countDocuments({}),
         ScreeningHistory.find({}).sort({ screenedAt: -1 }),
         Applicant.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
               $group: {
                  _id: {
                     year: { $year: "$createdAt" },
                     month: { $month: "$createdAt" },
                  },
                  count: { $sum: 1 },
               },
            },
         ]),
      ]);

   const totalRuns = screeningRuns.length;
   const avgMatchScore =
      totalRuns > 0
         ? Math.round(
              screeningRuns.reduce((s, r) => s + (r.avgScore ?? 0), 0) /
                 totalRuns,
           )
         : 0;

   const now = new Date();
   const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
         key: `${d.getFullYear()}-${d.getMonth() + 1}`,
         label: MONTH_NAMES[d.getMonth()],
      };
   });

   const runsByMonth: Record<string, number> = {};
   for (const r of screeningRuns) {
      const d = new Date(r.screenedAt);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      runsByMonth[k] = (runsByMonth[k] ?? 0) + 1;
   }

   const appMap: Record<string, number> = {};
   for (const d of applicantsByMonth as {
      _id: { year: number; month: number };
      count: number;
   }[]) {
      appMap[`${d._id.year}-${d._id.month}`] = d.count;
   }

   const trend = months.map(({ key, label }) => ({
      month: label,
      applications: appMap[key] ?? 0,
      screened: runsByMonth[key] ?? 0,
   }));

   sendSuccess(res, { totalApplicants, totalRuns, avgMatchScore, trend });
}
