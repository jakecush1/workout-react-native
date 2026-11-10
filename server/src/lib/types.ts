import { z } from "zod";
import { MUSCLE_GROUPS } from "../data/exercises.js";

export const GoalEnum = z.enum(["LOSE_WEIGHT", "BUILD_MUSCLE", "ENDURANCE", "GENERAL_FITNESS"]);
export const ExperienceEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const EquipmentEnum = z.enum(["FULL_GYM", "DUMBBELLS", "BODYWEIGHT"]);
export const MuscleEnum = z.enum(MUSCLE_GROUPS);

/** Answers from the "help me build a plan" questionnaire. */
export const questionnaireSchema = z.object({
  goal: GoalEnum,
  daysPerWeek: z.number().int().min(1).max(7),
  focusMuscles: z.array(MuscleEnum).max(11).default([]),
  sessionMinutes: z.number().int().min(15).max(150).default(45),
  equipment: EquipmentEnum,
  experience: ExperienceEnum,
  preferredWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  notes: z.string().max(1000).default(""),
  useAI: z.boolean().default(true),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;

export const planExerciseInput = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(20).default("10"),
  restSec: z.number().int().min(0).max(900).default(90),
  durationSec: z.number().int().positive().max(6 * 3600).nullish(),
  distanceKm: z.number().positive().max(500).nullish(),
  notes: z.string().max(500).default(""),
});

export const planDayInput = z.object({
  name: z.string().trim().min(1).max(60),
  weekday: z.number().int().min(0).max(6).nullish(),
  notes: z.string().max(1000).default(""),
  exercises: z.array(planExerciseInput).max(30),
});

export const planInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2000).default(""),
  goal: GoalEnum.nullish(),
  source: z.enum(["MANUAL", "TEMPLATE", "GENERATED", "AI"]).default("MANUAL"),
  templateId: z.string().nullish(),
  activate: z.boolean().default(false),
  days: z.array(planDayInput).min(1).max(7),
});
export type PlanInput = z.infer<typeof planInput>;
export type PlanDayInput = z.infer<typeof planDayInput>;
export type PlanExerciseInput = z.infer<typeof planExerciseInput>;

/** A plan that has been built (by a template, the generator or the AI) but not saved yet. */
export interface PlanDraft {
  name: string;
  description: string;
  goal: Questionnaire["goal"] | null;
  source: "TEMPLATE" | "GENERATED" | "AI";
  templateId?: string | null;
  days: {
    name: string;
    weekday: number | null;
    notes: string;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: string;
      restSec: number;
      durationSec: number | null;
      distanceKm: number | null;
      notes: string;
    }[];
  }[];
}
