import type {
   Request as Req,
   Response as Res,
   NextFunction as Next,
} from "express";
import {
   EmailSettings,
   User,
   DEFAULT_INTERVIEW_SUBJECT,
   DEFAULT_INTERVIEW_BODY,
   DEFAULT_REGRET_SUBJECT,
   DEFAULT_REGRET_BODY,
} from "../models";
import { sendSuccess, AppError, encrypt } from "../utils";
import { sendTestEmail } from "../services/email.service";

/** Strip the encrypted password; replace with a boolean flag */
function sanitizeSettings(settings: InstanceType<typeof EmailSettings>) {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const obj: Record<string, unknown> = settings.toObject<any>();
   delete obj.smtpPassEncrypted;
   obj.smtpPassSet = true;
   return obj;
}

// GET /email-settings
export async function getEmailSettings(req: Req, res: Res): Promise<void> {
   const userId = req.user!.userId;
   const settings = await EmailSettings.findOne({ userId });
   sendSuccess(res, settings ? sanitizeSettings(settings) : null);
}

// PUT /email-settings
export async function updateEmailSettings(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const userId = req.user!.userId;
   const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      replyTo,
      interviewSubject,
      interviewBody,
      regretSubject,
      regretBody,
   } = req.body as {
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUser?: string;
      smtpPass?: string;
      fromEmail?: string;
      fromName?: string;
      replyTo?: string;
      interviewSubject?: string;
      interviewBody?: string;
      regretSubject?: string;
      regretBody?: string;
   };

   const existing = await EmailSettings.findOne({ userId });

   // Require core SMTP fields for initial setup
   if (!existing) {
      const missing = (
         [
            ["smtpHost", smtpHost],
            ["smtpUser", smtpUser],
            ["smtpPass", smtpPass],
            ["fromEmail", fromEmail],
            ["fromName", fromName],
         ] as [string, unknown][]
      )
         .filter(([, v]) => !v)
         .map(([k]) => k);

      if (missing.length > 0) {
         return next(
            new AppError(`Missing required fields: ${missing.join(", ")}`, 422),
         );
      }
   }

   // Validate fromEmail format
   if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      return next(new AppError("Invalid fromEmail address", 422));
   }
   if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
      return next(new AppError("Invalid replyTo address", 422));
   }

   const update: Record<string, unknown> = {};
   if (smtpHost !== undefined) update.smtpHost = smtpHost.trim();
   if (smtpPort !== undefined)
      update.smtpPort = Math.min(65535, Math.max(1, Number(smtpPort)));
   if (smtpSecure !== undefined) update.smtpSecure = Boolean(smtpSecure);
   if (smtpUser !== undefined) update.smtpUser = smtpUser.trim();
   // Only encrypt & store password if a new non-empty value is provided
   if (smtpPass && smtpPass.trim().length > 0) {
      update.smtpPassEncrypted = encrypt(smtpPass);
   }
   if (fromEmail !== undefined) update.fromEmail = fromEmail;
   if (fromName !== undefined) update.fromName = fromName;
   if (replyTo !== undefined) update.replyTo = replyTo;
   if (interviewSubject !== undefined)
      update.interviewSubject = interviewSubject;
   if (interviewBody !== undefined) update.interviewBody = interviewBody;
   if (regretSubject !== undefined) update.regretSubject = regretSubject;
   if (regretBody !== undefined) update.regretBody = regretBody;

   const settings = await EmailSettings.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
   );

   sendSuccess(res, sanitizeSettings(settings!));
}

// POST /email-settings/test
export async function testEmailSettings(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const userId = req.user!.userId;

   const settings = await EmailSettings.findOne({ userId }).select(
      "+smtpPassEncrypted",
   );
   if (!settings) {
      return next(new AppError("Email settings not configured", 400));
   }

   const user = await User.findById(userId).select("email").lean();
   if (!user) return next(new AppError("User not found", 404));

   const { to } = req.body as { to?: string };
   if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return next(
         new AppError("A valid recipient email address is required", 400),
      );
   }

   try {
      await sendTestEmail(settings, to);
      sendSuccess(res, {
         message: `Test email sent successfully to ${to}`,
      });
   } catch (err) {
      return next(
         new AppError(`SMTP test failed: ${(err as Error).message}`, 400),
      );
   }
}

// GET /email-settings/defaults
export async function getDefaultTemplates(_req: Req, res: Res): Promise<void> {
   sendSuccess(res, {
      interview: {
         subject: DEFAULT_INTERVIEW_SUBJECT,
         body: DEFAULT_INTERVIEW_BODY,
      },
      regret: {
         subject: DEFAULT_REGRET_SUBJECT,
         body: DEFAULT_REGRET_BODY,
      },
   });
}
