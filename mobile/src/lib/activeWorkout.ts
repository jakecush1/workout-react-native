// The workout currently being logged. Persisted so it survives the app being closed.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "./store";
import type { Exercise, PlanDay, SetEntry, Units } from "./types";
import { fromDisplayDistance, fromDisplayWeight, toDisplayDistance, toDisplayWeight } from "./units";

const KEY = "active-workout";

export type InputMode = "weights" | "timed" | "cardio";

export interface LoggedSet {
  id: string;
  weight: string; // display units
  reps: string;
  seconds: string; // timed holds
  minutes: string; // cardio
  distance: string; // display units
  done: boolean;
}

export interface ActiveExercise {
  key: string;
  exercise: Exercise;
  mode: InputMode;
  targetReps: string;
  targetDurationSec: number | null;
  targetDistanceKm: number | null;
  restSec: number;
  notes: string;
  sets: LoggedSet[];
  previous: SetEntry[] | null;
}

export interface ActiveWorkout {
  name: string;
  planId: string | null;
  planDayId: string | null;
  /** The calendar booking this workout fulfils, if it was started from one. */
  scheduledId?: string | null;
  startedAt: string;
  notes: string;
  exercises: ActiveExercise[];
}

export const activeWorkoutStore = createStore<ActiveWorkout | null>(null);
let loaded = false;

export async function loadActiveWorkout() {
  if (loaded) return activeWorkoutStore.get();
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) activeWorkoutStore.set(JSON.parse(raw));
  } catch {
    // ignore corrupt state
  }
  return activeWorkoutStore.get();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
activeWorkoutStore.subscribe(() => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const w = activeWorkoutStore.get();
    void (w ? AsyncStorage.setItem(KEY, JSON.stringify(w)) : AsyncStorage.removeItem(KEY));
  }, 300);
});

export async function clearActiveWorkout() {
  activeWorkoutStore.set(null);
  await AsyncStorage.removeItem(KEY);
}

let idCounter = 0;
export const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Runs, rows, rides: log time + distance. Planks and holds: log seconds. Everything else: weight × reps. */
export function modeFor(exercise: Exercise, durationSec: number | null): InputMode {
  if (exercise.type === "CARDIO" && (exercise.equipment === "none" || exercise.equipment === "machine")) return "cardio";
  if (durationSec) return "timed";
  return "weights";
}

function emptySet(): LoggedSet {
  return { id: newId(), weight: "", reps: "", seconds: "", minutes: "", distance: "", done: false };
}

/** Pre-fill a new set from what was done last time (or the plan target). */
function prefilledSet(ex: Omit<ActiveExercise, "sets">, index: number, units: Units): LoggedSet {
  const s = emptySet();
  const prev = ex.previous?.[index] ?? ex.previous?.[ex.previous.length - 1];
  if (ex.mode === "weights") {
    if (prev?.weightKg) s.weight = String(toDisplayWeight(prev.weightKg, units));
    const numericTarget = /^\d+$/.test(ex.targetReps) ? ex.targetReps : "";
    s.reps = prev?.reps ? String(prev.reps) : numericTarget;
  } else if (ex.mode === "timed") {
    s.seconds = String(prev?.durationSec ?? ex.targetDurationSec ?? "");
  } else {
    const sec = prev?.durationSec ?? ex.targetDurationSec;
    s.minutes = sec ? String(Math.round(sec / 60)) : "";
    const km = prev?.distanceKm ?? ex.targetDistanceKm;
    s.distance = km ? String(toDisplayDistance(km, units)) : "";
  }
  return s;
}

export function buildActiveExercise(
  input: {
    exercise: Exercise;
    sets: number;
    reps: string;
    restSec: number;
    durationSec: number | null;
    distanceKm: number | null;
    notes: string;
  },
  previous: SetEntry[] | null,
  units: Units,
): ActiveExercise {
  const base: Omit<ActiveExercise, "sets"> = {
    key: newId(),
    exercise: input.exercise,
    mode: modeFor(input.exercise, input.durationSec),
    targetReps: input.reps,
    targetDurationSec: input.durationSec,
    targetDistanceKm: input.distanceKm,
    restSec: input.restSec,
    notes: input.notes,
    previous,
  };
  return { ...base, sets: Array.from({ length: Math.max(1, input.sets) }, (_, i) => prefilledSet(base, i, units)) };
}

export function addSet(ex: ActiveExercise, units: Units): ActiveExercise {
  const last = ex.sets[ex.sets.length - 1];
  const next = last ? { ...last, id: newId(), done: false } : prefilledSet(ex, ex.sets.length, units);
  return { ...ex, sets: [...ex.sets, next] };
}

export function startWorkoutFromDay(day: PlanDay & { id?: string }, planId: string | null, previous: Record<string, { sets: SetEntry[] }>, units: Units): ActiveWorkout {
  return {
    name: day.name,
    planId,
    planDayId: day.id ?? null,
    startedAt: new Date().toISOString(),
    notes: "",
    exercises: day.exercises.map((e) => buildActiveExercise(e, previous[e.exerciseId]?.sets ?? null, units)),
  };
}

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Convert completed sets into the API payload. Only sets marked done are saved. */
export function toWorkoutPayload(w: ActiveWorkout, units: Units, extra: { effort: number | null; notes: string }) {
  const exercises = w.exercises
    .map((ex) => ({
      exerciseId: ex.exercise.id,
      sets: ex.sets
        .filter((s) => s.done)
        .map((s) => {
          if (ex.mode === "weights") {
            const weight = num(s.weight);
            return { reps: num(s.reps) !== null ? Math.round(num(s.reps)!) : null, weightKg: weight !== null ? fromDisplayWeight(weight, units) : null };
          }
          if (ex.mode === "timed") return { durationSec: num(s.seconds) !== null ? Math.round(num(s.seconds)!) : null };
          const minutes = num(s.minutes);
          const dist = num(s.distance);
          return {
            durationSec: minutes !== null ? Math.round(minutes * 60) : null,
            distanceKm: dist !== null ? Math.round(fromDisplayDistance(dist, units) * 1000) / 1000 : null,
          };
        }),
    }))
    .filter((e) => e.sets.length > 0);
  return {
    name: w.name,
    planId: w.planId,
    planDayId: w.planDayId,
    scheduledId: w.scheduledId ?? null,
    tzOffset: new Date().getTimezoneOffset(),
    startedAt: w.startedAt,
    completedAt: new Date().toISOString(),
    effort: extra.effort,
    notes: extra.notes,
    exercises,
  };
}
