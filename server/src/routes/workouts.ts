import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { exerciseSelect } from "../lib/plans.js";
import { localDayKey } from "../lib/schedule.js";

export const workoutsRouter = Router();

const setInput = z.object({
  reps: z.number().int().min(0).max(1000).nullish(),
  weightKg: z.number().min(0).max(1000).nullish(),
  durationSec: z.number().int().min(0).max(24 * 3600).nullish(),
  distanceKm: z.number().min(0).max(500).nullish(),
});

const workoutInput = z
  .object({
    planId: z.string().nullish(),
    planDayId: z.string().nullish(),
    // Which calendar booking this workout fulfils (optional; same-day plan days are matched automatically).
    scheduledId: z.string().nullish(),
    tzOffset: z.number().int().min(-840).max(840).default(0),
    name: z.string().trim().min(1).max(80),
    startedAt: z.coerce.date(),
    completedAt: z.coerce.date(),
    notes: z.string().max(2000).default(""),
    effort: z.number().int().min(1).max(10).nullish(),
    exercises: z
      .array(z.object({ exerciseId: z.string(), sets: z.array(setInput).min(1).max(50) }))
      .min(1, "Log at least one set before finishing"),
  })
  .refine((w) => w.completedAt >= w.startedAt, { message: "Workout can't end before it starts", path: ["completedAt"] });

/** Epley estimated one-rep max. */
export function e1rm(weightKg: number, reps: number) {
  if (reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

type SetLike = { reps: number | null; weightKg: number | null; durationSec: number | null; distanceKm: number | null };
function volume(sets: SetLike[]) {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0);
}

function summarize(w: {
  id: string;
  name: string;
  startedAt: Date;
  completedAt: Date;
  effort: number | null;
  notes: string;
  planId: string | null;
  planDayId: string | null;
  plan: { name: string } | null;
  sets: (SetLike & { exerciseId: string })[];
}) {
  return {
    id: w.id,
    name: w.name,
    startedAt: w.startedAt,
    completedAt: w.completedAt,
    effort: w.effort,
    notes: w.notes,
    planId: w.planId,
    planDayId: w.planDayId,
    planName: w.plan?.name ?? null,
    durationMin: Math.max(1, Math.round((w.completedAt.getTime() - w.startedAt.getTime()) / 60000)),
    exerciseCount: new Set(w.sets.map((s) => s.exerciseId)).size,
    setCount: w.sets.length,
    volumeKg: Math.round(volume(w.sets)),
  };
}

workoutsRouter.get("/", async (req, res) => {
  const q = z
    .object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().optional() })
    .parse(req.query);
  const rows = await prisma.workoutSession.findMany({
    where: { userId: uid(req) },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    include: { plan: { select: { name: true } }, sets: true },
  });
  const hasMore = rows.length > q.limit;
  const items = rows.slice(0, q.limit).map(summarize);
  res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
});

/** Local calendar days that have workouts, for the history calendar. */
workoutsRouter.get("/days", async (req, res) => {
  const q = z.object({ tzOffset: z.coerce.number().int().default(0), days: z.coerce.number().int().min(1).max(730).default(120) }).parse(req.query);
  const since = new Date(Date.now() - q.days * 86_400_000);
  const rows = await prisma.workoutSession.findMany({
    where: { userId: uid(req), completedAt: { gte: since } },
    select: { completedAt: true },
  });
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const key = localDayKey(r.completedAt, q.tzOffset);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  res.json(counts);
});

/** The most recent sets logged for each exercise, used to pre-fill the workout logger. */
workoutsRouter.get("/last", async (req, res) => {
  const ids = z
    .string()
    .default("")
    .parse(req.query.exerciseIds)
    .split(",")
    .filter(Boolean)
    .slice(0, 50);
  const userId = uid(req);
  const result: Record<string, { date: Date; sets: SetLike[] }> = {};
  await Promise.all(
    ids.map(async (exerciseId) => {
      const last = await prisma.setLog.findFirst({
        where: { exerciseId, session: { userId } },
        orderBy: { session: { completedAt: "desc" } },
        select: { sessionId: true, session: { select: { completedAt: true } } },
      });
      if (!last) return;
      const sets = await prisma.setLog.findMany({
        where: { sessionId: last.sessionId, exerciseId },
        orderBy: { setNumber: "asc" },
        select: { reps: true, weightKg: true, durationSec: true, distanceKm: true },
      });
      result[exerciseId] = { date: last.session.completedAt, sets };
    }),
  );
  res.json(result);
});

workoutsRouter.get("/:id", async (req, res) => {
  const w = await prisma.workoutSession.findFirst({
    where: { id: req.params.id, userId: uid(req) },
    include: {
      plan: { select: { name: true } },
      sets: { orderBy: [{ order: "asc" }, { setNumber: "asc" }], include: { exercise: { select: exerciseSelect } } },
    },
  });
  if (!w) throw new HttpError(404, "Workout not found");
  const groups: { exercise: (typeof w.sets)[number]["exercise"]; sets: SetLike[] }[] = [];
  for (const s of w.sets) {
    let g = groups[groups.length - 1];
    if (!g || g.exercise.id !== s.exerciseId) {
      g = { exercise: s.exercise, sets: [] };
      groups.push(g);
    }
    g.sets.push({ reps: s.reps, weightKg: s.weightKg, durationSec: s.durationSec, distanceKm: s.distanceKm });
  }
  res.json({ ...summarize(w), exercises: groups });
});

workoutsRouter.post("/", async (req, res) => {
  const userId = uid(req);
  const body = workoutInput.parse(req.body);

  // Only link to plans the user owns.
  let planId: string | null = null;
  let planDayId: string | null = null;
  if (body.planDayId) {
    const day = await prisma.planDay.findFirst({ where: { id: body.planDayId, plan: { userId } } });
    if (day) {
      planDayId = day.id;
      planId = day.planId;
    }
  } else if (body.planId) {
    const plan = await prisma.plan.findFirst({ where: { id: body.planId, userId } });
    planId = plan?.id ?? null;
  }

  const exerciseIds = [...new Set(body.exercises.map((e) => e.exerciseId))];
  const usable = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds }, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true, name: true },
  });
  if (usable.length !== exerciseIds.length) throw new HttpError(400, "Workout contains an unknown exercise");

  // Previous bests, to celebrate personal records after saving.
  const previous = await prisma.setLog.findMany({
    where: { exerciseId: { in: exerciseIds }, session: { userId } },
    select: { exerciseId: true, reps: true, weightKg: true, distanceKm: true },
  });

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      planId,
      planDayId,
      name: body.name,
      startedAt: body.startedAt,
      completedAt: body.completedAt,
      notes: body.notes,
      effort: body.effort ?? null,
      sets: {
        create: body.exercises.flatMap((e, order) =>
          e.sets.map((s, i) => ({
            exerciseId: e.exerciseId,
            order,
            setNumber: i + 1,
            reps: s.reps ?? null,
            weightKg: s.weightKg ?? null,
            durationSec: s.durationSec ?? null,
            distanceKm: s.distanceKm ?? null,
          })),
        ),
      },
    },
    include: { plan: { select: { name: true } }, sets: true },
  });

  // Tick off the calendar booking this workout was for.
  const dateKey = localDayKey(body.completedAt, body.tzOffset);
  const booking = await prisma.scheduledWorkout.findFirst({
    where: body.scheduledId
      ? { id: body.scheduledId, userId, sessionId: null }
      : planDayId
        ? { userId, planDayId, date: dateKey, sessionId: null }
        : { id: "" },
    orderBy: { createdAt: "asc" },
  });
  if (booking) await prisma.scheduledWorkout.update({ where: { id: booking.id }, data: { sessionId: session.id } });

  const names = new Map(usable.map((u) => [u.id, u.name]));
  const prs: { exerciseId: string; name: string; kind: "weight" | "e1rm" | "distance"; value: number }[] = [];
  for (const e of body.exercises) {
    const prev = previous.filter((p) => p.exerciseId === e.exerciseId);
    if (!prev.length) continue; // first time doing it isn't a PR
    const prevMaxW = Math.max(0, ...prev.map((p) => p.weightKg ?? 0));
    const prevMax1 = Math.max(0, ...prev.map((p) => e1rm(p.weightKg ?? 0, p.reps ?? 0)));
    const prevMaxD = Math.max(0, ...prev.map((p) => p.distanceKm ?? 0));
    const maxW = Math.max(0, ...e.sets.map((s) => s.weightKg ?? 0));
    const max1 = Math.max(0, ...e.sets.map((s) => e1rm(s.weightKg ?? 0, s.reps ?? 0)));
    const maxD = Math.max(0, ...e.sets.map((s) => s.distanceKm ?? 0));
    const name = names.get(e.exerciseId)!;
    if (maxW > prevMaxW) prs.push({ exerciseId: e.exerciseId, name, kind: "weight", value: maxW });
    else if (max1 > prevMax1 + 0.01) prs.push({ exerciseId: e.exerciseId, name, kind: "e1rm", value: Math.round(max1 * 10) / 10 });
    else if (maxD > prevMaxD) prs.push({ exerciseId: e.exerciseId, name, kind: "distance", value: maxD });
  }

  res.status(201).json({ workout: summarize(session), prs, scheduledId: booking?.id ?? null });
});

workoutsRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.workoutSession.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  if (!count) throw new HttpError(404, "Workout not found");
  res.status(204).end();
});
