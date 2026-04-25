import multer, { FileFilterCallback } from "multer";
import type { Request } from "express";
import path from "path";
import { config } from "../config";

const ALLOWED_MIME = new Set([
   "application/pdf",
   "application/vnd.ms-excel",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   "text/csv",
]);

function fileFilter(
   _req: Request,
   file: Express.Multer.File,
   cb: FileFilterCallback,
): void {
   if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
   } else {
      cb(new Error("Only PDF, CSV, and Excel files are allowed"));
   }
}

const storage = multer.memoryStorage();

export const upload = multer({
   storage,
   fileFilter,
   limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});
