import { Router } from "express";
import { z } from "zod";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { EquipmentEnum, ExperienceEnum, GoalEnum } from "../lib/types.js";

export const meRouter = Router();

export function publicUser(u: User) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

meRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) } });
  res.json(publicUser(user));
});

const profileUpdate = z
  .object({
    name: z.string().trim().min(1).max(60),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable(),
    sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
    heightCm: z.number().min(50).max(272).nullable(),
    weightKg: z.number().min(20).max(400).nullable(),
    experience: ExperienceEnum,
    goal: GoalEnum,
    equipment: EquipmentEnum,
    daysPerWeek: z.number().int().min(1).max(7),
    units: z.enum(["IMPERIAL", "METRIC"]),
    onboarded: z.boolean(),
  })
  .partial();

meRouter.put("/", async (req, res) => {
  const data = profileUpdate.parse(req.body);
  const userId = uid(req);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { weightKg: true } });
  const user = await prisma.user.update({ where: { id: userId }, data });
  // Log body weight changes so they show up on the progress chart.
  if (data.weightKg && data.weightKg !== before.weightKg) {
    await prisma.bodyMetric.create({ data: { userId, weightKg: data.weightKg } });
  }
  res.json(publicUser(user));
});

meRouter.delete("/", async (req, res) => {
  await prisma.user.delete({ where: { id: uid(req) } });
  res.status(204).end();
});
