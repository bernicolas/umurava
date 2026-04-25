import { Router } from "express";
import { authenticate } from "../middleware";
import {
   listSessions,
   getSession,
   createSession,
   sendMessage,
   deleteSession,
} from "../controllers/chat.controller";

const router = Router();

router.use(authenticate);

router.get("/sessions", listSessions);
router.post("/sessions", createSession);
router.get("/sessions/:id", getSession);
router.post("/sessions/:id/messages", sendMessage);
router.delete("/sessions/:id", deleteSession);

export default router;
