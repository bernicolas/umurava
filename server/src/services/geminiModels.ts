import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Single source of truth for all Gemini models.
 * maxCandidates reflects how many applicants can fit in one prompt
 * without exceeding the model's free-tier input token limit per minute.
 *
 * gemini-2.5-flash : 250k tokens/min → ~30 candidates (~67k tokens/prompt)
 * gemini-2.0-flash : 32k tokens/min  → ~10 candidates (~22k tokens/prompt)
 * gemini-2.0-flash-lite: 32k tokens/min → ~10 candidates
 */
export const MODELS = [
   { name: "gemini-2.5-flash",      maxOutputTokens: 32768, maxCandidates: 25 },
   { name: "gemini-2.0-flash",      maxOutputTokens: 8192,  maxCandidates: 10 },
   { name: "gemini-2.0-flash-lite", maxOutputTokens: 8192,  maxCandidates: 10 },
] as const;

export type ModelDef = typeof MODELS[number];

/**
 * Sends a tiny probe prompt to each model in order and returns the
 * maxCandidates of the first one that responds successfully.
 * Used by paginatedScreening to decide the page size before chunking.
 */
export async function detectPageSize(): Promise<number> {
   const testPrompt = "Reply with one word: ready";

   for (const modelDef of MODELS) {
      try {
         const model = genAI.getGenerativeModel({ model: modelDef.name });
         await model.generateContent(testPrompt);
         console.log(
            `[GEMINI] Probe OK: ${modelDef.name} → page size ${modelDef.maxCandidates}`,
         );
         return modelDef.maxCandidates;
      } catch (err) {
         const msg = err instanceof Error ? err.message : String(err);
         console.log(`[GEMINI] Probe failed: ${modelDef.name} — ${msg.substring(0, 80)}`);
         continue;
      }
   }

   console.warn("[GEMINI] All probes failed — defaulting to page size 10");
   return 10;
}