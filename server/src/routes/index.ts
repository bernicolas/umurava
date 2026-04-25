import { Router } from "express";
import authRoutes from "./auth.routes";
import jobRoutes from "./job.routes";
import applicantRoutes from "./applicant.routes";
import screeningRoutes from "./screening.routes";
import adminRoutes from "./admin.routes";
import settingsRoutes from "./settings.routes";
import notificationRoutes from "./notification.routes";
import chatRoutes from "./chat.routes";
import talentPoolRoutes from "./talentPool.routes";
import emailSettingsRoutes from "./emailSettings.routes";
import { authenticate } from "../middleware";
import { getAllShortlists } from "../controllers/screening.controller";
import { getApplicantById } from "../controllers/applicant.controller";
import {
   getGlobalActivity,
   composeJobEmail,
} from "../controllers/activity.controller";

const api = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */
api.use("/auth", authRoutes);

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management
 */
api.use("/jobs", jobRoutes);

/**
 * @swagger
 * tags:
 *   name: Applicants
 *   description: Applicant management endpoints
 */
api.use("/jobs/:jobId/applicants", applicantRoutes);
api.get("/applicants/:applicantId", authenticate, getApplicantById);

/**
 * @swagger
 * tags:
 *   name: Screening
 *   description: AI screening endpoints
 */
api.use("/jobs/:jobId/screening", screeningRoutes);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only user management endpoints
 */
api.use("/admin", adminRoutes);

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Settings endpoints
 */
api.use("/settings", settingsRoutes);

api.use("/notifications", notificationRoutes);
api.use("/chat", chatRoutes);
api.use("/talent-pool", talentPoolRoutes);
api.use("/email-settings", emailSettingsRoutes);

api.get("/activity/global", authenticate, getGlobalActivity);
api.post("/activity/compose", authenticate, composeJobEmail);

/**
 * @swagger
 * /screening/all:
 *   get:
 *     summary: Get all shortlists across all jobs
 *     tags: [Screening]
 *     responses:
 *       200:
 *         description: All screening results
 */
api.get("/screening/all", authenticate, getAllShortlists);

export default api;
