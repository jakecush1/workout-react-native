import type { EquipmentAccess, Experience, Goal, MuscleGroup, PlanSource } from "./types";

export const GOALS: { value: Goal; label: string; blurb: string; icon: string }[] = [
  { value: "BUILD_MUSCLE", label: "Build muscle", blurb: "Get bigger and stronger", icon: "barbell-outline" },
  { value: "LOSE_WEIGHT", label: "Lose weight", blurb: "Burn fat and get lean", icon: "flame-outline" },
  { value: "ENDURANCE", label: "Run longer", blurb: "Build cardio and endurance", icon: "walk-outline" },
  { value: "GENERAL_FITNESS", label: "Get fit overall", blurb: "Feel better and move well", icon: "heart-outline" },
];
export const GOAL_LABEL = Object.fromEntries(GOALS.map((g) => [g.value, g.label])) as Record<Goal, string>;

export const EXPERIENCE: { value: Experience; label: string; blurb: string }[] = [
  { value: "BEGINNER", label: "Beginner", blurb: "New or getting back into it" },
  { value: "INTERMEDIATE", label: "Intermediate", blurb: "Training consistently for 6+ months" },
  { value: "ADVANCED", label: "Advanced", blurb: "Several years of serious training" },
];

export const EQUIPMENT: { value: EquipmentAccess; label: string; blurb: string }[] = [
  { value: "FULL_GYM", label: "Full gym", blurb: "Barbells, machines, cables" },
  { value: "DUMBBELLS", label: "Dumbbells", blurb: "Home gym with dumbbells" },
  { value: "BODYWEIGHT", label: "No equipment", blurb: "Bodyweight only" },
];
export const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT.map((e) => [e.value, e.label])) as Record<EquipmentAccess, string>;

export const MUSCLES: { value: MuscleGroup; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "core", label: "Abs & core" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "calves", label: "Calves" },
  { value: "full_body", label: "Full body / cardio" },
];
export const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map((m) => [m.value, m.label])) as Record<MuscleGroup, string>;

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday-first order for pickers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SOURCE_LABEL: Record<PlanSource, string> = {
  MANUAL: "Custom",
  TEMPLATE: "Template",
  GENERATED: "Generated",
  AI: "AI coach",
};

/** Same defaults the server uses when no days are picked. */
export const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};
