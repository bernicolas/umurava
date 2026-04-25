import { randomUUID } from "crypto";
import {
   Job,
   Applicant,
   ScreeningResult,
   ScreeningHistory,
   ScreeningConfig,
} from "../models";
import { ScreeningRawScore } from "../models/ScreeningRawScore";
import { screenApplicants } from "./";
import { detectPageSize } from "./geminiModels";
import { notifier } from "./notificationBroadcaster";
import type { ScreeningPrefs, ShortlistedCandidate } from "../types";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Minimum pause between pages — ensures the 60s quota window resets */
const BETWEEN_PAGE_DELAY_MS = 62_000;

/** How many times to retry a page before permanently failing it */
const MAX_PAGE_RETRIES = 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function chunkArray<T>(arr: T[], size: number): T[][] {
   const chunks: T[][] = [];
   for (let i = 0; i < arr.length; i += size)
      chunks.push(arr.slice(i, i + size));
   return chunks;
}

/**
 * Gemini 429 responses include a suggested retry delay:
 *   "retryDelay":"58s"  or  "retryDelay":"3.41s"
 * We read it so we wait exactly as long as the API requests, not a fixed guess.
 */
function extractRetryDelayMs(errorMessage: string): number {
   const match = errorMessage.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
   if (match) {
      const seconds = parseFloat(match[1]!);
      // Add a 3s buffer so we don't hit the edge of the window
      return Math.ceil(seconds * 1000) + 3_000;
   }
   // No retryDelay in the error — fall back to the standard between-page gap
   return BETWEEN_PAGE_DELAY_MS;
}

// ─── Main paginated screening job ────────────────────────────────────────────

export async function runPaginatedScreening(
   jobId: string,
   overrideShortlistSize?: number,
): Promise<void> {
   const job = await Job.findById(jobId);
   if (!job) {
      console.error(`[PAGINATED] Job ${jobId} not found`);
      return;
   }

   const applicants = await Applicant.find({ jobId });
   if (!applicants.length) {
      job.screeningStatus = "none";
      job.screeningStartedAt = undefined;
      await job.save();
      return;
   }

   const pageSize = await detectPageSize();
   const sessionId = randomUUID();
   const pages = chunkArray(applicants, pageSize);
   const totalPages = pages.length;
   const totalApplicants = applicants.length;

   console.log(
      `[PAGINATED] "${job.title}" — ${totalApplicants} applicants, ` +
         `${totalPages} page(s) of ${pageSize}, session=${sessionId}`,
   );

   const configDoc = await ScreeningConfig.findOne({ userId: job.createdBy });
   const prefs: ScreeningPrefs | undefined = configDoc
      ? {
           scoringWeights: configDoc.scoringWeights,
           minScoreThreshold: configDoc.minScoreThreshold,
           customInstructions: configDoc.customInstructions,
           preferImmediateAvailability: configDoc.preferImmediateAvailability,
        }
      : undefined;

   // ── Page loop ─────────────────────────────────────────────────────────────
   for (let i = 0; i < pages.length; i++) {
      const pageNumber = i + 1;
      const page = pages[i]!;

      console.log(
         `[PAGINATED] Page ${pageNumber}/${totalPages} — ${page.length} applicants`,
      );

      // Broadcast page-start SSE
      notifier.broadcast({
         id: `screening-batch-progress-${jobId}-${pageNumber}-start`,
         type: "screening_batch_progress" as any,
         title: `Screening page ${pageNumber} of ${totalPages}`,
         body: `Evaluating applicants ${i * pageSize + 1}–${Math.min((i + 1) * pageSize, totalApplicants)} of ${totalApplicants}`,
         jobId: String(jobId),
         at: new Date().toISOString(),
         batchNumber: pageNumber,
         totalBatches: totalPages,
         processedApplicants: Math.min(i * pageSize, totalApplicants),
         totalApplicants,
      } as any);

      // pageResult lives outside try so the retry loop can assign it
      let pageResult: Awaited<ReturnType<typeof screenApplicants>> | null =
         null;

      // ── First attempt ────────────────────────────────────────────────────
      try {
         pageResult = await screenApplicants(job, page, page.length, prefs);
      } catch (firstErr) {
         const firstMsg =
            firstErr instanceof Error ? firstErr.message : String(firstErr);
         let retryDelay = extractRetryDelayMs(firstMsg);

         console.error(
            `[PAGINATED] Page ${pageNumber} attempt 1 failed: ${firstMsg.substring(0, 120)}`,
         );

         // ── Retry loop — never skip, always try again ────────────────────
         for (let retry = 1; retry <= MAX_PAGE_RETRIES; retry++) {
            console.log(
               `[PAGINATED] Page ${pageNumber} — retry ${retry}/${MAX_PAGE_RETRIES}, ` +
                  `waiting ${Math.round(retryDelay / 1000)}s for quota reset…`,
            );

            // Tell the frontend we're retrying (not skipping)
            notifier.broadcast({
               id: `screening-batch-progress-${jobId}-${pageNumber}-retry-${retry}`,
               type: "screening_batch_progress" as any,
               title: `Page ${pageNumber} retrying (${retry}/${MAX_PAGE_RETRIES})`,
               body: `Waiting ${Math.round(retryDelay / 1000)}s for API quota reset…`,
               jobId: String(jobId),
               at: new Date().toISOString(),
               batchNumber: pageNumber,
               totalBatches: totalPages,
               processedApplicants: Math.min(i * pageSize, totalApplicants),
               totalApplicants,
            } as any);

            await sleep(retryDelay);

            try {
               pageResult = await screenApplicants(
                  job,
                  page,
                  page.length,
                  prefs,
               );
               console.log(
                  `[PAGINATED] Page ${pageNumber} succeeded on retry ${retry}`,
               );
               break; // success — exit the retry loop
            } catch (retryErr) {
               const retryMsg =
                  retryErr instanceof Error
                     ? retryErr.message
                     : String(retryErr);
               console.error(
                  `[PAGINATED] Page ${pageNumber} retry ${retry} failed: ${retryMsg.substring(0, 120)}`,
               );
               // Read the new suggested delay from this error (quota window shifts)
               retryDelay = extractRetryDelayMs(retryMsg);
            }
         }

         // If still null after all retries, the page truly cannot be scored right now
         if (!pageResult) {
            console.error(
               `[PAGINATED] Page ${pageNumber} permanently failed after ${MAX_PAGE_RETRIES} retries — ` +
                  `${page.length} applicants will not be in this run`,
            );
            notifier.broadcast({
               id: `screening-failed-${jobId}-page-${pageNumber}`,
               type: "screening_failed",
               title: `Page ${pageNumber} could not be scored`,
               body: `${page.length} applicants skipped after ${MAX_PAGE_RETRIES} retries`,
               jobId: String(jobId),
               at: new Date().toISOString(),
            });
            // Continue to next page — partial results are better than aborting
            if (i < pages.length - 1) await sleep(BETWEEN_PAGE_DELAY_MS);
            continue;
         }
      }

      // ── Persist raw scores ────────────────────────────────────────────────
      if (pageResult) {
         await ScreeningRawScore.insertMany(
            pageResult.shortlist.map((c) => ({
               jobId: job._id,
               sessionId,
               candidateId: c.candidateId,
               pageNumber, // ← matches the schema field name
               matchScore: c.matchScore,
               criteriaScores: c.criteriaScores,
               strengths: c.strengths,
               gaps: c.gaps,
               recommendation: c.recommendation,
               modelUsed: pageResult!.modelUsed,
            })),
         );

         console.log(
            `[PAGINATED] Page ${pageNumber} saved — ${pageResult.shortlist.length} raw scores`,
         );

         // Broadcast page-complete SSE
         notifier.broadcast({
            id: `screening-batch-progress-${jobId}-${pageNumber}`,
            type: "screening_batch_progress" as any,
            title: `Page ${pageNumber} of ${totalPages} complete`,
            body: `${Math.min((i + 1) * pageSize, totalApplicants)} / ${totalApplicants} applicants scored`,
            jobId: String(jobId),
            at: new Date().toISOString(),
            batchNumber: pageNumber,
            totalBatches: totalPages,
            processedApplicants: Math.min((i + 1) * pageSize, totalApplicants),
            totalApplicants,
         } as any);
      }

      // Wait between pages so the quota window resets
      if (i < pages.length - 1) {
         console.log(
            `[PAGINATED] Waiting ${BETWEEN_PAGE_DELAY_MS / 1000}s before next page…`,
         );
         await sleep(BETWEEN_PAGE_DELAY_MS);
      }
   }

   // ── Assemble final shortlist ──────────────────────────────────────────────
   const allRaw = await ScreeningRawScore.find({ jobId, sessionId }).lean();

   if (!allRaw.length) {
      job.screeningStatus = "none";
      job.screeningStartedAt = undefined;
      await job.save();
      notifier.broadcast({
         id: `screening-failed-${jobId}-${Date.now()}`,
         type: "screening_failed",
         title: "Screening failed",
         body: "All pages failed — no scores recorded.",
         jobId: String(jobId),
         at: new Date().toISOString(),
      });
      return;
   }

   console.log(
      `[PAGINATED] Assembling shortlist from ${allRaw.length} raw scores`,
   );

   const threshold = prefs?.minScoreThreshold ?? 0;
   const filtered =
      threshold > 0 ? allRaw.filter((r) => r.matchScore >= threshold) : allRaw;

   filtered.sort((a, b) => b.matchScore - a.matchScore);
   const top = filtered.slice(0, overrideShortlistSize ?? job.shortlistSize);

   const shortlist: ShortlistedCandidate[] = top.map((r, idx) => ({
      candidateId: r.candidateId,
      rank: idx + 1,
      matchScore: r.matchScore,
      criteriaScores: r.criteriaScores,
      strengths: r.strengths,
      gaps: r.gaps,
      recommendation: r.recommendation,
   }));

   const modelsUsed = [...new Set(allRaw.map((r) => r.modelUsed))].join(" + ");
   const screenedAt = new Date();

   await ScreeningResult.findOneAndUpdate(
      { jobId },
      {
         jobId,
         totalApplicants: applicants.length,
         shortlistSize: shortlist.length,
         shortlist,
         screenedAt,
         modelUsed: modelsUsed,
         promptSnapshot: "",
         totalBatches: totalPages,
      },
      { upsert: true, new: true },
   );

   const topScore =
      shortlist.length > 0
         ? Math.max(...shortlist.map((c) => c.matchScore))
         : 0;
   const avgScore =
      shortlist.length > 0
         ? Math.round(
              shortlist.reduce((s, c) => s + c.matchScore, 0) /
                 shortlist.length,
           )
         : 0;
   const runNumber = (await ScreeningHistory.countDocuments({ jobId })) + 1;

   await ScreeningHistory.create({
      jobId,
      runNumber,
      totalApplicants: applicants.length,
      shortlistSize: shortlist.length,
      topScore,
      avgScore,
      modelUsed: modelsUsed,
      screenedAt,
      totalBatches: totalPages,
      shortlist,
   });

   const deleted = await ScreeningRawScore.deleteMany({ jobId, sessionId });
   console.log(`[PAGINATED] Cleaned up ${deleted.deletedCount} raw score rows`);

   job.screeningStatus = "done";
   job.lastScreenedApplicantCount = applicants.length;
   job.screeningStartedAt = undefined;
   await job.save();

   notifier.broadcast({
      id: `screening-done-${jobId}-${Date.now()}`,
      type: "screening_done",
      title: "Screening complete",
      body: `${shortlist.length} candidate${shortlist.length !== 1 ? "s" : ""} shortlisted for "${job.title}"`,
      jobId: String(jobId),
      at: new Date().toISOString(),
   });

   console.log(
      `[PAGINATED] DONE — ${shortlist.length}/${applicants.length} shortlisted, model(s): ${modelsUsed}`,
   );
}
