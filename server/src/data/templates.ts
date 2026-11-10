import type { MuscleGroup } from "./exercises.js";

export type GoalKey = "LOSE_WEIGHT" | "BUILD_MUSCLE" | "ENDURANCE" | "GENERAL_FITNESS";
export type AccessKey = "FULL_GYM" | "DUMBBELLS" | "BODYWEIGHT";
export type LevelKey = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  durationSec?: number;
  distanceKm?: number;
  notes?: string;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  goal: GoalKey;
  level: LevelKey;
  /** Minimum equipment needed. A FULL_GYM user can do any template; a BODYWEIGHT user only BODYWEIGHT ones. */
  equipment: AccessKey;
  focus: MuscleGroup[];
  days: TemplateDay[];
}

// Small helpers to keep the template definitions readable.
const s = (exerciseId: string, sets: number, reps: string, restSec = 90, notes?: string): TemplateExercise => ({
  exerciseId,
  sets,
  reps,
  restSec,
  notes,
});
const timed = (exerciseId: string, minutes: number, notes?: string, sets = 1): TemplateExercise => ({
  exerciseId,
  sets,
  reps: "1",
  restSec: 60,
  durationSec: minutes * 60,
  notes,
});
const hold = (exerciseId: string, sets: number, seconds: number, restSec = 45): TemplateExercise => ({
  exerciseId,
  sets,
  reps: "1",
  restSec,
  durationSec: seconds,
});

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: "beginner-full-body-3",
    name: "Beginner Full Body",
    description: "Three full-body sessions a week built around the big lifts. The best place to start in a gym.",
    goal: "BUILD_MUSCLE",
    level: "BEGINNER",
    equipment: "FULL_GYM",
    focus: ["chest", "back", "quads", "hamstrings", "shoulders"],
    days: [
      { name: "Full Body A", exercises: [s("back-squat", 3, "8", 120), s("barbell-bench-press", 3, "8", 120), s("seated-cable-row", 3, "10"), s("dumbbell-shoulder-press", 2, "10"), hold("plank", 3, 30)] },
      { name: "Full Body B", exercises: [s("romanian-deadlift", 3, "8", 120), s("dumbbell-bench-press", 3, "10"), s("lat-pulldown", 3, "10"), s("walking-lunge", 2, "10/leg"), s("dumbbell-curl", 2, "12", 60)] },
      { name: "Full Body C", exercises: [s("leg-press", 3, "10", 120), s("incline-dumbbell-press", 3, "10"), s("dumbbell-row", 3, "10/arm"), s("lateral-raise", 2, "12", 60), s("tricep-pushdown", 2, "12", 60)] },
    ],
  },
  {
    id: "upper-lower-4",
    name: "Upper / Lower Split",
    description: "Four days a week, each muscle trained twice. A proven intermediate muscle-building split.",
    goal: "BUILD_MUSCLE",
    level: "INTERMEDIATE",
    equipment: "FULL_GYM",
    focus: ["chest", "back", "shoulders", "quads", "hamstrings", "glutes"],
    days: [
      { name: "Upper (Strength)", exercises: [s("barbell-bench-press", 4, "6", 150), s("barbell-row", 4, "6", 150), s("overhead-press", 3, "8", 120), s("pull-up", 3, "AMRAP", 120), s("barbell-curl", 2, "10", 60), s("skull-crusher", 2, "10", 60)] },
      { name: "Lower (Strength)", exercises: [s("back-squat", 4, "6", 180), s("romanian-deadlift", 3, "8", 150), s("leg-press", 3, "10", 120), s("lying-leg-curl", 3, "10"), s("standing-calf-raise", 4, "12", 60)] },
      { name: "Upper (Volume)", exercises: [s("incline-dumbbell-press", 3, "10"), s("lat-pulldown", 3, "10"), s("seated-cable-row", 3, "12"), s("lateral-raise", 3, "15", 60), s("face-pull", 3, "15", 60), s("hammer-curl", 3, "12", 60), s("tricep-pushdown", 3, "12", 60)] },
      { name: "Lower (Volume)", exercises: [s("deadlift", 3, "5", 180), s("bulgarian-split-squat", 3, "10/leg"), s("hip-thrust", 3, "10"), s("leg-extension", 3, "12", 60), s("seated-calf-raise", 3, "15", 60), s("hanging-leg-raise", 3, "12", 60)] },
    ],
  },
  {
    id: "push-pull-legs-6",
    name: "Push / Pull / Legs",
    description: "High-frequency six-day split for experienced lifters who want maximum volume.",
    goal: "BUILD_MUSCLE",
    level: "ADVANCED",
    equipment: "FULL_GYM",
    focus: ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings"],
    days: [
      { name: "Push A", exercises: [s("barbell-bench-press", 4, "5-8", 150), s("overhead-press", 3, "8", 120), s("incline-dumbbell-press", 3, "10"), s("lateral-raise", 4, "15", 60), s("tricep-pushdown", 3, "12", 60)] },
      { name: "Pull A", exercises: [s("deadlift", 3, "5", 180), s("pull-up", 4, "8", 120), s("seated-cable-row", 3, "10"), s("face-pull", 3, "15", 60), s("barbell-curl", 3, "10", 60)] },
      { name: "Legs A", exercises: [s("back-squat", 4, "6-8", 180), s("romanian-deadlift", 3, "10", 120), s("leg-press", 3, "12"), s("lying-leg-curl", 3, "12", 60), s("standing-calf-raise", 4, "15", 60)] },
      { name: "Push B", exercises: [s("incline-barbell-bench-press", 4, "8", 120), s("dumbbell-shoulder-press", 3, "10"), s("cable-crossover", 3, "12", 60), s("cable-lateral-raise", 3, "15", 45), s("overhead-tricep-extension", 3, "12", 60)] },
      { name: "Pull B", exercises: [s("barbell-row", 4, "8", 120), s("lat-pulldown", 3, "12"), s("dumbbell-row", 3, "10/arm"), s("rear-delt-fly", 3, "15", 60), s("hammer-curl", 3, "12", 60)] },
      { name: "Legs B", exercises: [s("front-squat", 4, "8", 150), s("hip-thrust", 3, "10", 120), s("bulgarian-split-squat", 3, "10/leg"), s("leg-extension", 3, "15", 60), s("seated-calf-raise", 4, "15", 60)] },
    ],
  },
  {
    id: "body-part-split-5",
    name: "Classic 5-Day Body Part Split",
    description: "One muscle group per day: chest, back, legs, shoulders, arms. Lots of volume per session.",
    goal: "BUILD_MUSCLE",
    level: "INTERMEDIATE",
    equipment: "FULL_GYM",
    focus: ["chest", "back", "shoulders", "biceps", "triceps", "quads"],
    days: [
      { name: "Chest", exercises: [s("barbell-bench-press", 4, "8", 120), s("incline-dumbbell-press", 3, "10"), s("machine-chest-press", 3, "12"), s("cable-crossover", 3, "15", 60), s("dips", 3, "AMRAP")] },
      { name: "Back", exercises: [s("deadlift", 3, "5", 180), s("pull-up", 4, "AMRAP", 120), s("t-bar-row", 3, "10"), s("lat-pulldown", 3, "12"), s("face-pull", 3, "15", 60)] },
      { name: "Legs", exercises: [s("back-squat", 4, "8", 180), s("leg-press", 3, "12", 120), s("romanian-deadlift", 3, "10", 120), s("lying-leg-curl", 3, "12", 60), s("standing-calf-raise", 4, "15", 60)] },
      { name: "Shoulders", exercises: [s("overhead-press", 4, "8", 120), s("arnold-press", 3, "10"), s("lateral-raise", 4, "15", 60), s("rear-delt-fly", 3, "15", 60), s("cable-crunch", 3, "15", 60)] },
      { name: "Arms", exercises: [s("close-grip-bench-press", 3, "8", 120), s("barbell-curl", 3, "10"), s("skull-crusher", 3, "10"), s("incline-dumbbell-curl", 3, "12", 60), s("tricep-pushdown", 3, "12", 60), s("hammer-curl", 3, "12", 60)] },
    ],
  },
  {
    id: "glutes-legs-focus-4",
    name: "Glutes & Legs Focus",
    description: "Lower-body priority program with two glute-focused days and two lighter upper days.",
    goal: "BUILD_MUSCLE",
    level: "INTERMEDIATE",
    equipment: "FULL_GYM",
    focus: ["glutes", "hamstrings", "quads"],
    days: [
      { name: "Glutes & Hamstrings", exercises: [s("hip-thrust", 4, "8-10", 120), s("romanian-deadlift", 3, "10", 120), s("bulgarian-split-squat", 3, "10/leg"), s("cable-kickback", 3, "15/leg", 60), s("lying-leg-curl", 3, "12", 60)] },
      { name: "Upper Body", exercises: [s("dumbbell-bench-press", 3, "10"), s("lat-pulldown", 3, "10"), s("dumbbell-shoulder-press", 3, "10"), s("seated-cable-row", 3, "12"), hold("plank", 3, 45)] },
      { name: "Quads & Glutes", exercises: [s("back-squat", 4, "8", 150), s("leg-press", 3, "12", 120), s("walking-lunge", 3, "12/leg"), s("leg-extension", 3, "15", 60), s("banded-lateral-walk", 3, "15/side", 45)] },
      { name: "Upper Body + Core", exercises: [s("incline-dumbbell-press", 3, "10"), s("dumbbell-row", 3, "10/arm"), s("lateral-raise", 3, "15", 60), s("face-pull", 3, "15", 60), s("hanging-leg-raise", 3, "12", 60)] },
    ],
  },
  {
    id: "arms-shoulders-focus-4",
    name: "Arms & Shoulders Focus",
    description: "Builds bigger arms and rounder shoulders while keeping the rest of the body trained.",
    goal: "BUILD_MUSCLE",
    level: "INTERMEDIATE",
    equipment: "FULL_GYM",
    focus: ["biceps", "triceps", "shoulders"],
    days: [
      { name: "Shoulders & Arms", exercises: [s("overhead-press", 4, "8", 120), s("lateral-raise", 4, "15", 60), s("barbell-curl", 3, "10"), s("skull-crusher", 3, "10"), s("hammer-curl", 3, "12", 60), s("tricep-pushdown", 3, "12", 60)] },
      { name: "Legs", exercises: [s("back-squat", 4, "8", 150), s("romanian-deadlift", 3, "10", 120), s("leg-press", 3, "12"), s("standing-calf-raise", 3, "15", 60)] },
      { name: "Chest, Back & Arms", exercises: [s("dumbbell-bench-press", 3, "10"), s("chin-up", 3, "AMRAP", 120), s("close-grip-bench-press", 3, "10"), s("incline-dumbbell-curl", 3, "12", 60), s("overhead-tricep-extension", 3, "12", 60)] },
      { name: "Shoulders Pump", exercises: [s("arnold-press", 3, "10"), s("cable-lateral-raise", 3, "15", 45), s("rear-delt-fly", 3, "15", 45), s("face-pull", 3, "15", 45), s("cable-curl", 3, "15", 45), s("diamond-push-up", 3, "AMRAP", 60)] },
    ],
  },
  {
    id: "dumbbell-full-body-3",
    name: "Dumbbell-Only Full Body",
    description: "Everything you need with just a pair of dumbbells and a bench. Great for home gyms.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    equipment: "DUMBBELLS",
    focus: ["chest", "back", "quads", "shoulders"],
    days: [
      { name: "Full Body A", exercises: [s("goblet-squat", 3, "10"), s("dumbbell-bench-press", 3, "10"), s("dumbbell-row", 3, "10/arm"), s("dumbbell-shoulder-press", 3, "10"), hold("plank", 3, 30)] },
      { name: "Full Body B", exercises: [s("dumbbell-romanian-deadlift", 3, "10"), s("incline-dumbbell-press", 3, "10"), s("reverse-lunge", 3, "10/leg"), s("hammer-curl", 3, "12", 60), s("overhead-tricep-extension", 3, "12", 60)] },
      { name: "Full Body C", exercises: [s("bulgarian-split-squat", 3, "10/leg"), s("push-up", 3, "AMRAP"), s("dumbbell-row", 3, "12/arm"), s("lateral-raise", 3, "15", 60), s("dead-bug", 3, "10/side", 45)] },
    ],
  },
  {
    id: "fat-burn-circuit-3",
    name: "Fat Burn Circuits",
    description: "Fast-paced dumbbell circuits with short rests plus a conditioning finisher to burn calories.",
    goal: "LOSE_WEIGHT",
    level: "BEGINNER",
    equipment: "DUMBBELLS",
    focus: ["full_body", "core"],
    days: [
      { name: "Circuit A", exercises: [s("goblet-squat", 3, "15", 30), s("push-up", 3, "12", 30), s("dumbbell-row", 3, "12/arm", 30), s("kettlebell-swing", 3, "20", 30), s("mountain-climber", 3, "30s", 30), timed("jump-rope", 10, "Finisher: 30s on / 30s off")] },
      { name: "Circuit B", exercises: [s("walking-lunge", 3, "12/leg", 30), s("dumbbell-shoulder-press", 3, "12", 30), s("dumbbell-romanian-deadlift", 3, "15", 30), s("thruster", 3, "12", 30), s("bicycle-crunch", 3, "20", 30), timed("walk", 20, "Brisk incline walk")] },
      { name: "Circuit C", exercises: [s("step-up", 3, "12/leg", 30), s("incline-dumbbell-press", 3, "12", 30), s("burpee", 3, "10", 45), s("farmers-carry", 3, "40m", 45), s("russian-twist", 3, "20", 30), timed("interval-run", 15, "1 min fast / 1 min easy")] },
    ],
  },
  {
    id: "home-hiit-4",
    name: "No-Equipment HIIT",
    description: "Four short, sweaty bodyweight sessions you can do anywhere. No gym required.",
    goal: "LOSE_WEIGHT",
    level: "BEGINNER",
    equipment: "BODYWEIGHT",
    focus: ["full_body", "core", "quads"],
    days: [
      { name: "Lower Body Burn", exercises: [s("jump-squat", 4, "15", 30), s("reverse-lunge", 4, "12/leg", 30), s("glute-bridge", 4, "20", 30), s("wall-sit", 3, "45s", 30), s("jumping-jacks", 3, "45s", 30)] },
      { name: "Upper Body & Core", exercises: [s("push-up", 4, "AMRAP", 45), s("pike-push-up", 3, "10", 45), s("inverted-row", 3, "10", 45), s("bench-dip", 3, "15", 30), hold("plank", 3, 45, 30), s("bicycle-crunch", 3, "20", 30)] },
      { name: "Full Body HIIT", exercises: [s("burpee", 5, "10", 45), s("mountain-climber", 5, "40s", 20), s("jump-squat", 5, "12", 20), s("push-up", 5, "10", 20), s("jumping-jacks", 5, "40s", 20)] },
      { name: "Cardio & Core", exercises: [timed("interval-run", 20, "1 min hard / 1 min easy"), s("dead-bug", 3, "10/side", 30), hold("side-plank", 3, 30, 20), s("russian-twist", 3, "20", 30)] },
    ],
  },
  {
    id: "bodyweight-strength-3",
    name: "Bodyweight Strength",
    description: "Get strong with calisthenics. Progress by adding reps and harder variations.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    equipment: "BODYWEIGHT",
    focus: ["chest", "back", "quads", "core"],
    days: [
      { name: "Day A", exercises: [s("bodyweight-squat", 4, "20", 60), s("push-up", 4, "AMRAP", 90), s("inverted-row", 4, "10", 90), s("glute-bridge", 3, "15", 60), hold("plank", 3, 45)] },
      { name: "Day B", exercises: [s("reverse-lunge", 3, "12/leg", 60), s("pike-push-up", 3, "8", 90), s("pull-up", 3, "AMRAP", 120, "Use a band or do negatives if needed"), s("single-leg-rdl", 3, "10/leg", 60), s("dead-bug", 3, "10/side", 45)] },
      { name: "Day C", exercises: [s("jump-squat", 3, "10", 60), s("diamond-push-up", 3, "AMRAP", 90), s("chin-up", 3, "AMRAP", 120), s("bodyweight-calf-raise", 3, "20", 45), hold("side-plank", 3, 30)] },
    ],
  },
  {
    id: "couch-to-5k-3",
    name: "Couch to 5K",
    description: "Three runs a week that build you from walk/run intervals to running 5K without stopping.",
    goal: "ENDURANCE",
    level: "BEGINNER",
    equipment: "BODYWEIGHT",
    focus: ["full_body", "calves"],
    days: [
      { name: "Run / Walk Intervals", exercises: [timed("walk", 5, "Warm-up"), timed("interval-run", 20, "Alternate 1 min jog / 90s walk. Add 30s of jogging each week."), timed("walk", 5, "Cool-down")] },
      { name: "Easy Run + Strength", exercises: [timed("easy-run", 20, "Run/walk at an easy, conversational pace"), s("bodyweight-squat", 3, "15", 45), s("glute-bridge", 3, "15", 45), s("bodyweight-calf-raise", 3, "20", 45), hold("plank", 3, 30)] },
      { name: "Longer Run", exercises: [timed("walk", 5, "Warm-up"), { exerciseId: "long-run", sets: 1, reps: "1", restSec: 0, durationSec: 1500, distanceKm: 3, notes: "Slow and steady. Add ~0.5 km each week until you reach 5 km." }, timed("walk", 5, "Cool-down")] },
    ],
  },
  {
    id: "10k-builder-4",
    name: "Run Longer: 10K Builder",
    description: "Four runs a week mixing easy miles, speed work, tempo and a weekly long run to build endurance.",
    goal: "ENDURANCE",
    level: "INTERMEDIATE",
    equipment: "BODYWEIGHT",
    focus: ["full_body", "calves", "quads"],
    days: [
      { name: "Easy Run", exercises: [{ exerciseId: "easy-run", sets: 1, reps: "1", restSec: 0, durationSec: 2100, distanceKm: 5, notes: "Conversational pace" }, s("bodyweight-calf-raise", 3, "20", 45)] },
      { name: "Intervals", exercises: [timed("easy-run", 10, "Warm-up"), { exerciseId: "interval-run", sets: 6, reps: "1", restSec: 90, durationSec: 180, notes: "3 min hard, 90 s easy jog between" }, timed("easy-run", 10, "Cool-down")] },
      { name: "Tempo Run + Core", exercises: [{ exerciseId: "tempo-run", sets: 1, reps: "1", restSec: 0, durationSec: 1800, distanceKm: 6, notes: "10 min easy, 15 min tempo, 5 min easy" }, hold("plank", 3, 45), s("dead-bug", 3, "10/side", 30), hold("side-plank", 2, 30)] },
      { name: "Long Run", exercises: [{ exerciseId: "long-run", sets: 1, reps: "1", restSec: 0, durationSec: 3600, distanceKm: 10, notes: "Easy pace. Add 1 km each week, cut back every 4th week." }, s("hip-flexor-stretch", 2, "45s/side", 15), s("foam-roll", 1, "5 min", 0)] },
    ],
  },
  {
    id: "hybrid-run-strength-4",
    name: "Hybrid: Run + Lift",
    description: "Two runs and two strength days. Build endurance without losing muscle.",
    goal: "ENDURANCE",
    level: "INTERMEDIATE",
    equipment: "FULL_GYM",
    focus: ["full_body", "quads", "back"],
    days: [
      { name: "Strength: Lower + Pull", exercises: [s("back-squat", 4, "6", 150), s("romanian-deadlift", 3, "8", 120), s("pull-up", 3, "AMRAP", 120), s("seated-cable-row", 3, "10"), s("standing-calf-raise", 3, "15", 60)] },
      { name: "Tempo Run", exercises: [{ exerciseId: "tempo-run", sets: 1, reps: "1", restSec: 0, durationSec: 1800, distanceKm: 5, notes: "10 min easy, 15 min tempo, 5 min easy" }] },
      { name: "Strength: Upper + Core", exercises: [s("barbell-bench-press", 4, "6", 150), s("overhead-press", 3, "8", 120), s("dumbbell-row", 3, "10/arm"), s("hanging-leg-raise", 3, "12", 60), s("farmers-carry", 3, "40m", 60)] },
      { name: "Long Run", exercises: [{ exerciseId: "long-run", sets: 1, reps: "1", restSec: 0, durationSec: 3000, distanceKm: 8, notes: "Easy pace. Add 5-10 minutes each week." }] },
    ],
  },
];

export const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));
