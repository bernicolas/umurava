import { Router } from "express";
import {
   getSettings,
   updateSettings,
} from "../controllers/settings.controller";
import { authenticate, authorize } from "../middleware";

const router = Router();

router.use(authenticate, authorize("recruiter", "admin"));


router.get("/", getSettings);


router.put("/", updateSettings);

export default router;
