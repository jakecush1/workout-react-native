import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { addDays, localDayKey } from "../lib/schedule.js";

export const scheduleRouter = Router();

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD").refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

const scheduledInclude = {
  planDay: { select: { id: true, name: true, planId: true, plan: { select: { name: true } }, _count: { select: { exercises: true } } } },
  session: { select: { id: true, completedAt: true } },
} as const;

type Row = Awaited<ReturnType<typeof prisma.scheduledWorkout.findFirst<{ include: typeof scheduledInclude }>>>;

export type ScheduledStatus = "done" | "missed" | "today" | "upcoming";

export function presentScheduled(row: NonNullable<Row>, todayKey: string) {
  const status: ScheduledStatus = row.session ? "done" : row.date < todayKey ? "missed" : row.date === todayKey ? "today" : "upcoming";
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    name: row.name,
    notes: row.notes,
    planDayId: row.planDay?.id ?? null,
    planId: row.planDay?.planId ?? null,
    planName: row.planDay?.plan.name ?? null,
    exerciseCount: row.planDay?._count.exercises ?? 0,
    sessionId: row.session?.id ?? null,
    status,
  };
}

/** Scheduled workouts in a date range (defaults: a year back to a year ahead). */
scheduleRouter.get("/", async (req, res) => {
  const q = z
    .object({
      tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
      from: dayKey.optional(),
      to: dayKey.optional(),
    })
    .parse(req.query);
  const now = new Date();
  const todayKey = localDayKey(now, q.tzOffset);
  const from = q.from ?? localDayKey(addDays(now, -365), q.tzOffset);
  const to = q.to ?? localDayKey(addDays(now, 365), q.tzOffset);
  const rows = await prisma.scheduledWorkout.findMany({
    where: { userId: uid(req), date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
    include: scheduledInclude,
  });
  res.json(rows.map((r) => presentScheduled(r, todayKey)));
});

/** Book a workout on one or more dates. */
scheduleRouter.post("/", async (req, res) => {
  const userId = uid(req);
  const body = z
    .object({
      planDayId: z.string().nullish(),
      name: z.string().trim().max(80).optional(),
      dates: z.array(dayKey).min(1).max(60),
      time: timeKey.nullish(),
      notes: z.string().max(1000).default(""),
      tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
    })
    .parse(req.body);

  let name = body.name?.trim() ?? "";
  if (body.planDayId) {
    const day = await prisma.planDay.findFirst({ where: { id: body.planDayId, plan: { userId } }, select: { name: true } });
    if (!day) throw new HttpError(404, "That workout day no longer exists");
    name ||= day.name;
  }
  if (!name) throw new HttpError(400, "Give the workout a name or pick a plan day");

  const dates = [...new Set(body.dates)].sort();
  // Don't book the same plan day twice on one date.
  const existing = body.planDayId
    ? await prisma.scheduledWorkout.findMany({ where: { userId, planDayId: body.planDayId, date: { in: dates } }, select: { date: true } })
    : [];
  const taken = new Set(existing.map((e) => e.date));
  const toCreate = dates.filter((d) => !taken.has(d));
  if (toCreate.length) {
    await prisma.scheduledWorkout.createMany({
      data: toCreate.map((date) => ({ userId, planDayId: body.planDayId ?? null, name, date, time: body.time ?? null, notes: body.notes })),
    });
  }
  const todayKey = localDayKey(new Date(), body.tzOffset);
  const rows = await prisma.scheduledWorkout.findMany({
    where: { userId, date: { in: dates }, name, planDayId: body.planDayId ?? null },
    orderBy: { date: "asc" },
    include: scheduledInclude,
  });
  res.status(201).json({ created: toCreate.length, skipped: dates.length - toCreate.length, items: rows.map((r) => presentScheduled(r, todayKey)) });
});

/** Move or tweak a scheduled workout. */
scheduleRouter.put("/:id", async (req, res) => {
  const userId = uid(req);
  const body = z
    .object({
      date: dayKey.optional(),
      time: timeKey.nullish(),
      name: z.string().trim().min(1).max(80).optional(),
      notes: z.string().max(1000).optional(),
      tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
    })
    .parse(req.body);
  const row = await prisma.scheduledWorkout.findFirst({ where: { id: req.params.id, userId } });
  if (!row) throw new HttpError(404, "Scheduled workout not found");
  const updated = await prisma.scheduledWorkout.update({
    where: { id: row.id },
    data: {
      ...(body.date ? { date: body.date } : {}),
      ...(body.time !== undefined ? { time: body.time } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: scheduledInclude,
  });
  res.json(presentScheduled(updated, localDayKey(new Date(), body.tzOffset)));
});

scheduleRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.scheduledWorkout.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  if (!count) throw new HttpError(404, "Scheduled workout not found");
  res.status(204).end();
});
