import jwt from "jsonwebtoken";
import { config } from "../config";
import type { AuthPayload } from "../types";

export function signToken(payload: AuthPayload): string {
   return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
   });
}

export function verifyToken(token: string): AuthPayload {
   return jwt.verify(token, config.jwt.secret) as AuthPayload;
}
