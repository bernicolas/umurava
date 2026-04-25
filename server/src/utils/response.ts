import type { Response } from "express";
import type { ApiResponse, PaginatedResponse } from "../types";

export function sendSuccess<T>(
   res: Response,
   data: T,
   message?: string,
   statusCode = 200,
): void {
   const payload: ApiResponse<T> = { success: true, data, message };
   res.status(statusCode).json(payload);
}

export function sendError(
   res: Response,
   message: string,
   statusCode = 400,
): void {
   const payload: ApiResponse = { success: false, message };
   res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
   res: Response,
   items: T[],
   total: number,
   page: number,
   limit: number,
): void {
   const payload: ApiResponse<PaginatedResponse<T>> = {
      success: true,
      data: {
         items,
         meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
   };
   res.status(200).json(payload);
}
