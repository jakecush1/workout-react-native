import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uid } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { AiPlanError, coachChat, providerLabel, resolveProvider } from "../lib/ai.js";

export const coachRouter = Router();

coachRouter.get("/status", async (_req, res) => {
  res.json({ available: !!(await resolveProvider()), provider: await providerLabel() });
});

const chatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

coachRouter.post("/chat", async (req, res) => {
  if (!(await resolveProvider())) {
    throw new HttpError(503, "The AI coach isn't set up on this server yet.");
  }
  const { messages } = chatInput.parse(req.body);
  const userId = uid(req);

  const [user, activePlan, recent] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.plan.findFirst({
      where: { userId, isActive: true },
      include: { days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" }, include: { exercise: { select: { name: true } } } } } } },
    }),
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: { name: true, completedAt: true, effort: true },
    }),
  ]);

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const context = [
    "About the person:",
    `- Name: ${user.name}`,
    user.birthYear ? `- Age: ${new Date().getFullYear() - user.birthYear}` : null,
    `- Goal: ${user.goal.replace("_", " ").toLowerCase()} · Experience: ${user.experience.toLowerCase()} · Equipment: ${user.equipment.replace("_", " ").toLowerCase()}`,
    user.weightKg ? `- Weight: ${Math.round(user.weightKg)} kg` : null,
    `- Preferred units: ${user.units === "IMPERIAL" ? "pounds/miles" : "kilograms/kilometers"}`,
    activePlan
      ? `\nActive plan "${activePlan.name}":\n${activePlan.days
          .map((d) => `- ${d.weekday !== null ? weekdays[d.weekday] : "Any day"} · ${d.name}: ${d.exercises.map((e) => e.exercise.name).join(", ")}`)
          .join("\n")}`
      : "\nNo active plan yet.",
    recent.length
      ? `\nRecent workouts:\n${recent.map((w) => `- ${w.name} on ${w.completedAt.toISOString().slice(0, 10)}${w.effort ? ` (effort ${w.effort}/10)` : ""}`).join("\n")}`
      : "\nNo workouts logged yet.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // Keep only the most recent turns to bound prompt size.
    const reply = await coachChat(context, messages.slice(-20));
    res.json({ reply });
  } catch (e) {
    if (e instanceof AiPlanError) throw new HttpError(502, e.message);
    console.error("coach chat failed:", e);
    throw new HttpError(502, "The AI coach couldn't answer right now. Try again in a moment.");
  }
});
