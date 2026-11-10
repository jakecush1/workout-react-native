// Rule-based plan generator. Works offline and is the fallback when the AI is unavailable.

import { EXERCISE_BY_ID, allowedEquipment, type MuscleGroup } from "../data/exercises.js";
import { assignWeekdays } from "./schedule.js";
import type { PlanDraft, Questionnaire } from "./types.js";

type Slot =
  | "squat" | "hinge" | "lunge" | "hpush" | "ipush" | "vpush" | "hpull" | "vpull"
  | "chestIso" | "lateral" | "rear" | "biceps" | "triceps" | "quadIso" | "hamIso"
  | "glute" | "calves" | "core" | "conditioning";

// Candidates per movement slot, best first. The first one the user has equipment for wins,
// preferring exercises not already used elsewhere in the plan so days have variety.
const SLOTS: Record<Slot, string[]> = {
  squat: ["back-squat", "front-squat", "leg-press", "goblet-squat", "bulgarian-split-squat", "bodyweight-squat", "jump-squat"],
  hinge: ["romanian-deadlift", "deadlift", "dumbbell-romanian-deadlift", "hip-thrust", "kettlebell-swing", "single-leg-rdl", "glute-bridge"],
  lunge: ["bulgarian-split-squat", "walking-lunge", "step-up", "reverse-lunge"],
  hpush: ["barbell-bench-press", "dumbbell-bench-press", "machine-chest-press", "push-up"],
  ipush: ["incline-dumbbell-press", "incline-barbell-bench-press", "dips", "diamond-push-up", "incline-push-up"],
  vpush: ["overhead-press", "dumbbell-shoulder-press", "arnold-press", "machine-shoulder-press", "pike-push-up"],
  hpull: ["barbell-row", "seated-cable-row", "dumbbell-row", "t-bar-row", "inverted-row"],
  vpull: ["pull-up", "lat-pulldown", "chin-up", "inverted-row"],
  chestIso: ["cable-crossover", "dumbbell-fly", "dips", "push-up"],
  lateral: ["lateral-raise", "cable-lateral-raise", "pike-push-up"],
  rear: ["face-pull", "rear-delt-fly", "band-pull-apart", "superman"],
  biceps: ["barbell-curl", "dumbbell-curl", "hammer-curl", "cable-curl", "incline-dumbbell-curl", "band-curl", "chin-up"],
  triceps: ["tricep-pushdown", "skull-crusher", "overhead-tricep-extension", "close-grip-bench-press", "diamond-push-up", "bench-dip"],
  quadIso: ["leg-extension", "goblet-squat", "step-up", "wall-sit"],
  hamIso: ["lying-leg-curl", "seated-leg-curl", "dumbbell-romanian-deadlift", "nordic-curl", "single-leg-rdl"],
  glute: ["hip-thrust", "cable-kickback", "glute-bridge", "banded-lateral-walk", "kettlebell-swing"],
  calves: ["standing-calf-raise", "seated-calf-raise", "bodyweight-calf-raise"],
  core: ["hanging-leg-raise", "cable-crunch", "plank", "dead-bug", "russian-twist", "bicycle-crunch", "side-plank"],
  conditioning: ["kettlebell-swing", "burpee", "thruster", "mountain-climber", "jump-squat", "battle-ropes", "jumping-jacks"],
};

const MUSCLE_SLOTS: Record<MuscleGroup, Slot[]> = {
  chest: ["hpush", "ipush", "chestIso"],
  back: ["vpull", "hpull"],
  shoulders: ["vpush", "lateral", "rear"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["squat", "lunge", "quadIso"],
  hamstrings: ["hinge", "hamIso"],
  glutes: ["glute", "lunge"],
  calves: ["calves"],
  core: ["core"],
  full_body: ["conditioning"],
};

type DayKind = "full" | "upper" | "lower" | "push" | "pull" | "legs";
interface DayBlueprint {
  name: string;
  kind: DayKind;
  slots: Slot[];
}

const DAY_MUSCLES: Record<DayKind, MuscleGroup[]> = {
  full: [...(Object.keys(MUSCLE_SLOTS) as MuscleGroup[])],
  upper: ["chest", "back", "shoulders", "biceps", "triceps", "core"],
  lower: ["quads", "hamstrings", "glutes", "calves", "core"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "shoulders"],
  legs: ["quads", "hamstrings", "glutes", "calves", "core"],
};

// Slot order matters: when a session is short only the first few slots are used,
// so arms/core/calves sit right after the main compounds to keep the week balanced.
const FULL_A: DayBlueprint = { name: "Full Body A", kind: "full", slots: ["squat", "hpush", "hpull", "biceps", "core", "lateral", "hamIso", "calves"] };
const FULL_B: DayBlueprint = { name: "Full Body B", kind: "full", slots: ["hinge", "vpush", "vpull", "triceps", "calves", "core", "chestIso", "rear"] };
const FULL_C: DayBlueprint = { name: "Full Body C", kind: "full", slots: ["lunge", "ipush", "hpull", "glute", "calves", "biceps", "rear", "core"] };
const UPPER: DayBlueprint = { name: "Upper Body", kind: "upper", slots: ["hpush", "hpull", "vpush", "vpull", "lateral", "biceps", "triceps", "rear"] };
const LOWER: DayBlueprint = { name: "Lower Body", kind: "lower", slots: ["squat", "hinge", "lunge", "calves", "hamIso", "core", "glute"] };
const PUSH: DayBlueprint = { name: "Push", kind: "push", slots: ["hpush", "vpush", "ipush", "lateral", "triceps", "chestIso", "triceps"] };
const PULL: DayBlueprint = { name: "Pull", kind: "pull", slots: ["vpull", "hpull", "hinge", "rear", "biceps", "hpull", "biceps"] };
const LEGS: DayBlueprint = { name: "Legs", kind: "legs", slots: ["squat", "hinge", "lunge", "calves", "hamIso", "quadIso", "core"] };

function strengthSplit(days: number): { label: string; days: DayBlueprint[] } {
  switch (days) {
    case 1: return { label: "Full Body", days: [FULL_A] };
    case 2: return { label: "Full Body", days: [FULL_A, FULL_B] };
    case 3: return { label: "Full Body", days: [FULL_A, FULL_B, FULL_C] };
    case 4: return { label: "Upper/Lower", days: [{ ...UPPER, name: "Upper A" }, { ...LOWER, name: "Lower A" }, { ...UPPER, name: "Upper B" }, { ...LOWER, name: "Lower B" }] };
    case 5: return { label: "Upper/Lower + PPL", days: [UPPER, LOWER, PUSH, PULL, LEGS] };
    default: return { label: "Push/Pull/Legs", days: [{ ...PUSH, name: "Push A" }, { ...PULL, name: "Pull A" }, { ...LEGS, name: "Legs A" }, { ...PUSH, name: "Push B" }, { ...PULL, name: "Pull B" }, { ...LEGS, name: "Legs B" }] };
  }
}

const HOLD_EXERCISES = new Set(["plank", "side-plank", "wall-sit"]);
// Bodyweight moves most people can't do for high reps. Prescribe "as many as possible" instead.
const HARD_BODYWEIGHT = new Set(["pull-up", "chin-up", "dips", "nordic-curl", "hanging-leg-raise"]);
const TOO_HARD_FOR_BEGINNERS = new Set(["nordic-curl"]);
const ISOLATION_SLOTS = new Set<Slot>(["lateral", "rear", "biceps", "triceps", "quadIso", "hamIso", "calves", "chestIso", "glute"]);

type DraftExercise = PlanDraft["days"][number]["exercises"][number];

function prescribe(exerciseId: string, slot: Slot, index: number, q: Questionnaire): DraftExercise {
  const rx = basePrescription(exerciseId, slot, index, q);
  const minReps = parseInt(rx.reps, 10);
  if (HARD_BODYWEIGHT.has(exerciseId) && minReps > 8) {
    return { ...rx, reps: "AMRAP", notes: "As many good reps as you can. Use a band or slow negatives if needed." };
  }
  return rx;
}

function basePrescription(exerciseId: string, slot: Slot, index: number, q: Questionnaire): DraftExercise {
  const base = { exerciseId, durationSec: null, distanceKm: null, notes: "" };
  if (HOLD_EXERCISES.has(exerciseId)) {
    const seconds = q.experience === "BEGINNER" ? 30 : q.experience === "INTERMEDIATE" ? 45 : 60;
    return { ...base, sets: 3, reps: "1", restSec: 45, durationSec: seconds };
  }
  const isMain = index < 2 && !ISOLATION_SLOTS.has(slot);
  const isIso = ISOLATION_SLOTS.has(slot) || slot === "core";

  switch (q.goal) {
    case "BUILD_MUSCLE":
      if (isMain) return { ...base, sets: q.experience === "BEGINNER" ? 3 : 4, reps: "6-10", restSec: 150 };
      if (isIso) return { ...base, sets: 3, reps: "12-15", restSec: 60 };
      return { ...base, sets: 3, reps: "8-12", restSec: 90 };
    case "LOSE_WEIGHT":
      return { ...base, sets: 3, reps: isIso ? "15-20" : "12-15", restSec: 45 };
    case "ENDURANCE":
      return { ...base, sets: isMain ? 3 : 2, reps: "10-12", restSec: 60 };
    case "GENERAL_FITNESS":
    default:
      if (isMain) return { ...base, sets: 3, reps: "8-10", restSec: 120 };
      return { ...base, sets: 3, reps: "10-12", restSec: 75 };
  }
}

class Picker {
  private used = new Set<string>();
  constructor(
    private allowed: Set<string>,
    private excluded: Set<string> = new Set(),
  ) {}

  pick(slot: Slot, avoid: Set<string>): string | null {
    const candidates = SLOTS[slot].filter((id) => {
      const ex = EXERCISE_BY_ID.get(id);
      return ex && this.allowed.has(ex.equipment) && !avoid.has(id) && !this.excluded.has(id);
    });
    const fresh = candidates.find((id) => !this.used.has(id));
    const choice = fresh ?? candidates[0] ?? null;
    if (choice) this.used.add(choice);
    return choice;
  }
}

function exerciseCount(minutes: number) {
  return Math.max(3, Math.min(8, Math.round(minutes / 10)));
}

function buildStrengthDay(
  bp: DayBlueprint,
  q: Questionnaire,
  picker: Picker,
  count: number,
): PlanDraft["days"][number] {
  // Put the user's focus muscles right after the first two main lifts.
  const focusSlots = q.focusMuscles
    .filter((m) => DAY_MUSCLES[bp.kind].includes(m))
    .map((m) => MUSCLE_SLOTS[m].find((s) => !bp.slots.slice(0, 2).includes(s)) ?? MUSCLE_SLOTS[m][0]);
  const slots: Slot[] = [...bp.slots.slice(0, 2), ...focusSlots, ...bp.slots.slice(2)];

  const chosen: DraftExercise[] = [];
  const inDay = new Set<string>();
  for (const slot of slots) {
    if (chosen.length >= count) break;
    const id = picker.pick(slot, inDay);
    if (!id) continue;
    inDay.add(id);
    chosen.push(prescribe(id, slot, chosen.length, q));
  }
  return { name: bp.name, weekday: null, notes: "", exercises: chosen };
}

function finisher(q: Questionnaire): DraftExercise {
  const gym = q.equipment === "FULL_GYM";
  const id = gym ? "rowing-machine" : q.equipment === "DUMBBELLS" ? "jump-rope" : "interval-run";
  return {
    exerciseId: id,
    sets: 1,
    reps: "1",
    restSec: 0,
    durationSec: 12 * 60,
    distanceKm: null,
    notes: "Finisher: 30 s hard / 30 s easy",
  };
}

const RUN_DOSES = {
  BEGINNER: { easy: 20, long: 30, tempo: 20, intervals: { reps: 6, work: 60 } },
  INTERMEDIATE: { easy: 35, long: 60, tempo: 30, intervals: { reps: 6, work: 180 } },
  ADVANCED: { easy: 45, long: 90, tempo: 40, intervals: { reps: 8, work: 180 } },
} as const;

function runDay(kind: "easy" | "long" | "tempo" | "intervals", q: Questionnaire): PlanDraft["days"][number] {
  const dose = RUN_DOSES[q.experience];
  const ex = (exerciseId: string, durationMin: number, notes: string, sets = 1, restSec = 0): DraftExercise => ({
    exerciseId, sets, reps: "1", restSec, durationSec: durationMin * 60, distanceKm: null, notes,
  });
  switch (kind) {
    case "easy":
      return { name: "Easy Run", weekday: null, notes: "", exercises: [ex("easy-run", dose.easy, "Conversational pace"), prescribe("bodyweight-calf-raise", "calves", 2, q)] };
    case "long":
      return { name: "Long Run", weekday: null, notes: "Add ~10% time each week; cut back every 4th week.", exercises: [ex("long-run", dose.long, "Slow and steady"), { exerciseId: "hip-flexor-stretch", sets: 2, reps: "45s/side", restSec: 15, durationSec: null, distanceKm: null, notes: "" }] };
    case "tempo":
      return { name: "Tempo Run", weekday: null, notes: "", exercises: [ex("easy-run", 10, "Warm-up"), ex("tempo-run", dose.tempo, "Comfortably hard"), ex("walk", 5, "Cool-down")] };
    case "intervals":
      return {
        name: "Intervals",
        weekday: null,
        notes: "",
        exercises: [
          ex("easy-run", 10, "Warm-up"),
          { exerciseId: "interval-run", sets: dose.intervals.reps, reps: "1", restSec: 90, durationSec: dose.intervals.work, distanceKm: null, notes: "Hard effort, easy jog between" },
          ex("walk", 5, "Cool-down"),
        ],
      };
  }
}

function enduranceDays(q: Questionnaire, picker: Picker, count: number): PlanDraft["days"] {
  const runPattern: Record<number, ("easy" | "long" | "tempo" | "intervals")[]> = {
    1: ["long"],
    2: ["easy", "long"],
    3: ["easy", "intervals", "long"],
    4: ["easy", "intervals", "long"],
    5: ["easy", "intervals", "tempo", "long"],
    6: ["easy", "intervals", "tempo", "long"],
    7: ["easy", "intervals", "easy", "tempo", "long"],
  };
  const runs = runPattern[q.daysPerWeek].map((k) => runDay(k, q));
  const strengthCount = q.daysPerWeek - runs.length;
  const strength = [FULL_A, FULL_B].slice(0, strengthCount).map((bp) =>
    buildStrengthDay({ ...bp, name: bp === FULL_A ? "Strength A" : "Strength B" }, q, picker, Math.min(count, 5)),
  );
  // Interleave: run, strength, run, ... with the long run last.
  const long = runs.pop()!;
  const out: PlanDraft["days"] = [];
  while (runs.length || strength.length) {
    if (runs.length) out.push(runs.shift()!);
    if (strength.length) out.push(strength.shift()!);
  }
  out.push(long);
  return out;
}

const GOAL_LABEL: Record<Questionnaire["goal"], string> = {
  LOSE_WEIGHT: "Fat Loss",
  BUILD_MUSCLE: "Muscle Building",
  ENDURANCE: "Endurance",
  GENERAL_FITNESS: "Total Fitness",
};

export function generatePlan(q: Questionnaire): PlanDraft {
  const picker = new Picker(
    new Set(allowedEquipment(q.equipment)),
    q.experience === "BEGINNER" ? TOO_HARD_FOR_BEGINNERS : new Set(),
  );
  const count = exerciseCount(q.sessionMinutes);
  let days: PlanDraft["days"];
  let splitLabel: string;

  if (q.goal === "ENDURANCE") {
    days = enduranceDays(q, picker, count);
    splitLabel = "Run Plan";
  } else {
    const split = strengthSplit(q.daysPerWeek);
    splitLabel = split.label;
    const perDay = q.goal === "LOSE_WEIGHT" ? Math.max(3, count - 1) : count;
    days = split.days.map((bp) => buildStrengthDay(bp, q, picker, perDay));
    if (q.goal === "LOSE_WEIGHT") days.forEach((d) => d.exercises.push(finisher(q)));
    if (q.daysPerWeek === 7) {
      days.push({
        name: "Active Recovery",
        weekday: null,
        notes: "Keep it easy. The goal is to move and recover.",
        exercises: [
          { exerciseId: "walk", sets: 1, reps: "1", restSec: 0, durationSec: 30 * 60, distanceKm: null, notes: "" },
          { exerciseId: "worlds-greatest-stretch", sets: 2, reps: "5/side", restSec: 30, durationSec: null, distanceKm: null, notes: "" },
          { exerciseId: "foam-roll", sets: 1, reps: "1", restSec: 0, durationSec: 5 * 60, distanceKm: null, notes: "" },
        ],
      });
    }
  }

  const weekdays = assignWeekdays(days.length, q.preferredWeekdays);
  days.forEach((d, i) => (d.weekday = weekdays[i]));

  const focus = q.focusMuscles.length
    ? ` with extra work for ${q.focusMuscles.map((m) => m.replace("_", " ")).join(", ")}`
    : "";
  return {
    name: `${GOAL_LABEL[q.goal]} · ${days.length}-Day ${splitLabel}`,
    description: `A ${days.length}-day ${splitLabel.toLowerCase()} at ${q.experience === "INTERMEDIATE" ? "an" : "a"} ${q.experience.toLowerCase()} level, about ${q.sessionMinutes} minutes per session${focus}.`,
    goal: q.goal,
    source: "GENERATED",
    days,
  };
}
