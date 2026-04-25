import { Router } from "express";
import {
   getTalentPool,
   updateTalentPoolEntry,
   removeTalentPoolEntry,
} from "../controllers/talentPool.controller";
import { authenticate, authorize } from "../middleware";

const router = Router();

router.use(authenticate, authorize("recruiter", "admin"));

router.get("/", getTalentPool);
router.patch("/:id", updateTalentPoolEntry);
router.delete("/:id", removeTalentPoolEntry);

export default router;
