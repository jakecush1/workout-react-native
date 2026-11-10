import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { createPlan, planInclude, updatePlan } from "../lib/plans.js";
import { planInput, questionnaireSchema, type PlanDraft } from "../lib/types.js";
import { TEMPLATE_BY_ID } from "../data/templates.js";
import { EXERCISE_BY_ID } from "../data/exercises.js";
import { assignWeekdays } from "../lib/schedule.js";
import { generatePlan } from "../lib/generator.js";
import { AiPlanError, generatePlanWithAI, resolveProvider } from "../lib/ai.js";

export const plansRouter = Router();

plansRouter.get("/", async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { userId: uid(req) },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: planInclude,
  });
  res.json(plans);
});

plansRouter.get("/:id", async (req, res) => {
  const plan = await prisma.plan.findFirst({ where: { id: req.params.id, userId: uid(req) }, include: planInclude });
  if (!plan) throw new HttpError(404, "Plan not found");
  res.json(plan);
});

plansRouter.post("/", async (req, res) => {
  const input = planInput.parse(req.body);
  res.status(201).json(await createPlan(uid(req), input));
});

plansRouter.put("/:id", async (req, res) => {
  const input = planInput.extend({ dayIds: z.array(z.string().nullable()).optional() }).parse(req.body);
  res.json(await updatePlan(uid(req), req.params.id, input));
});

plansRouter.delete("/:id", async (req, res) => {
  const userId = uid(req);
  const plan = await prisma.plan.findFirst({ where: { id: req.params.id, userId } });
  if (!plan) throw new HttpError(404, "Plan not found");
  await prisma.plan.delete({ where: { id: plan.id } });
  // Keep one plan active if the user still has any.
  if (plan.isActive) {
    const next = await prisma.plan.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (next) await prisma.plan.update({ where: { id: next.id }, data: { isActive: true } });
  }
  res.status(204).end();
});

plansRouter.post("/:id/activate", async (req, res) => {
  const userId = uid(req);
  const plan = await prisma.plan.findFirst({ where: { id: req.params.id, userId } });
  if (!plan) throw new HttpError(404, "Plan not found");
  await prisma.$transaction([
    prisma.plan.updateMany({ where: { userId }, data: { isActive: false } }),
    prisma.plan.update({ where: { id: plan.id }, data: { isActive: true } }),
  ]);
  res.json(await prisma.plan.findUniqueOrThrow({ where: { id: plan.id }, include: planInclude }));
});

/** Copy a preloaded template into the user's plans. */
plansRouter.post("/from-template", async (req, res) => {
  const body = z
    .object({
      templateId: z.string(),
      weekdays: z.array(z.number().int().min(0).max(6)).optional(),
      activate: z.boolean().default(true),
    })
    .parse(req.body);
  const t = TEMPLATE_BY_ID.get(body.templateId);
  if (!t) throw new HttpError(404, "Template not found");
  const weekdays = assignWeekdays(t.days.length, body.weekdays);
  const plan = await createPlan(uid(req), {
    name: t.name,
    description: t.description,
    goal: t.goal,
    source: "TEMPLATE",
    templateId: t.id,
    activate: body.activate,
    days: t.days.map((d, i) => ({
      name: d.name,
      weekday: weekdays[i],
      notes: "",
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        restSec: e.restSec,
        durationSec: e.durationSec ?? null,
        distanceKm: e.distanceKm ?? null,
        notes: e.notes ?? "",
      })),
    })),
  });
  res.status(201).json(plan);
});

/** Build a plan from questionnaire answers. Returns an unsaved draft for the user to review. */
plansRouter.post("/generate", async (req, res) => {
  const q = questionnaireSchema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) } });

  let draft: PlanDraft | null = null;
  let notice: string | null = null;
  const provider = await resolveProvider();
  if (q.useAI && provider) {
    try {
      draft = await generatePlanWithAI(q, {
        name: user.name,
        age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
        sex: user.sex,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
      });
    } catch (err) {
      console.error("AI plan generation failed:", err);
      notice =
        err instanceof AiPlanError
          ? `${err.message} We built a plan with our standard generator instead.`
          : "The AI coach is unavailable right now, so we built a plan with our standard generator.";
    }
  } else if (q.useAI) {
    notice = "AI isn't set up on this server, so we built a plan with our standard generator. It's free to enable - see the README.";
  }
  draft ??= generatePlan(q);

  // Attach exercise details so the app can preview the draft without extra requests.
  res.json({
    draft: {
      ...draft,
      days: draft.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => {
          const ex = EXERCISE_BY_ID.get(e.exerciseId)!;
          return { ...e, exercise: { id: ex.id, name: ex.name, type: ex.type, primaryMuscle: ex.primaryMuscle, equipment: ex.equipment } };
        }),
      })),
    },
    notice,
  });
});
