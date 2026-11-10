import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { requireAuth } from "./lib/auth.js";
import { errorHandler } from "./lib/http.js";
import { providerLabel } from "./lib/ai.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { exercisesRouter } from "./routes/exercises.js";
import { templatesRouter } from "./routes/templates.js";
import { plansRouter } from "./routes/plans.js";
import { workoutsRouter } from "./routes/workouts.js";
import { progressRouter } from "./routes/progress.js";
import { metricsRouter } from "./routes/metrics.js";
import { coachRouter } from "./routes/coach.js";
import { scheduleRouter } from "./routes/schedule.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/health", async (_req, res) => {
    const provider = await providerLabel();
    res.json({ ok: true, ai: !!provider, provider });
  });
  app.use("/auth", authRouter);
  app.use("/templates", requireAuth, templatesRouter);
  app.use("/me", requireAuth, meRouter);
  app.use("/exercises", requireAuth, exercisesRouter);
  app.use("/plans", requireAuth, plansRouter);
  app.use("/workouts", requireAuth, workoutsRouter);
  app.use("/progress", requireAuth, progressRouter);
  app.use("/metrics", requireAuth, metricsRouter);
  app.use("/coach", requireAuth, coachRouter);
  app.use("/schedule", requireAuth, scheduleRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
}
