import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { AppError } from "../utils";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const SYSTEM_INSTRUCTION = `You are Umurava HR Assistant, an expert AI for HR professionals using the Umurava HR platform.

You help with:
- HR concepts: recruitment, candidate screening, interviewing, onboarding, performance management, compensation, labor law basics, HR metrics (TTH, TTFH, offer acceptance rate, etc.)
- Using the Umurava HR platform — navigation guide:
  • /dashboard → Overview of key hiring metrics and recent activity
  • /jobs → Browse and manage job postings; create, edit, open, or close roles
  • /jobs/[id]/applicants → View and manage applicants for a specific job
  • /jobs/[id]/screening → Run or view AI-powered applicant screening and shortlists
  • /applicants → View all applicants across all jobs
  • /shortlists → All AI-shortlisted candidates across every job
  • /settings → Account and profile settings
- Interpreting AI screening scores, criteria breakdowns, strengths, and gaps
- Writing job descriptions, interview questions, and evaluation rubrics
- Recruitment strategy, employer branding, and DEI best practices

Guidelines:
- Be concise and practical. HR managers are busy — get to the point.
- Use markdown formatting (bold, bullet lists, numbered lists, code blocks) when it improves clarity.
- For platform navigation questions, give exact paths and explain what each section does.
- If asked something outside HR or the platform, politely redirect.
- Never fabricate specific legal advice; recommend consulting a qualified HR attorney.`;

const CHAT_MODELS = [
   "gemini-2.5-flash",
   "gemini-2.0-flash",
   "gemini-2.0-flash-lite",
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isSkippableError(msg: string): boolean {
   return (
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("overload") ||
      msg.includes("unavailable") ||
      msg.includes("not found") ||
      msg.includes("404") ||
      msg.includes("deprecated") ||
      msg.includes("not supported")
   );
}

export async function chatWithAI(
   history: { role: "user" | "model"; content: string }[],
   newMessage: string,
): Promise<string> {
   let lastError: Error | undefined;

   for (const modelName of CHAT_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
         try {
            const model = genAI.getGenerativeModel({
               model: modelName,
               systemInstruction: SYSTEM_INSTRUCTION,
            });

            const chat = model.startChat({
               history: history.map((m) => ({
                  role: m.role,
                  parts: [{ text: m.content }],
               })),
               generationConfig: {
                  temperature: 0.7,
                  topP: 0.9,
                  maxOutputTokens: 2048,
               },
            });

            const result = await chat.sendMessage(newMessage);
            const text = result.response.text().trim();
            if (text) return text;
         } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            const msg = lastError.message.toLowerCase();

            if (isSkippableError(msg)) break; // try next model

            if (attempt < 1) {
               await sleep(1200);
               continue;
            }
         }
      }
   }

   const errMsg = lastError?.message ?? "";
   const isRateLimit =
      errMsg.toLowerCase().includes("quota") ||
      errMsg.includes("429") ||
      errMsg.toLowerCase().includes("rate limit");

   throw new AppError(
      isRateLimit
         ? "The assistant is temporarily busy due to high demand. Please wait a moment and try again."
         : `Chat failed: ${errMsg || "Unknown error"}`,
      isRateLimit ? 429 : 502,
   );
}
