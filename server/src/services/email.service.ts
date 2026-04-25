import nodemailer from "nodemailer";
import type { IEmailSettings } from "../models/EmailSettings";
import { decrypt } from "../utils/encryption";

export interface EmailRecipient {
   email: string;
   firstName: string;
   lastName: string;
}

export interface EmailCommonVars {
   jobTitle: string;
   recruiterName: string;
   interviewDetails?: string;
   cc?: string[];
}

/**
 * Safe template rendering — replaces {{varName}} with known values only.
 * Uses a whitelist approach to prevent injection.
 */
function renderTemplate(
   template: string,
   variables: Record<string, string>,
): string {
   return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const val = variables[key];
      return val !== undefined ? val : "";
   });
}

function createTransporter(settings: IEmailSettings) {
   const pass = decrypt(settings.smtpPassEncrypted);
   return nodemailer.createTransport({
      host: settings.smtpHost.trim(),
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser.trim(), pass },
      // Timeout guards to prevent hanging in production
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
   });
}

export async function sendBulkEmails(
   settings: IEmailSettings,
   recipients: EmailRecipient[],
   subjectTemplate: string,
   bodyTemplate: string,
   commonVars: EmailCommonVars,
): Promise<{ sent: number; failed: number; errors: string[] }> {
   if (!recipients.length) {
      return { sent: 0, failed: 0, errors: [] };
   }

   const transporter = createTransporter(settings);
   let sent = 0;
   let failed = 0;
   const errors: string[] = [];

   for (const recipient of recipients) {
      // Validate email format before attempting to send
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
         failed++;
         errors.push(`${recipient.email}: invalid email address format`);
         continue;
      }

      const { cc: _cc, ...templateVars } = commonVars;
      const vars: Record<string, string> = {
         ...templateVars,
         firstName: recipient.firstName,
         lastName: recipient.lastName,
         interviewDetails: commonVars.interviewDetails ?? "",
      };

      const subject = renderTemplate(subjectTemplate, vars);
      const html = renderTemplate(bodyTemplate, vars);

      try {
         await transporter.sendMail({
            from: `"${settings.fromName}" <${settings.fromEmail}>`,
            replyTo: settings.replyTo ?? settings.fromEmail,
            to: `"${recipient.firstName} ${recipient.lastName}" <${recipient.email}>`,
            cc: commonVars.cc?.length ? commonVars.cc.join(", ") : undefined,
            subject,
            html,
         });
         sent++;
      } catch (err) {
         failed++;
         errors.push(`${recipient.email}: ${(err as Error).message}`);
      }
   }

   return { sent, failed, errors };
}

export async function sendTestEmail(
   settings: IEmailSettings,
   toEmail: string,
): Promise<void> {
   const transporter = createTransporter(settings);
   await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: toEmail,
      subject: "Test Email – Umurava HR Email Configuration",
      html: `
         <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <div style="border-left: 4px solid #4F46E5; padding-left: 16px; margin-bottom: 20px;">
               <h2 style="color: #4F46E5; margin: 0;">SMTP Configuration Test</h2>
               <p style="color: #6B7280; margin: 4px 0 0; font-size: 14px;">Umurava HR Platform</p>
            </div>
            <p style="color: #15803D; font-weight: 600;">✓ Your email settings are working correctly!</p>
            <table style="border-collapse: collapse; width: 100%; font-size: 14px; margin-top: 16px;">
               <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6B7280;">From Name</td>
                  <td style="padding: 6px 0; font-weight: 600;">${settings.fromName}</td>
               </tr>
               <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6B7280;">From Email</td>
                  <td style="padding: 6px 0; font-weight: 600;">${settings.fromEmail}</td>
               </tr>
               <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6B7280;">SMTP Host</td>
                  <td style="padding: 6px 0; font-weight: 600;">${settings.smtpHost}:${settings.smtpPort}</td>
               </tr>
               <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6B7280;">Encryption</td>
                  <td style="padding: 6px 0; font-weight: 600;">${settings.smtpSecure ? "SSL/TLS" : "STARTTLS"}</td>
               </tr>
            </table>
         </div>
      `,
   });
}
