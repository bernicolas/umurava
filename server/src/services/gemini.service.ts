import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";
import { config } from "../config";
import type { IJob } from "../models/Job";
import type { IApplicant } from "../models/Applicant";
import type { ShortlistedCandidate, ScreeningPrefs } from "../types";
import { AppError } from "../utils";
import { MODELS } from "./geminiModels";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// ─── JSON Schema ──────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
   type: SchemaType.ARRAY,
   items: {
      type: SchemaType.OBJECT,
      properties: {
         candidateId: { type: SchemaType.STRING },
         rank: { type: SchemaType.INTEGER },
         matchScore: { type: SchemaType.INTEGER },
         criteriaScores: {
            type: SchemaType.OBJECT,
            properties: {
               skills:       { type: SchemaType.INTEGER },
               experience:   { type: SchemaType.INTEGER },
               education:    { type: SchemaType.INTEGER },
               projects:     { type: SchemaType.INTEGER },
               availability: { type: SchemaType.INTEGER },
            },
            required: ["skills", "experience", "education", "projects", "availability"],
         },
         strengths:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
         gaps:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
         recommendation: { type: SchemaType.STRING },
      },
      required: ["candidateId", "rank", "matchScore", "criteriaScores", "strengths", "gaps", "recommendation"],
   },
};

const BASE_GENERATION_CONFIG = {
   temperature: 0.1,
   topP: 0.8,
   responseMimeType: "application/json",
   responseSchema: RESPONSE_SCHEMA as Schema,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSkippableError(msg: string): boolean {
   return (
      msg.includes("quota")        ||
      msg.includes("rate limit")   ||
      msg.includes("429")          ||
      msg.includes("503")          ||
      msg.includes("overload")     ||
      msg.includes("unavailable")  ||
      msg.includes("not found")    ||
      msg.includes("404")          ||
      msg.includes("deprecated")   ||
      msg.includes("not supported")
   );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Core generation with fallback ───────────────────────────────────────────
//
// Accepts a FACTORY function instead of a pre-built string.
// Each model calls buildPrompt(model.maxCandidates) so the prompt is always
// sized correctly for the model being tried — the fallback models get a
// smaller prompt (10 candidates) automatically.

async function generateWithFallback(
   buildPrompt: (maxCandidates: number) => string,
): Promise<{ text: string; modelUsed: string; candidatesInPrompt: number }> {
   let lastError: Error | undefined;

   for (const modelDef of MODELS) {
      const prompt = buildPrompt(modelDef.maxCandidates);

      for (let attempt = 0; attempt < 3; attempt++) {
         try {
            const model = genAI.getGenerativeModel({
               model: modelDef.name,
               generationConfig: {
                  ...BASE_GENERATION_CONFIG,
                  maxOutputTokens: modelDef.maxOutputTokens,
               },
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            if (text) {
               return {
                  text,
                  modelUsed:           modelDef.name,
                  candidatesInPrompt:  modelDef.maxCandidates,
               };
            }
         } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            const msg = lastError.message.toLowerCase();

            if (isSkippableError(msg)) break; // try next model

            if (attempt < 2) {
               await sleep(1000 * (attempt + 1));
               continue;
            }

            throw new AppError(`AI screening failed: ${lastError.message}`, 502);
         }
      }
   }

   throw new AppError(
      `AI screening failed: all models unavailable. Last error: ${lastError?.message ?? "Unknown"}`,
      502,
   );
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildScreeningPrompt(
   job:          IJob,
   applicants:   IApplicant[],
   shortlistSize: number,
   prefs?:       ScreeningPrefs,
): string {
   const w = prefs?.scoringWeights ?? {
      skills: 35, experience: 30, education: 15, projects: 15, availability: 5,
   };
   const minScore = prefs?.minScoreThreshold ?? 0;

   const formula = `matchScore = round(
  (skills_raw    × ${w.skills    / 100}) +
  (exp_raw       × ${w.experience / 100}) +
  (edu_raw       × ${w.education  / 100}) +
  (projects_raw  × ${w.projects   / 100}) +
  (avail_raw     × ${w.availability / 100})
)`;

   const customBlock = prefs?.customInstructions?.trim()
      ? `\n## ⚠ MANDATORY RECRUITER DIRECTIVES (highest priority — override all other considerations)\n${prefs.customInstructions.trim()}\n`
      : "";

   const availabilityBlock = prefs?.preferImmediateAvailability
      ? `\n## AVAILABILITY SIGNAL\nThe recruiter STRONGLY prefers immediately available candidates. When scoring availability:\n- "Available" or similar → avail_raw = 80–100\n- "Open to opportunities" or ambiguous → avail_raw = 40–60\n- "Not Available" → avail_raw = 0–20 (unless candidate is overwhelmingly superior on all other criteria)\n`
      : `\n## AVAILABILITY SIGNAL\nScore availability based on how well the candidate's stated availability fits the role's timing needs.\n`;

   const minScoreBlock = minScore > 0
      ? `\n## MINIMUM SCORE GATE\nDo NOT include any candidate whose computed matchScore is below ${minScore}. If fewer than ${shortlistSize} candidates meet this threshold, return only those who do.\n`
      : "";

   const jobContext = {
      title:                   job.title,
      description:             job.description,
      requirements:            job.requirements,
      requiredSkills:          job.requiredSkills,
      requiredExperienceYears: job.requiredExperience,
      location:                job.location,
      employmentType:          job.type,
   };

   const candidates = applicants.map((a) => ({
      id:             String(a._id),
      name:           `${a.profile.firstName} ${a.profile.lastName}`,
      headline:       a.profile.headline  ?? null,
      bio:            a.profile.bio       ?? null,
      location:       a.profile.location  ?? null,
      skills:         a.profile.skills    ?? [],
      languages:      a.profile.languages ?? [],
      experience:     (a.profile.experience ?? []).map((e) => ({
         role: e.role, company: e.company, startDate: e.startDate,
         endDate: e.endDate, isCurrent: e.isCurrent,
         technologies: e.technologies ?? [], description: e.description ?? null,
      })),
      education:      (a.profile.education ?? []).map((e) => ({
         degree: e.degree, fieldOfStudy: e.fieldOfStudy,
         institution: e.institution,
         startYear: e.startYear ?? null, endYear: e.endYear ?? null,
      })),
      certifications: a.profile.certifications ?? [],
      projects:       (a.profile.projects ?? []).map((p) => ({
         name: p.name, description: p.description ?? null, technologies: p.technologies ?? [],
      })),
      availability:   a.profile.availability ?? "Unknown",
   }));

   return `You are an expert technical recruiter. Your task is to evaluate ${candidates.length} candidates for the job below and produce an accurate, ranked shortlist of the TOP ${shortlistSize} best-fit candidates.

## JOB SPECIFICATION
${JSON.stringify(jobContext, null, 2)}

## SCORING METHODOLOGY
For EACH candidate, independently score each of the five criteria on a 0–100 raw scale, then compute the weighted matchScore using EXACTLY this formula:

${formula}

### Criterion guidelines:
- **skills_raw (weight ${w.skills}%)**: Compare candidate's skills array against requiredSkills. Count exact matches and near-matches (related technologies). 90–100 = all required skills present + extras; 60–80 = most required skills; 30–50 = partial overlap; 0–20 = weak match.
- **exp_raw (weight ${w.experience}%)**: Evaluate total years AND relevance of prior roles. Consider seniority, industry fit, and job titles. 90–100 = exceeds requirements in both years and quality; 60–80 = meets requirements; 30–50 = partially meets; 0–20 = clearly below requirements.
- **edu_raw (weight ${w.education}%)**: Relevance of degree field and level to the role. 90–100 = directly relevant degree from reputable institution; 60–80 = related field; 30–50 = general degree, some relevance; 0–20 = unrelated or no data.
- **projects_raw (weight ${w.projects}%)**: Quality and relevance of listed projects and certifications. Prefer projects that demonstrate the required tech stack. 90–100 = highly relevant portfolio + industry certifications; 60–80 = good projects; 30–50 = basic or few projects; 0–20 = no notable projects.
- **avail_raw (weight ${w.availability}%)**: How well availability aligns with the role's needs.
${availabilityBlock}${minScoreBlock}${customBlock}
## CANDIDATES TO EVALUATE
${JSON.stringify(candidates, null, 2)}

## STRICT OUTPUT RULES
You MUST return ONLY a JSON array. No explanations, no markdown, no code fences. Exactly this schema per item:
{
  "candidateId": "<the candidate's id field>",
  "rank": <1-based integer, 1 = best>,
  "matchScore": <final weighted integer 0–100>,
  "criteriaScores": {
    "skills": <raw 0–100>,
    "experience": <raw 0–100>,
    "education": <raw 0–100>,
    "projects": <raw 0–100>,
    "availability": <raw 0–100>
  },
  "strengths": ["<specific strength tied to this job>", ...],
  "gaps": ["<specific gap or risk>", ...],
  "recommendation": "<2–3 sentences, specific to this job and candidate, not generic>"
}

Constraints:
- Return at most ${shortlistSize} candidates (fewer is fine if min-score gate applies)
- Rank 1 = highest matchScore, no ties in rank
- strengths and gaps: 2–4 items each, job-specific
- Use the weighted formula EXACTLY — do not guess or round arbitrarily
- Candidates not in the shortlist must be completely absent from the output`;
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

function extractJSONArray(rawText: string): unknown[] {
   const cleaned = rawText
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

   try {
      const v = JSON.parse(cleaned);
      if (Array.isArray(v)) return v;
      const inner = Object.values(v as Record<string, unknown>).find(Array.isArray);
      if (inner) return inner as unknown[];
   } catch { /* fall through */ }

   const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);
   if (arrayMatch) {
      try {
         const v = JSON.parse(arrayMatch[1]!);
         if (Array.isArray(v)) return v;
      } catch { /* fall through */ }
   }

   const objectMatch = cleaned.match(/(\{[\s\S]*\})/);
   if (objectMatch) {
      try {
         const v     = JSON.parse(objectMatch[1]!) as Record<string, unknown>;
         const inner = Object.values(v).find(Array.isArray);
         if (inner) return inner as unknown[];
      } catch { /* fall through */ }
   }

   throw new Error("Could not extract a JSON array from AI response");
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function screenApplicants(
   job:           IJob,
   applicants:    IApplicant[],
   shortlistSize: number,
   prefs?:        ScreeningPrefs,
): Promise<{
   shortlist:      ShortlistedCandidate[];
   modelUsed:      string;
   promptSnapshot: string;
}> {
   if (applicants.length === 0) {
      throw new AppError("No applicants to screen", 400);
   }

   const MAX_ATTEMPTS = 3;
   let lastParseError: Error | undefined;

   for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let rawText:            string;
      let usedModel:          string;
      let candidatesInPrompt: number;

      try {
         ({ text: rawText, modelUsed: usedModel, candidatesInPrompt } =
            await generateWithFallback((maxCandidates) =>
               buildScreeningPrompt(
                  job,
                  // Trim applicants to what this model can handle.
                  // paginatedScreening already sends the right page size,
                  // but this is a safety net for direct calls too.
                  applicants.slice(0, maxCandidates),
                  Math.min(shortlistSize, maxCandidates),
                  prefs,
               )
            ));
      } catch (err: unknown) {
         if (err instanceof AppError) throw err;
         const message = err instanceof Error ? err.message : "Unknown Gemini error";
         throw new AppError(`AI screening failed: ${message}`, 502);
      }

      if (candidatesInPrompt < applicants.length) {
         console.warn(
            `[SCREENING] Primary model unavailable — fell back to a model that handles ` +
            `${candidatesInPrompt} candidates (sent ${applicants.length}). ` +
            `Remaining ${applicants.length - candidatesInPrompt} candidates were not scored in this call.`,
         );
      }

      let parsed: unknown[];
      try {
         parsed = extractJSONArray(rawText);
      } catch (err) {
         lastParseError = err instanceof Error ? err : new Error(String(err));
         if (attempt < MAX_ATTEMPTS) {
            await sleep(800 * attempt);
            continue;
         }
         throw new AppError(
            `AI returned malformed JSON after ${MAX_ATTEMPTS} attempts. Please retry.`,
            502,
         );
      }

      const validated = (parsed as ShortlistedCandidate[])
         .filter(
            (c): c is ShortlistedCandidate =>
               typeof c.candidateId === "string"  &&
               typeof c.rank        === "number"  &&
               typeof c.matchScore  === "number"  &&
               Array.isArray(c.strengths)         &&
               Array.isArray(c.gaps)              &&
               typeof c.recommendation === "string",
         )
         .sort((a, b) => a.rank - b.rank);

      // Use the first batch's prompt as the snapshot
      const promptSnapshot = buildScreeningPrompt(
         job,
         applicants.slice(0, candidatesInPrompt),
         Math.min(shortlistSize, candidatesInPrompt),
         prefs,
      );

      return { shortlist: validated, modelUsed: usedModel, promptSnapshot };
   }

   throw new AppError(
      `AI screening failed after ${MAX_ATTEMPTS} attempts: ${lastParseError?.message ?? "Unknown parse error"}`,
      502,
   );
}