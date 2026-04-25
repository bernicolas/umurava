import type { Request, Response } from "express";
import { User } from "../models";
import { sendSuccess } from "../utils";

export async function listUsers(req: Request, res: Response): Promise<void> {
   const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
   const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)),
   );
   const skip = (page - 1) * limit;

   const [users, total] = await Promise.all([
      User.find({})
         .select("name email role avatar createdAt")
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean(),
      User.countDocuments(),
   ]);

   sendSuccess(res, {
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
   });
}

export async function updateUserRole(
   req: Request,
   res: Response,
): Promise<void> {
   const { id } = req.params;
   const { role } = req.body as { role: string };

   const validRoles = ["recruiter", "admin"];
   if (!validRoles.includes(role)) {
      res.status(400).json({
         success: false,
         message: "Invalid role. Must be recruiter or admin.",
      });
      return;
   }

   const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: "name email role createdAt" },
   );

   if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
   }

   sendSuccess(res, user, "User role updated");
}
