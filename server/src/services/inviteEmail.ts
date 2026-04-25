import nodemailer from "nodemailer";
import { EmailSettings } from "../models/EmailSettings";
import { decrypt } from "../utils/encryption";

/**
 * Sends an invite email to the given address.
 * Uses the stored SMTP settings if available, otherwise falls back to
 * a simple console log (useful during development when SMTP is not set up).
 */
export async function sendInviteEmail(
   toEmail:       string,
   inviteLink:    string,
   adminName:     string,
    userId: string,
): Promise<void> {
   const settings = await EmailSettings
      .findOne({ userId })
      .select("+smtpPassEncrypted");
   console.log(settings)
   

   if (!settings) {
      // No SMTP configured — log the link so the admin can copy it
      console.log(`[INVITE] No SMTP configured. Invite link for ${toEmail}:\n${inviteLink}`);
      return;
   }

   const pass        = decrypt(settings.smtpPassEncrypted);
   const transporter = nodemailer.createTransport({
      host:              settings.smtpHost.trim(),
      port:              settings.smtpPort,
      secure:            settings.smtpSecure,
      auth:              { user: settings.smtpUser.trim(), pass },
      connectionTimeout: 10_000,
      greetingTimeout:   8_000,
      socketTimeout:     15_000,
   });

   await transporter.sendMail({
      from:    `"${settings.fromName}" <${settings.fromEmail}>`,
      replyTo: settings.replyTo ?? settings.fromEmail,
      to:      toEmail,
      subject: `You've been invited to join Umurava HR`,
      html: `
         <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <div style="border-left: 4px solid #4F46E5; padding-left: 16px; margin-bottom: 28px;">
               <h2 style="color: #1c10f5; margin: 0; font-size: 22px;">You've been invited</h2>
               <p style="color: #6B7280; margin: 4px 0 0; font-size: 14px;">Umurava HR Platform</p>
            </div>

            <p style="color: #111827; font-size: 15px; line-height: 1.6;">
               You were invited to join <strong>Umurava HR</strong> as a recruiter.
            </p>

            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
               Click the button below to create your account. This link is valid for <strong>48 hours</strong>
               and can only be used once.
            </p>

            <div style="text-align: center; margin: 32px 0;">
               <a href="${inviteLink}"
                  style="background: #2015f1; color: #fff; text-decoration: none;
                         padding: 12px 28px; border-radius: 6px; font-size: 15px;
                         font-weight: 600; display: inline-block;">
                  Accept Invitation
               </a>
            </div>

            <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
               If the button doesn't work, copy and paste this link into your browser:<br/>
               <a href="${inviteLink}" style="color: #170ceb; word-break: break-all;">${inviteLink}</a>
            </p>

            <p style="color: #9CA3AF; font-size: 12px;">
               If you weren't expecting this invitation, you can safely ignore this email.
            </p>
         </div>
      `,
   });
}