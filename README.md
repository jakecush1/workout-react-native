# RepRise: workout plans and tracking

An iPhone app for building workout plans (by hand, from a pre-made template, or with an AI coach), logging workouts set by set, and staying accountable with streaks, weekly goals and reminders.

```
ai-workout-app/
├── mobile/   React Native (Expo SDK 58, expo-router, TypeScript)
├── server/   Node + Express + TypeScript API, Prisma ORM, PostgreSQL
└── docker-compose.yml   Postgres for local development (optional; see below)
```

## Features

- **Profile and onboarding:** name, height, weight, age, goal, experience, equipment, days per week, lb/kg units.
- **Three ways to make a plan:**
  - **Build it for me:** a short questionnaire (goal, days, which weekdays, session length, focus muscles, equipment, notes such as injuries). With any AI provider configured (several free options - see below) the plan is designed by an LLM, restricted to exercises in the app's library and to the equipment you have. Without one, a built-in rule-based generator makes the plan.
  - **Pre-made plans:** 13 templates (beginner full body, upper/lower, push/pull/legs, glutes focus, arms focus, fat-burn circuits, no-equipment HIIT, Couch to 5K, 10K builder, hybrid run + lift, and more), ranked by how well they match your goal, days, experience, equipment and focus muscles.
  - **Build my own:** pick days and exercises from a library of 96 (or add custom ones), and set sets, reps, time and rest.
- **AI coach chat:** ask anything about training, form, soreness or your plan - the coach knows your profile, active plan and recent workouts. Works with the free providers below.
- **Muscle diagrams:** every exercise shows a front/back body image with the muscles it works highlighted - in the exercise picker, the workout logger, workout history and progress screens.
- **Workout logger:** weight × reps, timed holds or time + distance for cardio. Last session's numbers are filled in, a rest timer starts with haptics, you can add exercises mid-workout, and an in-progress workout survives the app being closed.
- **Plans you can change:** edit any plan's days, weekdays, exercises, sets and reps at any time (the **Edit plan** button on a plan); workout history stays linked.
- **Calendar scheduling:** put any plan day (or a custom named workout) on specific dates - one or many at once - with an optional reminder time. The Calendar tab shows done, booked and missed days; tap a day to start, move or remove a booking. Today's "next up" follows your bookings first, then the plan's weekly pattern, and finishing a workout ticks the booking off.
- **Accountability:** a Today screen showing today's workout and what's coming up, a weekly ring and day strip (done, missed, planned), a weekly streak, missed-day nudges, and reminders (weekly on your training days plus one-offs for timed bookings).
- **Progress:** 12-week charts (workouts, minutes, volume), body weight trend, per-exercise charts (estimated 1-rep max, top weight, volume, distance), and personal records celebrated when you finish a workout.
- **All-time stats:** total workouts, hours, volume, sets, reps and distance; current and longest streaks; best week; longest, heaviest and farthest workouts; muscles trained breakdown; favourite weekday; 12-month chart; most-trained exercises.
- **History:** every past workout with set-level detail, from the Calendar tab.

## Running it locally

**Requirements:** Node 20+ and Docker. To use it on a phone, install **Expo Go** from the App Store on your iPhone. The phone and computer must be on the same Wi-Fi.

### 1. Start the API

```bash
cd server
npm install
npm run db:start        # starts Postgres in Docker on port 5433 (or: docker compose up -d from the repo root)
cp .env.example .env    # then set JWT_SECRET (and optionally ANTHROPIC_API_KEY)
npm run setup           # creates the tables and loads the exercise library
npm run dev             # http://localhost:4000
```

#### Turning on the AI (free options)

AI powers the "Build it for me" plan designer and the coach chat. Pick **one** of these - the server uses the first it finds and the log prints which (`AI features: enabled via ...`):

| Option | Cost | Setup |
|---|---|---|
| **Ollama** (recommended local) | Free, runs on your Mac, no account | Install from [ollama.com](https://ollama.com), run `ollama pull llama3.1:8b`, restart the server - it's detected automatically |
| **Groq** (recommended hosted) | Free tier, no card | Make a key at [console.groq.com](https://console.groq.com), set `GROQ_API_KEY` in `server/.env` |
| **Google Gemini** | Free tier | Key from [aistudio.google.com](https://aistudio.google.com), set `GEMINI_API_KEY` |
| **OpenRouter** | Free models | Key from [openrouter.ai](https://openrouter.ai), set `OPENROUTER_API_KEY` |
| **Anthropic Claude** | Paid, best quality | Set `ANTHROPIC_API_KEY` |

Any other OpenAI-compatible server works too (`OPENAI_BASE_URL` + `OPENAI_MODEL`). See `server/.env.example` for all variables. If an AI call fails or returns something invalid, plan generation falls back to the built-in generator and tells the user; the AI can never invent exercises because its output is validated against the exercise library.

### 2. Start the app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with your iPhone camera to open it in Expo Go. The app finds the API automatically, using your computer's IP on port 4000. To point it somewhere else, set `EXPO_PUBLIC_API_URL`, for example `EXPO_PUBLIC_API_URL=https://api.example.com npx expo start`.

On a Mac with Xcode installed you can press `i` to open the iOS Simulator instead. Pressing `w` opens a web preview in the browser.

### 3. Checks

```bash
cd server && npm run test:smoke     # end-to-end API test against the running server (46 checks)
cd server && npm run typecheck
cd mobile && npm run typecheck
```

## How it fits together

- **Auth:** email and password (bcrypt), returning a 90-day JWT that the app stores in the iOS Keychain (`expo-secure-store`).
- **Data model** (`server/prisma/schema.prisma`): `User` (holds the profile), `Exercise` (library plus user-created), `Plan`, `PlanDay` (with an optional weekday), `PlanExercise`, `WorkoutSession`, `SetLog`, `BodyMetric`, `ScheduledWorkout` (a plan day or named workout booked on a calendar date, linked to the session that completed it). All weights and distances are stored in kg and km; the app converts to the user's units.
- **Time zones:** the app sends its time zone offset, so "today", weeks (Monday to Sunday) and streaks follow the user's local calendar.
- **AI plans** (`server/src/lib/ai.ts`): one Claude call with structured JSON output. The schema's `exerciseId` is an enum of library exercises the user has equipment for, so the AI can't invent exercises. Results are clamped and validated, then shown as a draft the user can review, customize or regenerate before saving.
- **Rule-based plans** (`server/src/lib/generator.ts`): picks a split by days per week (full body, upper/lower, PPL), fills movement slots with equipment-appropriate exercises, adds focus-muscle work, and sets sets, reps and rest by goal and experience. Endurance goals get easy, interval, tempo and long runs plus strength days.

### API overview

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Create account / sign in |
| GET, PUT, DELETE | `/me` | Profile |
| GET, POST, DELETE | `/exercises` | Library + custom exercises |
| GET | `/templates`, `/templates/:id` | Pre-made plans, ranked by fit |
| GET, POST, PUT, DELETE | `/plans`, `/plans/:id` | Plans |
| POST | `/plans/:id/activate` | Make a plan active |
| POST | `/plans/from-template` | Copy a template into your plans |
| POST | `/plans/generate` | Questionnaire → draft plan (AI or rule-based) |
| GET, POST, DELETE | `/workouts`, `/workouts/:id` | Log and browse workouts (returns new PRs) |
| GET | `/workouts/last`, `/workouts/days` | Last performance per exercise; calendar days |
| GET | `/progress/summary`, `/progress/weekly`, `/progress/exercises`, `/progress/exercise/:id` | Today screen, charts, records |
| GET | `/progress/alltime` | All-time totals, streaks, bests, breakdowns |
| GET, POST | `/schedule` | List bookings in a date range; book a workout on one or more dates |
| PUT, DELETE | `/schedule/:id` | Move / edit / remove a booking |
| GET, POST, DELETE | `/metrics/body` | Body weight log |
| GET | `/coach/status` | Whether an AI provider is configured |
| POST | `/coach/chat` | AI coach chat (profile + plan aware) |

## Going to production

- **API:** deploy `server/` to any Node host (Render, Fly.io, Railway, etc.) with a managed Postgres. Set `DATABASE_URL`, a long random `JWT_SECRET` and `NODE_ENV=production`, then run `npm run build && npm run db:deploy && npm run db:seed && npm start`. Serve it over HTTPS.
- **App:** set `EXPO_PUBLIC_API_URL` to the HTTPS API URL, change `ios.bundleIdentifier` in `mobile/app.json`, replace the placeholder icon in `mobile/assets/`, then build and submit with `npx eas-cli@latest build -p ios` and `npx eas-cli@latest submit -p ios` (requires an Apple Developer account).
