// End-to-end check of the API against a running server: npm run test:smoke
const BASE = process.env.API_URL ?? "http://localhost:4000";
let token = "";

async function call<T = any>(method: string, path: string, body?: unknown, expect = [200, 201, 204]): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!expect.includes(res.status)) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : (undefined as T);
}

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error("FAILED: " + msg);
  console.log("  ✓ " + msg);
}

const tz = new Date().getTimezoneOffset();
const email = `smoke+${Date.now()}@example.com`;

console.log("auth");
const reg = await call("POST", "/auth/register", { email, password: "password123", name: "Smoke Test" });
token = reg.token;
check(reg.user.email === email && !("passwordHash" in reg.user), "register returns user without password hash");
await call("POST", "/auth/login", { email, password: "wrong-password" }, [401]);
check(true, "wrong password rejected");
await call("GET", "/me", undefined, [200]);

console.log("profile");
const me = await call("PUT", "/me", { heightCm: 180, weightKg: 82, goal: "BUILD_MUSCLE", experience: "INTERMEDIATE", equipment: "FULL_GYM", daysPerWeek: 4, onboarded: true });
check(me.onboarded && me.weightKg === 82, "profile updated");

console.log("templates");
const templates = await call("GET", `/templates?goal=BUILD_MUSCLE&days=4&equipment=FULL_GYM&experience=INTERMEDIATE&focus=glutes`);
check(templates[0].id === "glutes-legs-focus-4", `best match for glute focus is ${templates[0].id}`);
const bw = await call("GET", `/templates?equipment=BODYWEIGHT`);
check(bw.every((t: any) => t.equipment === "BODYWEIGHT"), "bodyweight users only see bodyweight templates");
const t = await call("GET", "/templates/upper-lower-4");
check(t.days.length === 4 && t.days[0].exercises[0].exercise.name, "template detail includes exercises");

console.log("plans");
const plan = await call("POST", "/plans/from-template", { templateId: "upper-lower-4", weekdays: [1, 2, 4, 5] });
check(plan.isActive && plan.days.length === 4 && plan.days[0].weekday === 1, "template copied into an active plan");

const library = await call("GET", "/exercises");
const secondariesOf = new Map<string, string[]>(library.map((e: any) => [e.id, [e.primaryMuscle, ...(e.secondaryMuscles ?? [])]]));
const CORE_GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "core"];
for (const goal of ["BUILD_MUSCLE", "LOSE_WEIGHT", "ENDURANCE", "GENERAL_FITNESS"]) {
  for (const days of [1, 2, 3, 4, 5, 6, 7]) {
    for (const equipment of ["FULL_GYM", "DUMBBELLS", "BODYWEIGHT"]) {
      const { draft } = await call("POST", "/plans/generate", {
        goal, daysPerWeek: days, equipment, experience: "BEGINNER", focusMuscles: [], sessionMinutes: 45, useAI: false,
      });
      if (draft.days.length !== days) throw new Error(`${goal}/${days}/${equipment}: got ${draft.days.length} days`);
      if (draft.days.some((d: any) => d.exercises.length === 0)) throw new Error(`${goal}/${days}/${equipment}: empty day`);
      const weekdays = draft.days.map((d: any) => d.weekday);
      if (new Set(weekdays).size !== weekdays.length) throw new Error(`${goal}/${days}: duplicate weekdays`);
      // Balanced strength plans must hit every major muscle group across the week.
      if (goal !== "ENDURANCE" && days >= 2) {
        const hit = new Set(draft.days.flatMap((d: any) => d.exercises.flatMap((e: any) => secondariesOf.get(e.exerciseId) ?? [])));
        const required = goal === "LOSE_WEIGHT" ? CORE_GROUPS : [...CORE_GROUPS, "calves"];
        const missing = required.filter((m) => !hit.has(m));
        if (missing.length) throw new Error(`${goal}/${days}/${equipment}: balanced plan misses ${missing.join(", ")}`);
      }
    }
  }
}
check(true, "generator covers every major muscle group (incl. biceps) in balanced plans");

const { draft, notice } = await call("POST", "/plans/generate", {
  goal: "BUILD_MUSCLE", daysPerWeek: 3, equipment: "BODYWEIGHT", experience: "BEGINNER", focusMuscles: [], sessionMinutes: 45, useAI: true,
});
const bodyweightOk = draft.days.every((d: any) => d.exercises.every((e: any) => ["bodyweight", "band", "none"].includes(e.exercise.equipment)));
check(bodyweightOk, `bodyweight plan uses no gym equipment (source: ${draft.source}${notice ? `, notice: "${notice}"` : ""})`);

const saved = await call("POST", "/plans", { ...draft, activate: false });
check(saved.source === draft.source && !saved.isActive, "draft saved as an inactive plan");

const manual = await call("POST", "/plans", {
  name: "My Manual Plan",
  days: [{ name: "Arms", weekday: 3, exercises: [{ exerciseId: "barbell-curl", sets: 3, reps: "10", restSec: 60 }] }],
});
check(manual.days[0].exercises[0].exercise.name === "Barbell Curl", "manual plan created");
await call("POST", "/plans", { name: "Bad", days: [{ name: "X", exercises: [{ exerciseId: "not-real", sets: 3 }] }] }, [400]);
check(true, "unknown exercise rejected");

const updated = await call("PUT", `/plans/${manual.id}`, {
  name: "My Manual Plan v2",
  dayIds: [manual.days[0].id, null],
  days: [
    { name: "Arms", weekday: 3, exercises: [{ exerciseId: "hammer-curl", sets: 4, reps: "12", restSec: 60 }] },
    { name: "Legs", weekday: 6, exercises: [{ exerciseId: "back-squat", sets: 5, reps: "5", restSec: 180 }] },
  ],
});
check(updated.days.length === 2 && updated.days[0].id === manual.days[0].id, "plan edited and kept existing day id");

console.log("workouts");
const day = plan.days[0];
const start = new Date(Date.now() - 50 * 60000);
const w1 = await call("POST", "/workouts", {
  planDayId: day.id,
  name: day.name,
  startedAt: new Date(start.getTime() - 7 * 86400000).toISOString(),
  completedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  exercises: [{ exerciseId: "barbell-bench-press", sets: [{ reps: 6, weightKg: 80 }, { reps: 6, weightKg: 80 }] }],
});
check(w1.prs.length === 0 && w1.workout.volumeKg === 960, "first workout logged (no PR on first attempt)");
const w2 = await call("POST", "/workouts", {
  planDayId: day.id,
  name: day.name,
  startedAt: start.toISOString(),
  completedAt: new Date().toISOString(),
  effort: 8,
  exercises: [
    { exerciseId: "barbell-bench-press", sets: [{ reps: 6, weightKg: 85 }, { reps: 5, weightKg: 85 }] },
    { exerciseId: "easy-run", sets: [{ durationSec: 1200, distanceKm: 3.2 }] },
  ],
});
check(w2.prs.some((p: any) => p.kind === "weight" && p.value === 85), "new personal record detected");

const last = await call("GET", "/workouts/last?exerciseIds=barbell-bench-press,easy-run,deadlift");
check(last["barbell-bench-press"].sets[0].weightKg === 85 && !last.deadlift, "last performance lookup");

const list = await call("GET", "/workouts?limit=1");
check(list.items.length === 1 && list.nextCursor, "history is paginated");
const page2 = await call("GET", `/workouts?limit=1&cursor=${list.nextCursor}`);
check(page2.items[0].id === w1.workout.id && !page2.nextCursor, "second page");
const detail = await call("GET", `/workouts/${w2.workout.id}`);
check(detail.exercises.length === 2 && detail.exercises[0].sets.length === 2, "workout detail groups sets by exercise");
const days = await call("GET", `/workouts/days?tzOffset=${tz}`);
check(Object.keys(days).length === 2, "calendar days");

console.log("progress");
const summary = await call("GET", `/progress/summary?tzOffset=${tz}`);
check(summary.activePlan.id === plan.id && summary.thisWeek.days.length === 7, "summary has active plan and week view");
check(summary.todayDone === true && summary.totalWorkouts === 2, "today marked done");
check(summary.nextWorkout && summary.nextWorkout.isToday === false, `next workout is ${summary.nextWorkout?.name}`);
const weekly = await call("GET", `/progress/weekly?weeks=4&tzOffset=${tz}`);
check(weekly.length === 4 && weekly[3].workouts >= 1, "weekly stats");
const ex = await call("GET", "/progress/exercise/barbell-bench-press");
check(ex.points.length === 2 && ex.records.maxWeightKg === 85, "exercise progress chart data");
const logged = await call("GET", "/progress/exercises");
check(logged.length === 2, "logged exercise list");

console.log("schedule");
const localKey = (d: Date) => new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
const inDays = (n: number) => localKey(new Date(Date.now() + n * 86400000));
const booked = await call("POST", "/schedule", { planDayId: plan.days[1].id, dates: [inDays(1), inDays(3)], time: "18:00", tzOffset: tz });
check(booked.created === 2 && booked.items[0].status === "upcoming" && booked.items[0].name === plan.days[1].name, "booked a plan day on two future dates");
const again = await call("POST", "/schedule", { planDayId: plan.days[1].id, dates: [inDays(1)], tzOffset: tz });
check(again.created === 0 && again.skipped === 1, "same day on the same date isn't booked twice");
await call("POST", "/schedule", { dates: ["not-a-date"] }, [400]);
check(true, "bad dates rejected");
const custom = await call("POST", "/schedule", { name: "Hike", dates: [inDays(0)], tzOffset: tz });
check(custom.items[0].planDayId === null && custom.items[0].status === "today", "named workout booked for today");
const upcoming = await call("GET", `/schedule?from=${inDays(0)}&to=${inDays(10)}&tzOffset=${tz}`);
check(upcoming.length === 3 && upcoming[0].id === custom.items[0].id, "schedule lists bookings in date order");
const summary2 = await call("GET", `/progress/summary?tzOffset=${tz}`);
check(summary2.upcoming.length === 3 && summary2.nextWorkout.scheduledId === booked.items[0].id, "today already done, so next up is tomorrow's booking");
const w3 = await call("POST", "/workouts", {
  planDayId: plan.days[1].id,
  scheduledId: booked.items[0].id,
  tzOffset: tz,
  name: plan.days[1].name,
  startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  completedAt: new Date().toISOString(),
  exercises: [{ exerciseId: "barbell-bench-press", sets: [{ reps: 10, weightKg: 60 }] }],
});
check(w3.scheduledId === booked.items[0].id, "finishing a workout ticks off its booking");
const afterDone = await call("GET", `/schedule?from=${inDays(0)}&to=${inDays(10)}&tzOffset=${tz}`);
check(afterDone.find((s: any) => s.id === booked.items[0].id).status === "done", "booking shows as done");
const moved = await call("PUT", `/schedule/${booked.items[1].id}`, { date: inDays(5), time: null, tzOffset: tz });
check(moved.date === inDays(5) && moved.time === null, "booking moved to another date");
await call("DELETE", `/schedule/${custom.items[0].id}`);
await call("GET", `/schedule/${custom.items[0].id}`, undefined, [404]);
check((await call("GET", `/schedule?from=${inDays(0)}&to=${inDays(10)}&tzOffset=${tz}`)).length === 2, "booking removed");

console.log("all-time stats");
const all = await call("GET", `/progress/alltime?tzOffset=${tz}`);
check(all.totals.workouts === 3 && all.totals.sets === 6 && all.totals.volumeKg === 960 + 935 + 600, "all-time totals");
check(all.totals.distanceKm === 3.2 && all.totals.cardioMinutes === 20, "all-time cardio totals");
check(all.topExercises[0].exercise.id === "barbell-bench-press" && all.topExercises[0].maxWeightKg === 85, "top exercise with best weight");
check(all.muscles[0].muscle === "chest" && all.byMonth.length === 12 && all.byWeekday.reduce((a: number, b: number) => a + b, 0) === 3, "muscle, month and weekday breakdowns");
check(all.biggestVolume.volumeKg === 960 && all.farthest.distanceKm === 3.2 && all.firstWorkoutAt, "best-ever records");

console.log("coach");
const status = await call("GET", "/coach/status");
if (status.available) {
  const chat = await call("POST", "/coach/chat", { messages: [{ role: "user", content: "How many rest days should I take?" }] });
  check(typeof chat.reply === "string" && chat.reply.length > 0, `coach replied (via ${status.provider})`);
} else {
  await call("POST", "/coach/chat", { messages: [{ role: "user", content: "hi" }] }, [503]);
  check(true, "coach reports unavailable cleanly when no AI is set up");
}

console.log("body weight");
await call("POST", "/metrics/body", { weightKg: 81.5 });
const body = await call("GET", "/metrics/body");
check(body.length === 2, "body weight entries (one from profile + one logged)");

console.log("cleanup");
await call("DELETE", `/workouts/${w1.workout.id}`);
await call("DELETE", `/plans/${plan.id}`);
const plans = await call("GET", "/plans");
check(plans.some((p: any) => p.isActive), "another plan becomes active after deleting the active one");
await call("DELETE", "/me");
token = "";
await call("POST", "/auth/login", { email, password: "password123" }, [401]);
check(true, "account deleted");

console.log("\nAll smoke checks passed.");
