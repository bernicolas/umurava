import { Router } from "express";
import {
   addPlatformApplicants,
   uploadExternalApplicants,
   uploadResumeApplicant,
   getApplicants,
   deleteApplicant,
   bulkProfileValidation,
   uploadResumeApplicantsBulk,
} from "../controllers/applicant.controller";
import { authenticate, validate, upload } from "../middleware";

const router = Router({ mergeParams: true });

router.use(authenticate);


/**
 * @swagger
 * /jobs/{jobId}/applicants:
 *   get:
 *     summary: Get all applicants for a job
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applicants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Applicant'
 *       404:
 *         description: Job not found
 */
router.route("/").get(getApplicants);


/**
 * @swagger
 * /jobs/{jobId}/applicants/platform:
 *   post:
 *     summary: Add structured applicants from Umurava platform
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [candidates]
 *             properties:
 *               candidates:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Applicant'
 *                 example:
 *                   - firstName: Alice
 *                     lastName: Smith
 *                     email: alice@example.com
 *                     skills:
 *                       - name: React
 *                         level: Expert
 *                         yearsOfExperience: 4
 *                     workExperience: []
 *                     education: []
 *     responses:
 *       201:
 *         description: Applicants added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Applicant'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
   "/platform",
   bulkProfileValidation,
   validate,
   addPlatformApplicants,
);



/**
 * @swagger
 * /jobs/{jobId}/applicants/upload:
 *   post:
 *     summary: Upload applicants from CSV or Excel spreadsheet
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or Excel file (.csv, .xlsx, .xls)
 *     responses:
 *       201:
 *         description: Applicants imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Applicant'
 *       400:
 *         description: Invalid file format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/upload", upload.single("file"), uploadExternalApplicants);





/**
 * @swagger
 * /jobs/{jobId}/applicants/resume/bulk:
 *   post:
 *     summary: Upload up to 10 PDF resumes — Gemini AI parses each into a structured profile
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: PDF resume files (max 10)
 *     responses:
 *       201:
 *         description: Resumes parsed — includes count, applicants created, and any per-file errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                 applicants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Applicant'
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid files or limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/resume/bulk", upload.array("files", 10), uploadResumeApplicantsBulk);

/**
 * @swagger
 * /jobs/{jobId}/applicants/resume:
 *   post:
 *     summary: Upload a PDF resume — Gemini AI parses it into a structured profile
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF resume file
 *     responses:
 *       201:
 *         description: Resume parsed and applicant created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Applicant'
 *       400:
 *         description: Invalid file or parsing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/resume", upload.single("file"), uploadResumeApplicant);

/**
 * @swagger
 * /jobs/{jobId}/applicants/{applicantId}:
 *   delete:
 *     summary: Delete an applicant from a job
 *     tags: [Applicants]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: applicantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Applicant deleted successfully
 *       404:
 *         description: Applicant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:applicantId", deleteApplicant);

export default router;
