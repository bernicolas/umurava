import { Router } from "express";
import {
   createJob,
   getJobs,
   getJob,
   updateJob,
   deleteJob,
   closeJob,
   publishJob,
   getDashboardStats,
   jobValidation,
} from "../controllers/job.controller";
import { authenticate, validate } from "../middleware";

const router = Router();

router.use(authenticate);

router.get("/stats", getDashboardStats);

router.patch("/:id/close", closeJob);
router.patch("/:id/publish", publishJob);

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List all jobs (paginated)
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, requirements, skills, experienceYears]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior Backend Engineer
 *               description:
 *                 type: string
 *                 example: Build scalable APIs
 *               requirements:
 *                 type: string
 *                 example: 5+ years experience
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Node.js, TypeScript, MongoDB]
 *               experienceYears:
 *                 type: number
 *                 example: 5
 *     responses:
 *       201:
 *         description: Job created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 */
router.route("/").get(getJobs).post(jobValidation, validate, createJob);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *   put:
 *     summary: Update a job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       200:
 *         description: Job updated
 *   delete:
 *     summary: Delete a job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 */
router
   .route("/:id")
   .get(getJob)
   .put(jobValidation, validate, updateJob)
   .delete(deleteJob);

export default router;
