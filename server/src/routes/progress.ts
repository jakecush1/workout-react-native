import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { addDays, localDayKey, localWeekday, startOfLocalWeek } from "../lib/schedule.js";
import { e1rm } from "./workouts.js";

export const progressRouter = Router();

const tzQuery = z.object({ tzOffset: z.coerce.number().int().min(-840).max(840).default(0) });

type DayStatus = "done" | "missed" | "today" | "planned" | "rest";

progressRouter.get("/summary", async (req, res) => {
  const { tzOffset } = tzQuery.parse(req.query);
  const userId = uid(req);
  const now = new Date();

  const weekStart = startOfLocalWeek(now, tzOffset);
  const todayKey = localDayKey(now, tzOffset);

  const [user, activePlan, sessions, totals, bookings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { daysPerWeek: true } }),
    prisma.plan.findFirst({
      where: { userId, isActive: true },
      include: { days: { orderBy: { order: "asc" }, include: { _count: { select: { exercises: true } } } } },
    }),
    // Two years is plenty for streaks; only timestamps are needed.
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { gte: addDays(now, -730) } },
      select: { id: true, name: true, completedAt: true, startedAt: true, planDayId: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.workoutSession.count({ where: { userId } }),
    // Calendar bookings from the start of this week to two months out.
    prisma.scheduledWorkout.findMany({
      where: { userId, date: { gte: localDayKey(weekStart, tzOffset), lte: localDayKey(addDays(now, 60), tzOffset) } },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
      include: {
        planDay: { select: { id: true, name: true, planId: true, _count: { select: { exercises: true } } } },
        session: { select: { id: true } },
      },
    }),
  ]);

  const scheduledWeekdays = new Map<number, string>();
  for (const d of activePlan?.days ?? []) if (d.weekday !== null) scheduledWeekdays.set(d.weekday, d.name);
  const weeklyTarget = activePlan?.days.length || user.daysPerWeek;
  const bookingsByDate = new Map<string, typeof bookings>();
  for (const b of bookings) bookingsByDate.set(b.date, [...(bookingsByDate.get(b.date) ?? []), b]);

  // ---- This week (Monday to Sunday) -------------------------------------------
  const doneDays = new Set(sessions.map((s) => localDayKey(s.completedAt, tzOffset)));
  const thisWeekSessions = sessions.filter((s) => s.completedAt >= weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const instant = addDays(weekStart, i);
    const key = localDayKey(instant, tzOffset);
    const weekday = localWeekday(instant, tzOffset);
    // A calendar booking overrides the plan's weekly pattern for that day.
    const planned = bookingsByDate.get(key)?.[0]?.name ?? scheduledWeekdays.get(weekday) ?? null;
    let status: DayStatus;
    if (doneDays.has(key)) status = "done";
    else if (key === todayKey) status = planned ? "today" : "rest";
    else if (planned) status = key < todayKey ? "missed" : "planned";
    else status = "rest";
    return { date: key, weekday, status, planDayName: planned };
  });

  // ---- Weekly streak: consecutive weeks hitting the target --------------------------
  const perWeek = new Map<string, number>();
  for (const s of sessions) {
    const k = localDayKey(startOfLocalWeek(s.completedAt, tzOffset), tzOffset);
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  let weekStreak = 0;
  for (let w = 1; w < 105; w++) {
    const k = localDayKey(startOfLocalWeek(addDays(weekStart, -7 * w + 1), tzOffset), tzOffset);
    if ((perWeek.get(k) ?? 0) >= weeklyTarget) weekStreak++;
    else break;
  }
  if (thisWeekSessions.length >= weeklyTarget) weekStreak++;

  // ---- What to do next ------------------------------------------------------------
  type Next = {
    planId: string | null;
    planDayId: string | null;
    scheduledId: string | null;
    name: string;
    weekday: number | null;
    date: string;
    isToday: boolean;
    exerciseCount: number;
  };
  let nextWorkout: Next | null = null;
  const todayDone = doneDays.has(todayKey);
  const todayWeekday = localWeekday(now, tzOffset);

  // 1. Calendar bookings come first: today's unfinished one, else the next upcoming one.
  const openBookings = bookings.filter((b) => !b.session && b.date >= todayKey);
  const firstOpen = openBookings.find((b) => b.date > todayKey || !todayDone);
  if (firstOpen) {
    nextWorkout = {
      planId: firstOpen.planDay?.planId ?? null,
      planDayId: firstOpen.planDay?.id ?? null,
      scheduledId: firstOpen.id,
      name: firstOpen.name,
      weekday: localWeekday(new Date(`${firstOpen.date}T12:00:00Z`), 0),
      date: firstOpen.date,
      isToday: firstOpen.date === todayKey,
      exerciseCount: firstOpen.planDay?._count.exercises ?? 0,
    };
  }

  // 2. Otherwise fall back to the active plan's weekly pattern.
  if (activePlan && activePlan.days.length) {
    const scheduled = activePlan.days.filter((d) => d.weekday !== null);
    const toNext = (d: (typeof activePlan.days)[number], daysAhead: number): Next => ({
      planId: activePlan.id,
      planDayId: d.id,
      scheduledId: null,
      name: d.name,
      weekday: d.weekday,
      date: localDayKey(addDays(now, daysAhead), tzOffset),
      isToday: daysAhead === 0,
      exerciseCount: d._count.exercises,
    });
    let fromPlan: Next | null = null;
    const todays = scheduled.find((d) => d.weekday === todayWeekday);
    if (todays && !todayDone) {
      fromPlan = toNext(todays, 0);
    } else if (scheduled.length) {
      for (let i = 1; i <= 7 && !fromPlan; i++) {
        const d = scheduled.find((x) => x.weekday === (todayWeekday + i) % 7);
        if (d) fromPlan = toNext(d, i);
      }
    } else {
      // Unscheduled plan: rotate through days in order after the last one completed.
      const dayIds = activePlan.days.map((d) => d.id);
      const last = sessions.find((s) => s.planDayId && dayIds.includes(s.planDayId));
      const idx = last ? (dayIds.indexOf(last.planDayId!) + 1) % dayIds.length : 0;
      fromPlan = toNext(activePlan.days[idx], todayDone ? 1 : 0);
    }
    // The plan's pattern wins only when it comes sooner than the next booking.
    if (fromPlan && (!nextWorkout || fromPlan.date < nextWorkout.date)) nextWorkout = fromPlan;
  }

  const monthStartKey = todayKey.slice(0, 7);
  res.json({
    activePlan: activePlan ? { id: activePlan.id, name: activePlan.name, dayCount: activePlan.days.length } : null,
    weeklyTarget,
    thisWeek: { done: thisWeekSessions.length, target: weeklyTarget, days },
    weekStreak,
    todayDone,
    nextWorkout,
    upcoming: openBookings.slice(0, 5).map((b) => ({
      id: b.id,
      date: b.date,
      time: b.time,
      name: b.name,
      planId: b.planDay?.planId ?? null,
      planDayId: b.planDay?.id ?? null,
      exerciseCount: b.planDay?._count.exercises ?? 0,
    })),
    totalWorkouts: totals,
    workoutsThisMonth: sessions.filter((s) => localDayKey(s.completedAt, tzOffset).startsWith(monthStartKey)).length,
    lastWorkout: sessions[0] ? { id: sessions[0].id, name: sessions[0].name, completedAt: sessions[0].completedAt } : null,
  });
});

/** Everything the user has ever logged, rolled up. */
progressRouter.get("/alltime", async (req, res) => {
  const { tzOffset } = tzQuery.parse(req.query);
  const userId = uid(req);
  const now = new Date();
  const [user, sessions, activePlan] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { daysPerWeek: true, createdAt: true } }),
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        completedAt: true,
        sets: { select: { exerciseId: true, reps: true, weightKg: true, durationSec: true, distanceKm: true } },
      },
    }),
    prisma.plan.findFirst({ where: { userId, isActive: true }, select: { _count: { select: { days: true } } } }),
  ]);
  const weeklyTarget = activePlan?._count.days || user.daysPerWeek;

  const exerciseIds = [...new Set(sessions.flatMap((s) => s.sets.map((x) => x.exerciseId)))];
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true, type: true, primaryMuscle: true },
  });
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const minutesOf = (s: { startedAt: Date; completedAt: Date }) => Math.max(1, Math.round((s.completedAt.getTime() - s.startedAt.getTime()) / 60000));
  const totals = { workouts: sessions.length, minutes: 0, sets: 0, reps: 0, volumeKg: 0, distanceKm: 0, cardioMinutes: 0 };
  const muscles = new Map<string, number>();
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const perWeek = new Map<string, number>();
  const perMonth = new Map<string, number>();
  const perExercise = new Map<string, { sessions: Set<string>; sets: number; maxWeightKg: number; best1RMKg: number; longestDistanceKm: number; totalDistanceKm: number }>();
  let longest: { id: string; name: string; date: Date; durationMin: number } | null = null;
  let biggest: { id: string; name: string; date: Date; volumeKg: number } | null = null;
  let farthest: { id: string; name: string; date: Date; distanceKm: number } | null = null;

  for (const s of sessions) {
    const mins = minutesOf(s);
    totals.minutes += mins;
    totals.sets += s.sets.length;
    let vol = 0;
    let dist = 0;
    for (const x of s.sets) {
      totals.reps += x.reps ?? 0;
      vol += (x.reps ?? 0) * (x.weightKg ?? 0);
      dist += x.distanceKm ?? 0;
      totals.cardioMinutes += x.distanceKm ? (x.durationSec ?? 0) / 60 : 0;
      const ex = exerciseById.get(x.exerciseId);
      if (ex) muscles.set(ex.primaryMuscle, (muscles.get(ex.primaryMuscle) ?? 0) + 1);
      const pe = perExercise.get(x.exerciseId) ?? { sessions: new Set<string>(), sets: 0, maxWeightKg: 0, best1RMKg: 0, longestDistanceKm: 0, totalDistanceKm: 0 };
      pe.sessions.add(s.id);
      pe.sets++;
      pe.maxWeightKg = Math.max(pe.maxWeightKg, x.weightKg ?? 0);
      pe.best1RMKg = Math.max(pe.best1RMKg, e1rm(x.weightKg ?? 0, x.reps ?? 0));
      pe.longestDistanceKm = Math.max(pe.longestDistanceKm, x.distanceKm ?? 0);
      pe.totalDistanceKm += x.distanceKm ?? 0;
      perExercise.set(x.exerciseId, pe);
    }
    totals.volumeKg += vol;
    totals.distanceKm += dist;
    byWeekday[localWeekday(s.completedAt, tzOffset)]++;
    const wk = localDayKey(startOfLocalWeek(s.completedAt, tzOffset), tzOffset);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
    const mo = localDayKey(s.completedAt, tzOffset).slice(0, 7);
    perMonth.set(mo, (perMonth.get(mo) ?? 0) + 1);
    if (!longest || mins > longest.durationMin) longest = { id: s.id, name: s.name, date: s.completedAt, durationMin: mins };
    if (vol > 0 && (!biggest || vol > biggest.volumeKg)) biggest = { id: s.id, name: s.name, date: s.completedAt, volumeKg: Math.round(vol) };
    if (dist > 0 && (!farthest || dist > farthest.distanceKm)) farthest = { id: s.id, name: s.name, date: s.completedAt, distanceKm: Math.round(dist * 100) / 100 };
  }

  // Week streaks (consecutive weeks hitting the weekly target), walking back from this week.
  const thisWeekKey = localDayKey(startOfLocalWeek(now, tzOffset), tzOffset);
  const weekKeys = [...perWeek.keys()].sort();
  let currentStreak = 0;
  for (let w = 1; w < 520; w++) {
    const k = localDayKey(startOfLocalWeek(addDays(startOfLocalWeek(now, tzOffset), -7 * w + 1), tzOffset), tzOffset);
    if ((perWeek.get(k) ?? 0) >= weeklyTarget) currentStreak++;
    else break;
  }
  if ((perWeek.get(thisWeekKey) ?? 0) >= weeklyTarget) currentStreak++;
  let longestStreak = 0;
  if (weekKeys.length) {
    let run = 0;
    let cursor = new Date(`${weekKeys[0]}T00:00:00Z`);
    const end = new Date(`${thisWeekKey}T00:00:00Z`);
    while (cursor <= end) {
      const k = cursor.toISOString().slice(0, 10);
      run = (perWeek.get(k) ?? 0) >= weeklyTarget ? run + 1 : 0;
      longestStreak = Math.max(longestStreak, run);
      cursor = addDays(cursor, 7);
    }
  }
  let bestWeek: { weekStart: string; workouts: number } | null = null;
  for (const [weekStart, workouts] of perWeek) if (!bestWeek || workouts > bestWeek.workouts) bestWeek = { weekStart, workouts };

  const first = sessions[0]?.completedAt ?? null;
  const weeksSinceFirst = first ? Math.max(1, (now.getTime() - first.getTime()) / (7 * 86_400_000)) : 0;
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: key, workouts: perMonth.get(key) ?? 0 };
  });

  res.json({
    totals: {
      ...totals,
      volumeKg: Math.round(totals.volumeKg),
      distanceKm: Math.round(totals.distanceKm * 100) / 100,
      cardioMinutes: Math.round(totals.cardioMinutes),
    },
    firstWorkoutAt: first,
    lastWorkoutAt: sessions[sessions.length - 1]?.completedAt ?? null,
    memberSince: user.createdAt,
    activeWeeks: perWeek.size,
    avgPerWeek: first ? Math.round((sessions.length / weeksSinceFirst) * 10) / 10 : 0,
    weeklyTarget,
    currentStreak,
    longestStreak,
    bestWeek,
    longestWorkout: longest,
    biggestVolume: biggest,
    farthest,
    muscles: [...muscles.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
    byWeekday,
    byMonth: months,
    topExercises: [...perExercise.entries()]
      .map(([id, pe]) => ({
        exercise: exerciseById.get(id)!,
        sessions: pe.sessions.size,
        sets: pe.sets,
        maxWeightKg: pe.maxWeightKg,
        best1RMKg: Math.round(pe.best1RMKg * 10) / 10,
        longestDistanceKm: Math.round(pe.longestDistanceKm * 100) / 100,
        totalDistanceKm: Math.round(pe.totalDistanceKm * 100) / 100,
      }))
      .filter((x) => x.exercise)
      .sort((a, b) => b.sessions - a.sessions || b.sets - a.sets)
      .slice(0, 10),
  });
});

progressRouter.get("/weekly", async (req, res) => {
  const q = tzQuery.extend({ weeks: z.coerce.number().int().min(1).max(52).default(12) }).parse(req.query);
  const firstWeek = addDays(startOfLocalWeek(new Date(), q.tzOffset), -7 * (q.weeks - 1));
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: uid(req), completedAt: { gte: firstWeek } },
    select: { startedAt: true, completedAt: true, sets: { select: { reps: true, weightKg: true } } },
  });
  const weeks = Array.from({ length: q.weeks }, (_, i) => ({
    weekStart: localDayKey(addDays(firstWeek, 7 * i), q.tzOffset),
    workouts: 0,
    volumeKg: 0,
    minutes: 0,
  }));
  for (const s of sessions) {
    const idx = Math.floor((s.completedAt.getTime() - firstWeek.getTime()) / (7 * 86_400_000));
    const w = weeks[idx];
    if (!w) continue;
    w.workouts++;
    w.minutes += Math.round((s.completedAt.getTime() - s.startedAt.getTime()) / 60000);
    w.volumeKg += s.sets.reduce((sum, x) => sum + (x.reps ?? 0) * (x.weightKg ?? 0), 0);
  }
  weeks.forEach((w) => (w.volumeKg = Math.round(w.volumeKg)));
  res.json(weeks);
});

/** Exercises the user has logged, most frequent first. */
progressRouter.get("/exercises", async (req, res) => {
  const userId = uid(req);
  const grouped = await prisma.setLog.groupBy({
    by: ["exerciseId"],
    where: { session: { userId } },
    _count: { sessionId: true },
  });
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: grouped.map((g) => g.exerciseId) } },
    select: { id: true, name: true, type: true, primaryMuscle: true },
  });
  const byId = new Map(exercises.map((e) => [e.id, e]));
  res.json(
    grouped
      .map((g) => ({ exercise: byId.get(g.exerciseId)!, setCount: g._count.sessionId }))
      .filter((x) => x.exercise)
      .sort((a, b) => b.setCount - a.setCount),
  );
});

progressRouter.get("/exercise/:id", async (req, res) => {
  const userId = uid(req);
  const exercise = await prisma.exercise.findFirst({
    where: { id: req.params.id, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true, name: true, type: true, primaryMuscle: true, secondaryMuscles: true, equipment: true, instructions: true },
  });
  if (!exercise) throw new HttpError(404, "Exercise not found");
  const sets = await prisma.setLog.findMany({
    where: { exerciseId: exercise.id, session: { userId } },
    select: { sessionId: true, reps: true, weightKg: true, durationSec: true, distanceKm: true, session: { select: { completedAt: true } } },
    orderBy: { session: { completedAt: "asc" } },
  });
  const bySession = new Map<string, typeof sets>();
  for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  const points = [...bySession.entries()].map(([sessionId, ss]) => ({
    sessionId,
    date: ss[0].session.completedAt,
    bestWeightKg: Math.max(0, ...ss.map((s) => s.weightKg ?? 0)),
    bestReps: Math.max(0, ...ss.map((s) => s.reps ?? 0)),
    est1RMKg: Math.round(Math.max(0, ...ss.map((s) => e1rm(s.weightKg ?? 0, s.reps ?? 0))) * 10) / 10,
    volumeKg: Math.round(ss.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0)),
    totalDurationSec: ss.reduce((sum, s) => sum + (s.durationSec ?? 0), 0),
    totalDistanceKm: Math.round(ss.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0) * 100) / 100,
  }));
  const max = (k: keyof (typeof points)[number]) => Math.max(0, ...points.map((p) => p[k] as number));
  res.json({
    exercise,
    points,
    records: {
      maxWeightKg: max("bestWeightKg"),
      best1RMKg: max("est1RMKg"),
      maxReps: max("bestReps"),
      maxVolumeKg: max("volumeKg"),
      longestDistanceKm: max("totalDistanceKm"),
      longestDurationSec: max("totalDurationSec"),
    },
  });
});
