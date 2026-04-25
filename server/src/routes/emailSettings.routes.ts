import { Router } from "express";
import {
   getEmailSettings,
   updateEmailSettings,
   testEmailSettings,
   getDefaultTemplates,
} from "../controllers/emailSettings.controller";
import { authenticate, authorize } from "../middleware";

const router = Router();

router.use(authenticate, authorize("recruiter", "admin"));

router.get("/", getEmailSettings);
router.put("/", updateEmailSettings);
router.post("/test", testEmailSettings);
router.get("/defaults", getDefaultTemplates);

export default router;
