import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";

export const metricsRouter = Router();

metricsRouter.get("/body", async (req, res) => {
  const rows = await prisma.bodyMetric.findMany({
    where: { userId: uid(req) },
    orderBy: { date: "asc" },
    take: 365,
  });
  res.json(rows);
});

metricsRouter.post("/body", async (req, res) => {
  const body = z.object({ weightKg: z.number().min(20).max(400), date: z.coerce.date().optional() }).parse(req.body);
  const userId = uid(req);
  const row = await prisma.bodyMetric.create({ data: { userId, weightKg: body.weightKg, date: body.date ?? new Date() } });
  // Keep the profile weight in sync with the latest entry.
  const latest = await prisma.bodyMetric.findFirst({ where: { userId }, orderBy: { date: "desc" } });
  if (latest) await prisma.user.update({ where: { id: userId }, data: { weightKg: latest.weightKg } });
  res.status(201).json(row);
});

metricsRouter.delete("/body/:id", async (req, res) => {
  const { count } = await prisma.bodyMetric.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  if (!count) throw new HttpError(404, "Entry not found");
  res.status(204).end();
});
