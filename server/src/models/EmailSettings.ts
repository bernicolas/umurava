import { Schema, model, Document, Types } from "mongoose";

export const DEFAULT_INTERVIEW_SUBJECT = "Interview Invitation – {{jobTitle}}";

export const DEFAULT_INTERVIEW_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 24px;">
  <div style="border-bottom: 3px solid #4F46E5; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #4F46E5; margin: 0; font-size: 22px;">Interview Invitation</h2>
    <p style="color: #6B7280; margin: 6px 0 0; font-size: 14px;">{{jobTitle}}</p>
  </div>

  <p style="font-size: 15px;">Dear <strong>{{firstName}} {{lastName}}</strong>,</p>

  <p style="font-size: 15px; line-height: 1.6;">
    We are delighted to inform you that, after a thorough review of your application for the
    position of <strong>{{jobTitle}}</strong>, we would like to invite you for an interview.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    Our recruitment team will reach out to you shortly to confirm the interview schedule,
    format, and any additional preparation details.
  </p>

  {{interviewDetails}}

  <p style="font-size: 15px; line-height: 1.6;">
    We look forward to speaking with you and learning more about your experience and aspirations.
  </p>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
    <p style="margin: 0; font-size: 15px;">Best regards,</p>
    <p style="margin: 4px 0 0; font-size: 15px;"><strong>{{recruiterName}}</strong></p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #6B7280;">Recruitment Team</p>
  </div>
</div>`;

export const DEFAULT_REGRET_SUBJECT = "Your Application Update – {{jobTitle}}";

export const DEFAULT_REGRET_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 24px;">
  <div style="border-bottom: 3px solid #6B7280; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #374151; margin: 0; font-size: 22px;">Application Update</h2>
    <p style="color: #6B7280; margin: 6px 0 0; font-size: 14px;">{{jobTitle}}</p>
  </div>

  <p style="font-size: 15px;">Dear <strong>{{firstName}} {{lastName}}</strong>,</p>

  <p style="font-size: 15px; line-height: 1.6;">
    Thank you sincerely for your interest in the <strong>{{jobTitle}}</strong> position and
    for the time and effort you invested in your application. We truly appreciate your enthusiasm.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    After careful consideration of all applications, we regret to inform you that we will not
    be moving forward with your application for this particular role at this time. This was a
    difficult decision — the competition was strong and we received many impressive applications.
  </p>

  <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h4 style="margin: 0 0 8px; color: #15803D; font-size: 14px;">✓ Added to Our Talent Pool</h4>
    <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
      We were genuinely impressed by your profile and have added you to our talent pool.
      We will reach out proactively when a suitable opportunity arises in the future.
    </p>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    We wish you every success in your career journey and encourage you to apply for future openings
    that match your experience and aspirations.
  </p>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
    <p style="margin: 0; font-size: 15px;">Kind regards,</p>
    <p style="margin: 4px 0 0; font-size: 15px;"><strong>{{recruiterName}}</strong></p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #6B7280;">Recruitment Team</p>
  </div>
</div>`;

export interface IEmailSettings extends Document {
   userId: Types.ObjectId;
   smtpHost: string;
   smtpPort: number;
   smtpSecure: boolean;
   smtpUser: string;
   /** AES-256-GCM encrypted password — never returned in API responses */
   smtpPassEncrypted: string;
   fromEmail: string;
   fromName: string;
   replyTo?: string;
   interviewSubject: string;
   interviewBody: string;
   regretSubject: string;
   regretBody: string;
}

const emailSettingsSchema = new Schema<IEmailSettings>(
   {
      userId: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
         unique: true,
      },
      smtpHost: { type: String, required: true },
      smtpPort: { type: Number, required: true, default: 587 },
      smtpSecure: { type: Boolean, default: false },
      smtpUser: { type: String, required: true },
      /** select:false so the encrypted pass is never accidentally leaked */
      smtpPassEncrypted: { type: String, required: true, select: false },
      fromEmail: { type: String, required: true },
      fromName: { type: String, required: true },
      replyTo: String,
      interviewSubject: {
         type: String,
         default: DEFAULT_INTERVIEW_SUBJECT,
      },
      interviewBody: { type: String, default: DEFAULT_INTERVIEW_BODY },
      regretSubject: { type: String, default: DEFAULT_REGRET_SUBJECT },
      regretBody: { type: String, default: DEFAULT_REGRET_BODY },
   },
   { timestamps: true },
);

export const EmailSettings = model<IEmailSettings>(
   "EmailSettings",
   emailSettingsSchema,
);
