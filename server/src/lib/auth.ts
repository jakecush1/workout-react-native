import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./http.js";

const SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "90d" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new HttpError(401, "Not signed in");
  try {
    const payload = jwt.verify(token, SECRET);
    if (typeof payload === "string" || !payload.sub) throw new Error("bad token");
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, "Session expired. Please sign in again.");
  }
}

/** Use inside routes mounted behind requireAuth. */
export function uid(req: Request): string {
  if (!req.userId) throw new HttpError(401, "Not signed in");
  return req.userId;
}
