import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import type { PlanInput } from "./types.js";

export const exerciseSelect = {
  id: true,
  name: true,
  type: true,
  primaryMuscle: true,
  secondaryMuscles: true,
  equipment: true,
  instructions: true,
  ownerId: true,
} satisfies Prisma.ExerciseSelect;

export const planInclude = {
  days: {
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: exerciseSelect } },
      },
    },
  },
} satisfies Prisma.PlanInclude;

/** Ensure every exercise id is either a library exercise or one the user created. */
export async function assertExercisesUsable(userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const found = await prisma.exercise.findMany({
    where: { id: { in: unique }, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true },
  });
  if (found.length !== unique.length) {
    const ok = new Set(found.map((e) => e.id));
    const missing = unique.filter((id) => !ok.has(id));
    throw new HttpError(400, `Unknown exercise: ${missing.join(", ")}`);
  }
}

function daysCreate(input: PlanInput): Prisma.PlanDayCreateWithoutPlanInput[] {
  return input.days.map((d, i) => ({
    order: i,
    name: d.name,
    weekday: d.weekday ?? null,
    notes: d.notes,
    exercises: {
      create: d.exercises.map((e, j) => ({
        order: j,
        exercise: { connect: { id: e.exerciseId } },
        sets: e.sets,
        reps: e.reps,
        restSec: e.restSec,
        durationSec: e.durationSec ?? null,
        distanceKm: e.distanceKm ?? null,
        notes: e.notes,
      })),
    },
  }));
}

export async function createPlan(userId: string, input: PlanInput) {
  await assertExercisesUsable(userId, input.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  return prisma.$transaction(async (tx) => {
    const existingActive = await tx.plan.count({ where: { userId, isActive: true } });
    // The first plan a user makes becomes active automatically.
    const activate = input.activate || existingActive === 0;
    if (activate) await tx.plan.updateMany({ where: { userId }, data: { isActive: false } });
    return tx.plan.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        goal: input.goal ?? null,
        source: input.source,
        templateId: input.templateId ?? null,
        isActive: activate,
        days: { create: daysCreate(input) },
      },
      include: planInclude,
    });
  });
}

/** Replace a plan's contents. Days keep their ids where possible so workout history stays linked. */
export async function updatePlan(userId: string, planId: string, input: PlanInput & { dayIds?: (string | null)[] }) {
  const plan = await prisma.plan.findFirst({ where: { id: planId, userId }, include: { days: true } });
  if (!plan) throw new HttpError(404, "Plan not found");
  await assertExercisesUsable(userId, input.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));

  const existingDayIds = new Set(plan.days.map((d) => d.id));
  const keptIds = new Set((input.dayIds ?? []).filter((id): id is string => !!id && existingDayIds.has(id)));

  return prisma.$transaction(async (tx) => {
    if (input.activate) await tx.plan.updateMany({ where: { userId }, data: { isActive: false } });
    await tx.planDay.deleteMany({ where: { planId, id: { notIn: [...keptIds] } } });
    for (const [i, d] of input.days.entries()) {
      const dayId = input.dayIds?.[i];
      const exercises = d.exercises.map((e, j) => ({
        order: j,
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        restSec: e.restSec,
        durationSec: e.durationSec ?? null,
        distanceKm: e.distanceKm ?? null,
        notes: e.notes,
      }));
      if (dayId && keptIds.has(dayId)) {
        await tx.planExercise.deleteMany({ where: { planDayId: dayId } });
        await tx.planDay.update({
          where: { id: dayId },
          data: { order: i, name: d.name, weekday: d.weekday ?? null, notes: d.notes, exercises: { create: exercises } },
        });
      } else {
        await tx.planDay.create({
          data: { planId, order: i, name: d.name, weekday: d.weekday ?? null, notes: d.notes, exercises: { create: exercises } },
        });
      }
    }
    return tx.plan.update({
      where: { id: planId },
      data: {
        name: input.name,
        description: input.description,
        goal: input.goal ?? null,
        ...(input.activate ? { isActive: true } : {}),
      },
      include: planInclude,
    });
  });
}
