import { Router } from "express";
import { verifyToken } from "../utils";
import { notifier } from "../services/notificationBroadcaster";
import { AppError } from "../utils";

const router = Router();

/**
 * GET /api/v1/notifications/stream
 *
 * Server-Sent Events endpoint. The JWT is passed as a query param `token`
 * because the browser EventSource API does not support custom headers.
 */
router.get("/stream", (req, res, next) => {
   const token = req.query["token"] as string | undefined;
   if (!token) return next(new AppError("Authentication required", 401));

   let userId: string;
   try {
      userId = verifyToken(token).userId;
   } catch {
      return next(new AppError("Invalid or expired token", 401));
   }

   res.setHeader("Content-Type", "text/event-stream");
   res.setHeader("Cache-Control", "no-cache");
   res.setHeader("Connection", "keep-alive");
   res.setHeader("X-Accel-Buffering", "no"); // disable nginx read buffering
   res.flushHeaders();

   // Confirm the stream is live on connect
   res.write(": connected\n\n");

   notifier.addClient(userId, res);

   // Heartbeat every 25 s — prevents proxy / load-balancer idle timeout
   const heartbeat = setInterval(() => {
      try {
         res.write(": ping\n\n");
      } catch {
         clearInterval(heartbeat);
      }
   }, 25_000);

   req.on("close", () => {
      clearInterval(heartbeat);
      notifier.removeClient(userId, res);
   });
});

export default router;
