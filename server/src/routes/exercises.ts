import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { exerciseSelect } from "../lib/plans.js";
import { MuscleEnum } from "../lib/types.js";
import { HttpError } from "../lib/http.js";

export const exercisesRouter = Router();

exercisesRouter.get("/", async (req, res) => {
  const q = z
    .object({ q: z.string().optional(), muscle: MuscleEnum.optional(), type: z.enum(["STRENGTH", "CARDIO", "MOBILITY"]).optional() })
    .parse(req.query);
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ ownerId: null }, { ownerId: uid(req) }],
      ...(q.q ? { name: { contains: q.q, mode: "insensitive" } } : {}),
      ...(q.muscle ? { primaryMuscle: q.muscle } : {}),
      ...(q.type ? { type: q.type } : {}),
    },
    select: exerciseSelect,
    orderBy: { name: "asc" },
  });
  res.json(exercises);
});

const customExercise = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["STRENGTH", "CARDIO", "MOBILITY"]).default("STRENGTH"),
  primaryMuscle: MuscleEnum,
  equipment: z.enum(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band", "none"]).default("none"),
  instructions: z.string().max(1000).default(""),
});

exercisesRouter.post("/", async (req, res) => {
  const body = customExercise.parse(req.body);
  const exercise = await prisma.exercise.create({
    data: { ...body, secondaryMuscles: [], ownerId: uid(req) },
    select: exerciseSelect,
  });
  res.status(201).json(exercise);
});

exercisesRouter.delete("/:id", async (req, res) => {
  const ex = await prisma.exercise.findFirst({ where: { id: req.params.id, ownerId: uid(req) } });
  if (!ex) throw new HttpError(404, "Exercise not found");
  const used = await prisma.setLog.count({ where: { exerciseId: ex.id } });
  const inPlans = await prisma.planExercise.count({ where: { exerciseId: ex.id } });
  if (used || inPlans) throw new HttpError(409, "This exercise is used in a plan or workout and can't be deleted");
  await prisma.exercise.delete({ where: { id: ex.id } });
  res.status(204).end();
});
