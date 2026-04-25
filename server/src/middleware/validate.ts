import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import type { ApiResponse } from "../types";

export function validate(
   req: Request,
   res: Response,
   next: NextFunction,
): void {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      const array = errors.array();
      const payload: ApiResponse = {
         success: false,
         message: array[0]?.msg ?? "Validation failed",
      };
      res.status(422).json(payload);
      return;
   }
   next();
}