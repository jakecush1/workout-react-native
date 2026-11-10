// Shapes returned by the API (see server/src/routes).

export type Goal = "LOSE_WEIGHT" | "BUILD_MUSCLE" | "ENDURANCE" | "GENERAL_FITNESS";
export type Experience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type EquipmentAccess = "FULL_GYM" | "DUMBBELLS" | "BODYWEIGHT";
export type Units = "IMPERIAL" | "METRIC";
export type Sex = "MALE" | "FEMALE" | "OTHER";
export type ExerciseType = "STRENGTH" | "CARDIO" | "MOBILITY";
export type PlanSource = "MANUAL" | "TEMPLATE" | "GENERATED" | "AI";
export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads"
  | "hamstrings" | "glutes" | "calves" | "core" | "full_body";

export interface User {
  id: string;
  email: string;
  name: string;
  birthYear: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  experience: Experience;
  goal: Goal;
  equipment: EquipmentAccess;
  daysPerWeek: number;
  units: Units;
  onboarded: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: string;
  instructions?: string;
  ownerId?: string | null;
}

export interface PlanExercise {
  id?: string;
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  restSec: number;
  durationSec: number | null;
  distanceKm: number | null;
  notes: string;
}

export interface PlanDay {
  id?: string;
  name: string;
  weekday: number | null;
  notes: string;
  exercises: PlanExercise[];
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  goal: Goal | null;
  source: PlanSource;
  templateId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: (PlanDay & { id: string })[];
}

export interface PlanDraft {
  name: string;
  description: string;
  goal: Goal | null;
  source: PlanSource;
  templateId?: string | null;
  days: PlanDay[];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  goal: Goal;
  level: Experience;
  equipment: EquipmentAccess;
  focus: MuscleGroup[];
  daysPerWeek: number;
  dayNames: string[];
  score: number;
  reasons: string[];
}

export interface TemplateDetail extends Omit<TemplateSummary, "score" | "reasons"> {
  days: { name: string; exercises: PlanExercise[] }[];
}

export interface Questionnaire {
  goal: Goal;
  daysPerWeek: number;
  focusMuscles: MuscleGroup[];
  sessionMinutes: number;
  equipment: EquipmentAccess;
  experience: Experience;
  preferredWeekdays: number[];
  notes: string;
  useAI: boolean;
}

export interface SetEntry {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceKm: number | null;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  effort: number | null;
  notes: string;
  planId: string | null;
  planDayId: string | null;
  planName: string | null;
  durationMin: number;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
}

export interface WorkoutDetail extends WorkoutSummary {
  exercises: { exercise: Exercise; sets: SetEntry[] }[];
}

export interface PersonalRecord {
  exerciseId: string;
  name: string;
  kind: "weight" | "e1rm" | "distance";
  value: number;
}

export type DayStatus = "done" | "missed" | "today" | "planned" | "rest";

export interface NextWorkout {
  planId: string | null;
  /** Null for a named booking without a preset exercise list (start it as a freestyle workout). */
  planDayId: string | null;
  scheduledId: string | null;
  name: string;
  weekday: number | null;
  date: string;
  isToday: boolean;
  exerciseCount: number;
}

export interface UpcomingWorkout {
  id: string;
  date: string;
  time: string | null;
  name: string;
  planId: string | null;
  planDayId: string | null;
  exerciseCount: number;
}

export interface ProgressSummary {
  activePlan: { id: string; name: string; dayCount: number } | null;
  weeklyTarget: number;
  thisWeek: { done: number; target: number; days: { date: string; weekday: number; status: DayStatus; planDayName: string | null }[] };
  weekStreak: number;
  todayDone: boolean;
  nextWorkout: NextWorkout | null;
  upcoming: UpcomingWorkout[];
  totalWorkouts: number;
  workoutsThisMonth: number;
  lastWorkout: { id: string; name: string; completedAt: string } | null;
}

export type ScheduledStatus = "done" | "missed" | "today" | "upcoming";

export interface ScheduledWorkout {
  id: string;
  date: string;
  time: string | null;
  name: string;
  notes: string;
  planDayId: string | null;
  planId: string | null;
  planName: string | null;
  exerciseCount: number;
  sessionId: string | null;
  status: ScheduledStatus;
}

export interface AllTimeStats {
  totals: { workouts: number; minutes: number; sets: number; reps: number; volumeKg: number; distanceKm: number; cardioMinutes: number };
  firstWorkoutAt: string | null;
  lastWorkoutAt: string | null;
  memberSince: string;
  activeWeeks: number;
  avgPerWeek: number;
  weeklyTarget: number;
  currentStreak: number;
  longestStreak: number;
  bestWeek: { weekStart: string; workouts: number } | null;
  longestWorkout: { id: string; name: string; date: string; durationMin: number } | null;
  biggestVolume: { id: string; name: string; date: string; volumeKg: number } | null;
  farthest: { id: string; name: string; date: string; distanceKm: number } | null;
  muscles: { muscle: MuscleGroup; sets: number }[];
  byWeekday: number[];
  byMonth: { month: string; workouts: number }[];
  topExercises: {
    exercise: Pick<Exercise, "id" | "name" | "type" | "primaryMuscle">;
    sessions: number;
    sets: number;
    maxWeightKg: number;
    best1RMKg: number;
    longestDistanceKm: number;
    totalDistanceKm: number;
  }[];
}

export interface WeeklyStat {
  weekStart: string;
  workouts: number;
  volumeKg: number;
  minutes: number;
}

export interface ExerciseProgress {
  exercise: Exercise;
  points: {
    sessionId: string;
    date: string;
    bestWeightKg: number;
    bestReps: number;
    est1RMKg: number;
    volumeKg: number;
    totalDurationSec: number;
    totalDistanceKm: number;
  }[];
  records: {
    maxWeightKg: number;
    best1RMKg: number;
    maxReps: number;
    maxVolumeKg: number;
    longestDistanceKm: number;
    longestDurationSec: number;
  };
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
}
