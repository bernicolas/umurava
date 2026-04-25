import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils";
import { config } from "../config";

export function errorHandler(
   err: Error,
   _req: Request,
   res: Response,
   _next: NextFunction,
): void {
   if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
   }

   if (config.nodeEnv !== "production") {
      console.error(err);
   }

   res.status(500).json({
      success: false,
      message:
         config.nodeEnv === "production"
            ? "Internal server error"
            : err.message,
   });
}
