import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

// Express 5 forwards rejected promises from async handlers to this middleware.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path.join(".");
    return res.status(400).json({
      error: path ? `${path}: ${first.message}` : (first?.message ?? "Invalid request"),
      issues: err.issues,
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong" });
}
