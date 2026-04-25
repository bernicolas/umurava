import type { AuthPayload } from "../types";

declare global {
   namespace Express {
      interface Request {
         user?: AuthPayload;
      }
   }
}
