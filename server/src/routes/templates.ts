import { Router } from "express";
import { z } from "zod";
import { TEMPLATE_BY_ID, type WorkoutTemplate } from "../data/templates.js";
import { EXERCISE_BY_ID } from "../data/exercises.js";
import { recommendTemplates } from "../lib/recommend.js";
import { EquipmentEnum, ExperienceEnum, GoalEnum, MuscleEnum } from "../lib/types.js";
import { HttpError } from "../lib/http.js";

export const templatesRouter = Router();

function summary(t: WorkoutTemplate) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    goal: t.goal,
    level: t.level,
    equipment: t.equipment,
    focus: t.focus,
    daysPerWeek: t.days.length,
    dayNames: t.days.map((d) => d.name),
  };
}

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (typeof v === "string" && v ? v.split(",") : undefined), z.array(item).optional());

templatesRouter.get("/", (req, res) => {
  const q = z
    .object({
      goal: GoalEnum.optional(),
      days: z.coerce.number().int().min(1).max(7).optional(),
      equipment: EquipmentEnum.optional(),
      experience: ExperienceEnum.optional(),
      focus: csv(MuscleEnum),
    })
    .parse(req.query);
  const ranked = recommendTemplates({
    goal: q.goal,
    daysPerWeek: q.days,
    equipment: q.equipment,
    experience: q.experience,
    focus: q.focus as never,
  });
  res.json(ranked.map((r) => ({ ...summary(r.template), score: r.score, reasons: r.reasons })));
});

templatesRouter.get("/:id", (req, res) => {
  const t = TEMPLATE_BY_ID.get(req.params.id);
  if (!t) throw new HttpError(404, "Template not found");
  res.json({
    ...summary(t),
    days: t.days.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => {
        const ex = EXERCISE_BY_ID.get(e.exerciseId)!;
        return {
          ...e,
          durationSec: e.durationSec ?? null,
          distanceKm: e.distanceKm ?? null,
          notes: e.notes ?? "",
          exercise: { id: ex.id, name: ex.name, type: ex.type, primaryMuscle: ex.primaryMuscle, equipment: ex.equipment },
        };
      }),
    })),
  });
});
