import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import type { TalentProfile } from "../types";
import { AppError } from "../utils";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const MODELS = [
   "gemini-2.5-flash", // best quality, stable
   "gemini-2.0-flash", // fast and reliable
   "gemini-2.0-flash-lite", // lightest fallback
];

/** Returns true for errors that mean "this model is unavailable" — try the next one */
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

export async function parsePdfResume(buffer: Buffer): Promise<string> {
   try {
      const data = await pdfParse(buffer);
      return data.text.trim();
   } catch {
      throw new AppError("Failed to parse PDF resume", 422);
   }
}

export async function parseResumeToProfile(
   buffer: Buffer,
): Promise<TalentProfile> {
   const rawText = await parsePdfResume(buffer);
   if (!rawText || rawText.length < 20) {
      throw new AppError("Resume appears to be empty or unreadable", 422);
   }

   const prompt = `You are a resume parser. Extract structured data from this resume text and return ONLY valid JSON (no markdown, no code fences) matching this exact schema:

{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "headline": "string — short professional summary",
  "bio": "string or null",
  "location": "string — City, Country",
  "skills": [{"name": "string", "level": "Beginner|Intermediate|Advanced|Expert", "yearsOfExperience": number}],
  "languages": [{"name": "string", "proficiency": "Basic|Conversational|Fluent|Native"}],
  "experience": [{"company": "string", "role": "string", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "description": "string", "technologies": ["string"], "isCurrent": boolean}],
  "education": [{"institution": "string", "degree": "string", "fieldOfStudy": "string", "startYear": number, "endYear": number|null}],
  "certifications": [{"name": "string", "issuer": "string", "issueDate": "YYYY-MM"}],
  "projects": [{"name": "string", "description": "string", "technologies": ["string"], "role": "string", "link": "string or null", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null"}],
  "availability": {"status": "Open to Opportunities", "type": "Full-time"},
  "socialLinks": {"linkedin": "string or null", "github": "string or null", "portfolio": "string or null"}
}

Rules:
- Infer skill levels from years of experience and context
- If a field cannot be determined, use reasonable defaults
- firstName and lastName are required — extract from the name at the top of the resume
- email is required — if not found, use "unknown@resume.upload"
- headline should summarize the candidate in one line
- Return ONLY the JSON object, nothing else

RESUME TEXT:
${rawText.slice(0, 8000)}`;

   let lastError: Error | undefined;

   for (const modelName of MODELS) {
      try {
         const model = genAI.getGenerativeModel({ model: modelName });
         const result = await model.generateContent(prompt);
         const text = result.response.text().trim();

         const cleaned = text
            .replace(/^```(?:json)?\n?/, "")
            .replace(/```$/, "")
            .trim();

         const profile = JSON.parse(cleaned) as TalentProfile;

         if (!profile.firstName || !profile.lastName || !profile.email) {
            throw new Error("Missing required fields");
         }

         return profile;
      } catch (err) {
         lastError = err instanceof Error ? err : new Error(String(err));
         const msg = lastError.message.toLowerCase();

         // JSON parse errors or missing fields are not model-availability issues — fail fast
         if (
            lastError.message === "Missing required fields" ||
            lastError instanceof SyntaxError
         ) {
            throw new AppError(
               "Failed to extract structured profile from resume. Please check the PDF quality.",
               422,
            );
         }

         if (isSkippableError(msg)) {
            continue; // try next model
         }

         // Non-skippable error (e.g. bad API key, malformed request) — fail fast
         throw new AppError(`Resume parsing failed: ${lastError.message}`, 502);
      }
   }

   throw new AppError(
      `Resume parsing failed: all models unavailable. Last error: ${lastError?.message ?? "Unknown"}`,
      502,
   );
}

export function parseSpreadsheet(
   buffer: Buffer,
   mimeType: string,
): TalentProfile[] {
   let workbook: XLSX.WorkBook;
   try {
      const type = mimeType === "text/csv" ? "string" : "buffer";
      workbook = XLSX.read(
         type === "string" ? buffer.toString("utf-8") : buffer,
         { type },
      );
   } catch {
      throw new AppError("Failed to parse spreadsheet", 422);
   }

   const sheet = workbook.Sheets[workbook.SheetNames[0]];
   const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
   });

   return rows.map((row, idx) => mapRowToProfile(row, idx));
}

function mapRowToProfile(
   row: Record<string, unknown>,
   idx: number,
): TalentProfile {
   const required = ["firstName", "lastName", "email", "headline", "location"];
   for (const field of required) {
      if (!row[field]) {
         throw new AppError(
            `Row ${idx + 2}: missing required field "${field}"`,
            422,
         );
      }
   }

   return {
      firstName: String(row["firstName"]),
      lastName: String(row["lastName"]),
      email: String(row["email"]),
      headline: String(row["headline"]),
      bio: row["bio"] ? String(row["bio"]) : undefined,
      location: String(row["location"]),
      skills: parseJsonField<TalentProfile["skills"]>(row["skills"], []),
      languages: parseJsonField<TalentProfile["languages"]>(
         row["languages"],
         [],
      ),
      experience: parseJsonField<TalentProfile["experience"]>(
         row["experience"],
         [],
      ),
      education: parseJsonField<TalentProfile["education"]>(
         row["education"],
         [],
      ),
      certifications: parseJsonField<TalentProfile["certifications"]>(
         row["certifications"],
         [],
      ),
      projects: parseJsonField<TalentProfile["projects"]>(row["projects"], []),
      availability: parseJsonField<TalentProfile["availability"]>(
         row["availability"],
         {
            status: "Open to Opportunities",
            type: "Full-time",
         },
      ),
      socialLinks: parseJsonField<TalentProfile["socialLinks"]>(
         row["socialLinks"],
         {},
      ),
   };
}

function parseJsonField<T>(value: unknown, fallback: T): T {
   if (!value || value === "") return fallback;
   if (typeof value === "object") return value as T;
   try {
      return JSON.parse(String(value)) as T;
   } catch {
      return fallback;
   }
}
