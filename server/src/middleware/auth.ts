import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils";
import { AppError } from "../utils";

export function authenticate(
   req: Request,
   res: Response,
   next: NextFunction,
): void {
   const authHeader = req.headers.authorization;
   if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError("Authentication required", 401));
   }

   const token = authHeader.split(" ")[1];
   try {
      req.user = verifyToken(token);
      next();
   } catch {
      next(new AppError("Invalid or expired token", 401));
   }
}

export function authorize(...roles: string[]) {
   return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user || !roles.includes(req.user.role)) {
         return next(new AppError("Insufficient permissions", 403));
      }
      next();
   };
}
