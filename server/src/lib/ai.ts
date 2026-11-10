// AI features (plan generation + coach chat) with pluggable providers.
//
// Free options, picked automatically in this order:
//   ANTHROPIC_API_KEY  -> Claude (paid)
//   OPENAI_BASE_URL    -> any OpenAI-compatible server (set OPENAI_MODEL, optional OPENAI_API_KEY)
//   GROQ_API_KEY       -> Groq free tier
//   GEMINI_API_KEY     -> Google Gemini free tier
//   OPENROUTER_API_KEY -> OpenRouter free models
//   Ollama             -> detected automatically at localhost:11434 (100% free + local)
//
// Claude is called through the official SDK. Everything else speaks the
// OpenAI-compatible /chat/completions shape, which all of the above support.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { EXERCISE_LIBRARY, allowedEquipment } from "../data/exercises.js";
import { assignWeekdays } from "./schedule.js";
import type { PlanDraft, Questionnaire } from "./types.js";

export class AiPlanError extends Error {}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

export type Provider =
  | { kind: "anthropic"; model: string; name: string }
  | { kind: "openai"; baseUrl: string; apiKey: string; model: string; name: string };

const OLLAMA_URL = () => (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");

// Probing Ollama on every request would be wasteful; cache the answer briefly.
let ollamaCache: { at: number; model: string | null } | null = null;

async function detectOllama(): Promise<string | null> {
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;
  if (ollamaCache && Date.now() - ollamaCache.at < 60_000) return ollamaCache.model;
  let model: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${OLLAMA_URL()}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { models?: { name: string }[] };
      model = data.models?.[0]?.name ?? null;
    }
  } catch {
    model = null; // not running
  }
  ollamaCache = { at: Date.now(), model };
  return model;
}

/** Figure out which AI backend to use, if any. */
export async function resolveProvider(): Promise<Provider | null> {
  const env = process.env;
  if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) {
    return { kind: "anthropic", model: env.ANTHROPIC_MODEL ?? "claude-opus-5-5", name: "Claude" };
  }
  if (env.OPENAI_BASE_URL) {
    const model = env.OPENAI_MODEL;
    if (model) return { kind: "openai", baseUrl: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY ?? "none", model, name: "Custom" };
  }
  if (env.GROQ_API_KEY) {
    return {
      kind: "openai",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      name: "Groq",
    };
  }
  if (env.GEMINI_API_KEY) {
    return {
      kind: "openai",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL ?? "gemini-2.5-flash",
      name: "Gemini",
    };
  }
  if (env.OPENROUTER_API_KEY) {
    return {
      kind: "openai",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
      name: "OpenRouter",
    };
  }
  const ollamaModel = await detectOllama();
  if (ollamaModel) {
    return { kind: "openai", baseUrl: `${OLLAMA_URL()}/v1`, apiKey: "ollama", model: ollamaModel, name: "Ollama" };
  }
  return null;
}

export async function providerLabel(): Promise<string | null> {
  const p = await resolveProvider();
  return p ? `${p.name} (${p.model})` : null;
}

let anthropicClient: Anthropic | null = null;
function getAnthropic() {
  anthropicClient ??= new Anthropic({ timeout: 120_000, maxRetries: 1 });
  return anthropicClient;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat call (Ollama, Groq, Gemini, OpenRouter, ...)
// ---------------------------------------------------------------------------

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function openaiChat(
  p: Extract<Provider, { kind: "openai" }>,
  messages: ChatMessage[],
  opts: { responseFormat?: unknown; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  try {
    const res = await fetch(`${p.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        messages,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`${p.name} returned ${res.status}: ${text.slice(0, 300)}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    const data = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${p.name} returned an empty response`);
    return content;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new AiPlanError(`${p.name} timed out`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask for JSON, trying stricter response formats first and degrading gracefully. */
async function openaiJson(
  p: Extract<Provider, { kind: "openai" }>,
  messages: ChatMessage[],
  jsonSchema: Record<string, unknown>,
): Promise<string> {
  const formats: (unknown | undefined)[] = [
    { type: "json_schema", json_schema: { name: "workout_plan", schema: jsonSchema } },
    { type: "json_object" },
    undefined,
  ];
  let lastErr: unknown = null;
  for (const responseFormat of formats) {
    try {
      return await openaiChat(p, messages, { responseFormat, maxTokens: 8000 });
    } catch (e) {
      lastErr = e;
      // A 400 usually means this response_format isn't supported; try the next one.
      if ((e as { status?: number }).status === 400) continue;
      throw e;
    }
  }
  throw lastErr;
}

/** Pull the first JSON object out of a model reply (tolerates code fences and chatter). */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiPlanError("The AI didn't return a plan.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an experienced certified strength and conditioning coach who designs training plans for a workout-tracking app.

Design a plan that fits the person's goal, experience, schedule, equipment and session length. Principles:
- Respect the session length: roughly 8-10 minutes per strength exercise including rest; count run durations directly.
- Beginners: fewer exercises, simple compound movements, moderate volume. Advanced: more volume and variety.
- Train each major muscle group at least twice a week when the schedule allows; balance pushing and pulling.
- Give extra attention to any focus muscle groups without neglecting the rest.
- Weight loss: higher reps, short rests, and conditioning or cardio finishers. Endurance: build the plan around runs (easy, intervals, tempo, long run) plus supportive strength work.
- Order each day with the most demanding compound lifts first.
- Only choose exercises from the provided library, using their exact ids. Never pick exercises that need equipment the person doesn't have.

Field conventions:
- reps is a short string such as "8", "8-12", "10/leg", "AMRAP" or "30s". For timed or cardio work use reps "1" and set durationSec.
- durationSec is seconds per set for timed work (planks, runs, intervals), otherwise null.
- distanceKm is an optional target distance for runs, otherwise null.
- weekday uses 0=Sunday ... 6=Saturday. Spread training days out sensibly and use the person's preferred days when given; otherwise null.
- Keep notes short and practical (cues, pacing, progression). Use an empty string when there is nothing to add.
- The description should be 1-2 sentences telling the person what the plan does and how to progress it.`;

function buildSchema(exerciseIds: [string, ...string[]], daysPerWeek: number) {
  return z.object({
    name: z.string().describe("Short, motivating plan name (max ~40 characters)"),
    description: z.string(),
    days: z
      .array(
        z.object({
          name: z.string().describe("Day label, e.g. 'Push', 'Long Run', 'Full Body A'"),
          weekday: z.number().int().nullable(),
          notes: z.string(),
          exercises: z.array(
            z.object({
              exerciseId: z.enum(exerciseIds),
              sets: z.number().int(),
              reps: z.string(),
              restSec: z.number().int(),
              durationSec: z.number().int().nullable(),
              distanceKm: z.number().nullable(),
              notes: z.string(),
            }),
          ),
        }),
      )
      .describe(`Exactly ${daysPerWeek} training days`),
  });
}

/** Permissive version for open models: ids are plain strings, numbers may arrive loose; we repair after. */
const looseDay = z.object({
  name: z.string().catch("Workout"),
  weekday: z.number().int().nullish().catch(null),
  notes: z.string().catch(""),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string(),
        sets: z.coerce.number().catch(3),
        reps: z.coerce.string().catch("10"),
        restSec: z.coerce.number().catch(90),
        durationSec: z.coerce.number().nullish().catch(null),
        distanceKm: z.coerce.number().nullish().catch(null),
        notes: z.string().catch(""),
      }),
    )
    .catch([]),
});
const looseSchema = z.object({
  name: z.string().catch("My AI Plan"),
  description: z.string().catch(""),
  days: z.array(looseDay),
});

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface UserContext {
  name: string;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
}

function buildPrompts(q: Questionnaire, user: UserContext) {
  const allowed = allowedEquipment(q.equipment);
  const library = EXERCISE_LIBRARY.filter((e) => allowed.has(e.equipment));
  const libraryText = library
    .map((e) => `${e.id} | ${e.name} | ${e.type.toLowerCase()} | ${e.primaryMuscle} | ${e.equipment}`)
    .join("\n");

  const profile = [
    `Name: ${user.name}`,
    user.age ? `Age: ${user.age}` : null,
    user.sex ? `Sex: ${user.sex.toLowerCase()}` : null,
    user.heightCm ? `Height: ${Math.round(user.heightCm)} cm` : null,
    user.weightKg ? `Weight: ${Math.round(user.weightKg)} kg` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const request = [
    `Goal: ${q.goal.replace("_", " ").toLowerCase()}`,
    `Experience: ${q.experience.toLowerCase()}`,
    `Training days per week: ${q.daysPerWeek}`,
    `Session length: about ${q.sessionMinutes} minutes`,
    `Equipment: ${q.equipment.replace("_", " ").toLowerCase()}`,
    `Focus muscle groups: ${q.focusMuscles.length ? q.focusMuscles.join(", ") : "none in particular"}`,
    `Preferred days: ${q.preferredWeekdays.length ? q.preferredWeekdays.map((d) => WEEKDAY_NAMES[d]).join(", ") : "no preference"}`,
    q.notes ? `Other notes from the person (injuries, preferences): ${q.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { library, libraryText, profile, request };
}

/** Clamp numbers, trim strings and fix weekdays on whatever the model returned. */
function sanitizeDraft(
  out: { name: string; description: string; days: z.infer<typeof looseDay>[] },
  q: Questionnaire,
): PlanDraft {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
  const days = out.days
    .slice(0, 7)
    .map((d) => ({
      name: (d.name || "Workout").slice(0, 60),
      weekday: d.weekday != null && d.weekday >= 0 && d.weekday <= 6 ? d.weekday : null,
      notes: (d.notes ?? "").slice(0, 1000),
      exercises: d.exercises.slice(0, 30).map((e) => ({
        exerciseId: e.exerciseId,
        sets: clamp(e.sets, 1, 20),
        reps: (e.reps || "10").slice(0, 20),
        restSec: clamp(e.restSec, 0, 900),
        durationSec: e.durationSec && e.durationSec > 0 ? clamp(e.durationSec, 1, 6 * 3600) : null,
        distanceKm: e.distanceKm && e.distanceKm > 0 ? Math.min(e.distanceKm, 500) : null,
        notes: (e.notes ?? "").slice(0, 500),
      })),
    }))
    .filter((d) => d.exercises.length > 0);
  if (days.length === 0) throw new AiPlanError("The AI returned an empty plan.");

  // Fill in any missing or duplicate weekdays with a sensible default schedule.
  const weekdays = days.map((d) => d.weekday);
  const picked = weekdays.filter((w): w is number => w !== null);
  if (new Set(picked).size !== picked.length || weekdays.some((w) => w === null)) {
    const fallback = assignWeekdays(days.length, q.preferredWeekdays);
    days.forEach((d, i) => (d.weekday = fallback[i]));
  }

  return {
    name: (out.name || "My AI Plan").slice(0, 80),
    description: (out.description ?? "").slice(0, 2000),
    goal: q.goal,
    source: "AI",
    days,
  };
}

export async function generatePlanWithAI(q: Questionnaire, user: UserContext): Promise<PlanDraft> {
  const provider = await resolveProvider();
  if (!provider) throw new AiPlanError("No AI provider is configured.");
  const { library, libraryText, profile, request } = buildPrompts(q, user);
  const ids = library.map((e) => e.id) as [string, ...string[]];
  const userMessage = `Profile:\n${profile}\n\nWhat they asked for:\n${request}\n\nCreate their weekly plan.`;

  if (provider.kind === "anthropic") {
    const schema = buildSchema(ids, q.daysPerWeek);
    const response = await getAnthropic().beta.messages.parse({
      model: provider.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "text",
          text: `Exercise library (id | name | type | primary muscle | equipment):\n${libraryText}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    if (response.stop_reason === "refusal") throw new AiPlanError("The AI declined to create this plan.");
    if (response.stop_reason === "max_tokens") throw new AiPlanError("The AI response was cut off.");
    const out = response.parsed_output;
    if (!out || out.days.length === 0) throw new AiPlanError("The AI returned an empty plan.");
    return sanitizeDraft(out, q);
  }

  // Open models: ask for JSON, then validate + repair hard. Unknown exercise ids are dropped.
  const jsonSchema = z.toJSONSchema(buildSchema(ids, q.daysPerWeek)) as Record<string, unknown>;
  const system = [
    SYSTEM_PROMPT,
    `\nExercise library (id | name | type | primary muscle | equipment):\n${libraryText}`,
    `\nRespond with ONLY a single JSON object, no markdown and no commentary, shaped exactly like:
{"name": string, "description": string, "days": [{"name": string, "weekday": number|null, "notes": string, "exercises": [{"exerciseId": string, "sets": number, "reps": string, "restSec": number, "durationSec": number|null, "distanceKm": number|null, "notes": string}]}]}
Every exerciseId must be copied exactly from the library above. Create exactly ${q.daysPerWeek} days.`,
  ].join("\n");

  let raw: string;
  try {
    raw = await openaiJson(provider, [{ role: "system", content: system }, { role: "user", content: userMessage }], jsonSchema);
  } catch (e) {
    throw e instanceof AiPlanError ? e : new AiPlanError(e instanceof Error ? e.message : "The AI request failed.");
  }

  const parsed = looseSchema.safeParse(extractJson(raw));
  if (!parsed.success) throw new AiPlanError("The AI returned a plan in the wrong shape.");
  const known = new Set(ids);
  const repaired = {
    ...parsed.data,
    days: parsed.data.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => known.has(e.exerciseId)) })),
  };
  return sanitizeDraft(repaired, q);
}

// ---------------------------------------------------------------------------
// Coach chat
// ---------------------------------------------------------------------------

const COACH_SYSTEM = `You are the friendly in-app coach of a workout tracking app. You help with training questions: technique, how to progress, substituting exercises, motivation, simple nutrition basics, recovery and soreness.

Rules:
- Be concise: a few short sentences or a short list. This is a phone chat, not an essay.
- Use the person's profile and plan below to personalize advice, and use their preferred units.
- You can suggest edits to their plan, but tell them to make changes in the Plans tab (you can't edit it yourself).
- No medical diagnoses. For pain (not normal soreness), injuries or health conditions, advise seeing a professional.
- Stay on fitness topics; politely steer other topics back to training.`;

export async function coachChat(context: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const provider = await resolveProvider();
  if (!provider) throw new AiPlanError("No AI provider is configured.");
  const system = `${COACH_SYSTEM}\n\n${context}`;

  if (provider.kind === "anthropic") {
    const response = await getAnthropic().messages.create({
      model: provider.model,
      max_tokens: 1000,
      output_config: { effort: "low" },
      system,
      messages,
    });
    if (response.stop_reason === "refusal") return "Sorry, I can't help with that one. Anything else about your training?";
    return response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  const reply = await openaiChat(provider, [{ role: "system", content: system }, ...messages], {
    maxTokens: 700,
    timeoutMs: 90_000,
  });
  return reply.trim();
}
