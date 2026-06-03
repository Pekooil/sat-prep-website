# AI Handoff

This document describes the current state of the codebase for the next AI agent picking up this project. Read PROJECT_CONTEXT.md first for the big picture.

---

## What Is Done

### Infrastructure
- Next.js 16.2.7 App Router project at `/Users/darcywang/sat-prep-website`
- Supabase auth + database fully wired (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- Middleware (`middleware.ts`) guards all `/home`, `/calendar`, `/data`, `/error-log`, `/info` routes
- Full Postgres schema deployed (`supabase/schema.sql`) with RLS on all 8 tables
- TypeScript types hand-written in `types/database.ts` matching the schema exactly
- All npm packages installed (Radix UI, Recharts, date-fns, Lucide, clsx/tailwind-merge, etc.)

### Auth
- `actions/auth.ts` — `signIn`, `signUp`, `signOut`
- `/login` and `/signup` pages with forms
- New users get a profile row auto-created via Postgres trigger `on_auth_user_created`

### Onboarding (`/onboarding`)
- 4-step wizard in `components/onboarding/onboarding-wizard.tsx`
  - Step 1: current score, target score, test date, daily study minutes
  - Step 2: domain performance data entry (attempted / correct per domain)
  - Step 3: computed diagnostic analysis display
  - Step 4: deterministic recommendations from `lib/sat-planner.ts`
- On completion, `actions/onboarding.ts → saveOnboarding()` writes:
  - Updated `users` profile row
  - One `diagnostic_tests` row
  - Per-domain `question_sessions` rows (for domains with attempted > 0)
  - One `study_plans` row (summary level, not full day-by-day)
  - One `score_history` row (baseline)
  - One welcome `notifications` row
- Once completed, `has_completed_onboarding = true` prevents re-entry

### Study Plan Engine (`lib/study-plan-engine/`)
The full day-by-day schedule engine. See PLANNER_ALGORITHM.md for the algorithm.

**Entry point:** `StudyPlanEngine` class in `lib/study-plan-engine/index.ts`

```typescript
const engine = new StudyPlanEngine(supabaseClient)
const result = await engine.generate(input)  // StudyPlanEngineResult
```

**Server actions:**
- `actions/study-plan.ts`
  - `generatePlanFromProfile()` — reads user profile + aggregates all question_sessions, then runs engine
  - `generatePlanFromForm(params)` — takes explicit form inputs, still loads real topic performance from DB
- `actions/ai-planner.ts`
  - `generateAIStudyPlan(AIPlanRequest)` — called from `AIPlannerTrigger` on the Home page; converts `hoursPerWeek` → `dailyStudyMinutes`, maps weak area checkboxes → domain keys, delegates to `generatePlanFromForm`

**What the engine writes to DB on each call:**
1. Sets all existing `study_plans` rows for the user to `is_active = false`
2. Inserts one new `study_plans` row (active)
3. Batch-inserts one `calendar_tasks` row per study/review/practice-test block (rest days produce no rows)
4. Returns `StudyPlanEngineResult` with counts and phase summaries

### Calendar (`/calendar`)
- `CalendarClient` renders a monthly grid fetching tasks via `useCalendarTasks` hook
- `DayTasksPanel` shows tasks for a selected date
- `TaskFormDialog` creates/edits tasks
- `actions/calendar.ts` — `createCalendarTask`, `updateCalendarTask`, `toggleTaskComplete`, `deleteCalendarTask`

### Error Log (`/error-log`)
- `ErrorLogClient` lists all errors with filter UI
- `AddErrorDialog` creates new errors (subject, category, error type, description, my answer, correct approach)
- `actions/error-logs.ts` — `createErrorLog`, `updateErrorLog`, `markErrorMastered`, `deleteErrorLog`
- Fields tracked: subject, category, subcategory, error_type (concept/careless/time/strategy/other), description, my_answer, correct_approach, college_board_domain, college_board_skill, mastered, review_count

### Data / Analytics (`/data`)
- Score timeline line chart (Recharts)
- Accuracy bar chart by domain
- Category stats table
- Session summary stat cards
- `AddScoreDialog` for logging new test scores
- `actions/score-history.ts` — `addScoreEntry` (also updates `users.current_score`), `deleteScoreEntry`, `updateUserProfile`

---

## Important Architectural Decisions

1. **No OpenAI.** The planning engine is entirely deterministic TypeScript. `lib/sat-planner.ts` (legacy, used for onboarding Step 4 display only) and `lib/study-plan-engine/` (production engine) both use the same priority-scoring algorithm.

2. **Two planners exist.** `lib/sat-planner.ts` generates `AIOnboardingRec` and `AIStudyPlan` types consumed by the onboarding wizard's Step 4 display. `lib/study-plan-engine/` generates day-by-day `DaySchedule[]` and persists to DB. The onboarding flow currently saves a summary-level plan; if you want the full calendar populated from onboarding, call `StudyPlanEngine.generate()` inside `saveOnboarding()`.

3. **Supabase type casts.** Several actions use `supabase.from('table') as any` to bypass strict TypeScript inference. This is a known workaround for Supabase client type inference with the current hand-written types.

4. **Tailwind CSS v4.** Uses `@import "tailwindcss"` and `@theme inline { }` in `globals.css`. Do NOT use the old `@tailwind base; @tailwind components; @tailwind utilities;` directives.

5. **Next.js 16 params are Promises.** In any dynamic route segment, `params` must be awaited: `const { id } = await params`.

6. **RLS is on.** All 8 tables have Row Level Security enabled. Every query is automatically scoped to the authenticated user via `auth.uid()`. No manual `WHERE user_id =` needed in most cases, but the actions add it explicitly for defense in depth.

---

## Known Gaps / Next Tasks

### High Priority
- **Question session entry form** — there is no UI for logging QB results after a study session. The `question_sessions` table exists and hooks are in place, but no form lets users add sessions from the calendar. This is the most important missing feature for the feedback loop.
- **Onboarding → full calendar plan** — `saveOnboarding()` writes a summary-level `study_plans` row only. A full `StudyPlanEngine` call during onboarding would immediately populate the calendar with day-by-day tasks.

### Medium Priority
- **College Board Workflow page** — a visual step-by-step guide showing how to use the QB filters the app recommends
- **Notifications UI** — the `notifications` table is populated but there's no real-time badge/alert beyond the dropdown stub in the navbar

### Low Priority
- `lib/sat-planner.ts` is a legacy file. Once the onboarding Step 4 is refactored to show the new engine's output, it can be deleted.
- The `study_hours_per_week` column in `users` is maintained in parallel with `daily_study_minutes`. One of them could be computed from the other.

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

See `.env.local.example` for the full template.
