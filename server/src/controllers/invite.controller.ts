import type {
   Request  as ExpressRequest,
   Response as ExpressResponse,
   NextFunction as ExpressNextFunction,
} from "express";
import crypto from "crypto";
import { InviteToken } from "../models/InviteToken";
import { User } from "../models/User";
import { sendSuccess, AppError } from "../utils";
import { sendInviteEmail } from "../services/inviteEmail";

const INVITE_EXPIRES_HOURS = 48;

// ─── POST /api/v1/admin/invite ────────────────────────────────────────────────
// Admin sends an invite to an email address.
// Returns the invite link (so admin can also copy it manually).

export async function createInvite(
   req:  ExpressRequest,
   res:  ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const { email } = req.body as { email?: string };

   if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(new AppError("Valid email address is required", 400));
   }

   const normalised = email.toLowerCase().trim();

   // Don't invite someone who is already registered
   const existing = await User.findOne({ email: normalised });
   if (existing) {
      return next(new AppError("A user with this email already exists", 409));
   }

   // Invalidate any previous unused invite for this email so there's only one active
   await InviteToken.deleteMany({ email: normalised, usedAt: { $exists: false } });

   const token     = crypto.randomBytes(32).toString("hex");
   const expiresAt = new Date(Date.now() + INVITE_EXPIRES_HOURS * 60 * 60 * 1000);

   await InviteToken.create({
      email:     normalised,
      token,
      createdBy: (req as any).user.userId,
      expiresAt,
   });

   const clientUrl  = process.env["CLIENT_URL"] ?? "http://localhost:3000";
   const inviteLink = `${clientUrl}/register?code=${token}&email=${encodeURIComponent(normalised)}`;

   // Send email — if it fails we still return the link so the admin can copy it
   let emailSent = false;
   try {
      await sendInviteEmail(normalised, inviteLink, (req as any).user.name,(req as any).user.userId);
      emailSent = true;
   } catch (err) {
      console.error("[INVITE] Email send failed:", (err as Error).message);
   }

   sendSuccess(res, { inviteLink, emailSent, expiresAt }, "Invite created");
}

// ─── GET /api/v1/auth/verify-invite ──────────────────────────────────────────
// Called by the register page on load to validate the token.

export async function verifyInvite(
   req:  ExpressRequest,
   res:  ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const { code, email } = req.query as { code?: string; email?: string };

   if (!code || !email) {
      return next(new AppError("Missing code or email", 400));
   }

   const invite = await InviteToken.findOne({
      token: code,
      email: email.toLowerCase().trim(),
   });

   if (!invite) {
      return next(new AppError("Invalid invite link", 404));
   }
   if (invite.usedAt) {
      return next(new AppError("This invite has already been used", 410));
   }
   if (invite.expiresAt < new Date()) {
      return next(new AppError("This invite link has expired", 410));
   }

   sendSuccess(res, { email: invite.email, valid: true }, "Invite is valid");
}

// ─── POST /api/v1/auth/mark-invite-used ──────────────────────────────────────
// Called after successful registration to consume the token.

export async function markInviteUsed(
   req:  ExpressRequest,
   res:  ExpressResponse,
   next: ExpressNextFunction,
): Promise<void> {
   const { code, email } = req.body as { code?: string; email?: string };

   if (!code || !email) {
      return next(new AppError("Missing code or email", 400));
   }

   const invite = await InviteToken.findOne({
      token: code,
      email: email.toLowerCase().trim(),
   });

   if (!invite) {
      return next(new AppError("Invite not found", 404));
   }

   invite.usedAt = new Date();
   await invite.save();

   sendSuccess(res, null, "Invite marked as used");
}