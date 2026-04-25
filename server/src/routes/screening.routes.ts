import { Router } from "express";
import {
   triggerScreening,
   getScreeningResult,
   getScreeningHistory,
   getHistoryRunDetail,
   combineScreeningRuns,
   getAllShortlists,
   triggerPaginatedScreening,
} from "../controllers/screening.controller";
import {
   getFinalization,
   finalizeCandidates,
   sendInterviewInvitations,
   sendRegretLetters,
   saveInterviewRounds,
} from "../controllers/finalSelection.controller";
import {
   getJobActivity,
   composeJobEmail,
} from "../controllers/activity.controller";
import { authenticate } from "../middleware";

const router = Router({ mergeParams: true });

router.use(authenticate);

// ── Per-job screening routes (/jobs/:jobId/screening/...) ─────────────────────
// These are mounted under /api/jobs by the job router as:
//   router.use("/:jobId/screening", screeningRouter);

/**
 * @swagger
 * /jobs/{jobId}/screening/trigger:
 *   post:
 *     summary: Trigger AI screening for a job
 *     tags: [Screening]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Screening triggered and results returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScreeningResult'
 *       404:
 *         description: Job not found
 */
router.post("/trigger", triggerScreening);

/**
 * @swagger
 * /jobs/{jobId}/screening/result:
 *   get:
 *     summary: Get latest screening result for a job
 *     tags: [Screening]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Screening result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScreeningResult'
 */
router.get("/result", getScreeningResult);

/**
 * @swagger
 * /jobs/{jobId}/screening/history:
 *   get:
 *     summary: Get screening history for a job
 *     tags: [Screening]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of past screening results
 */
router.get("/history", getScreeningHistory);

/**
 * @swagger
 * /jobs/{jobId}/screening/history/{historyId}:
 *   get:
 *     summary: Get screening history for a job by id
 *     tags: [Screening]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of past screening results
 */
router.get("/history/:historyId", getHistoryRunDetail);

router.post("/trigger-paginated", triggerPaginatedScreening);

/**
 * POST /jobs/:jobId/screening/combine
 * Body: { runIds: string[] }
 * Averages scores across the selected history runs and returns a combined shortlist.
 */
router.post("/combine", combineScreeningRuns);

// Finalization & email routes
router.get("/finalization", getFinalization);
router.post("/finalize", finalizeCandidates);
router.post("/send-invitations", sendInterviewInvitations);
router.post("/send-regret-letters", sendRegretLetters);
router.put("/interview-rounds", saveInterviewRounds);

// Activity & compose-email routes
router.get("/activity", getJobActivity);
router.post("/activity/compose", composeJobEmail);

export default router;

// ── Global screening routes (/screening/...) ─────────────────────────────────
// Mount separately in app.ts:  app.use("/api/screening", globalScreeningRouter)

export const globalScreeningRouter = Router();
globalScreeningRouter.get("/all", getAllShortlists);
