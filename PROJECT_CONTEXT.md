# SAT Study Planner — Project Context

## Purpose

A production web application that helps students prepare for the Digital SAT by generating personalized, day-by-day study schedules tied to the College Board Question Bank. The app never stores or displays SAT questions; it only recommends QB filters (domain, skill, difficulty) that students apply on the College Board website.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 — App Router, Server Components, Server Actions |
| Language | TypeScript 5 — strict mode |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` syntax, not `@tailwind base`) |
| UI Components | Radix UI primitives + custom components in `components/ui/` |
| Auth + Database | Supabase (email/password auth, PostgreSQL, Row Level Security) |
| Planning Engine | Deterministic TypeScript — no OpenAI or external AI dependency |
| React | React 19 |

**No OpenAI dependency.** All recommendations and schedule generation are produced by the deterministic engine in `lib/study-plan-engine/`.

---

## Project Location

The project lives at **`/Users/darcywang/sat-prep-website`**, not at `~/Desktop/sat-prep-website`. The Desktop folder only contains stale `.claude` and `.next` directories.

---

## Pages

| Route | Description |
|---|---|
| `/login` | Email/password sign-in |
| `/signup` | Account creation |
| `/onboarding` | 4-step setup wizard (redirects away once completed) |
| `/home` | Dashboard: score cards, upcoming tasks, AI Plan Generator |
| `/calendar` | Monthly calendar with task management |
| `/error-log` | Mistake tracking with mastery status |
| `/data` | Score timeline, accuracy charts, session analytics |
| `/info` | About, FAQ, contact form |

All dashboard routes (`/home`, `/calendar`, `/error-log`, `/data`, `/info`) are protected by middleware that checks Supabase session.

---

## Features — Status

### ✅ Completed

- **Authentication** — sign up, sign in, sign out via Supabase Auth; `middleware.ts` protects dashboard routes and redirects unauthenticated users
- **Onboarding wizard** — 4 steps: (1) basics (current score, target, test date, daily minutes), (2) domain performance entry, (3) diagnostic analysis, (4) deterministic recommendations; saves user profile, diagnostic test, question sessions, baseline score, and welcome notification
- **Study Plan Engine** — deterministic day-by-day schedule generator (`lib/study-plan-engine/`); produces one `study_plans` row and per-day `calendar_tasks` rows with exact College Board QB filters
- **Calendar** — monthly grid, day task panel, task form dialog (create/edit/delete/complete), real-time data via client hooks
- **Error Log** — create errors by subject/category/type, mark mastered, review count tracking, filter and search
- **Data / Analytics** — score progression timeline chart, accuracy by domain bar chart, category performance stats, session summary cards
- **Info page** — about section, FAQ accordion, contact form

### 🔜 Not Yet Built

- Question session entry form (manual logging of QB results after practicing)
- Push / email notifications
- College Board Workflow education page

---

## Key Directories

```
actions/          Server Actions (auth, calendar, error-logs, onboarding,
                  score-history, study-plan, ai-planner)
app/              Next.js App Router pages
components/       React components grouped by feature
hooks/            Client-side Supabase data hooks
lib/
  constants.ts           Domain/skill constants for UI dropdowns
  utils.ts               cn(), date helpers, etc.
  sat-planner.ts         Legacy planner — generates AIOnboardingRec / AIStudyPlan
                         (used only by onboarding Step 4 recommendations display)
  study-plan-engine/     NEW production engine (see PLANNER_ALGORITHM.md)
    index.ts             StudyPlanEngine class — main entry point
    types.ts             Core types
    domain-catalog.ts    8 SAT domains with CB QB labels and skill lists
    scoring.service.ts   rankDomains(), targetAccuracyForScore()
    difficulty.service.ts phaseForWeek(), difficultyForSession()
    scheduler.service.ts buildSchedule() — day-by-day DaySchedule[]
    plan-store.service.ts PlanStoreService.save() — DB persistence
supabase/schema.sql      Full Postgres schema with RLS
types/
  database.ts     Hand-written Supabase type definitions
  index.ts        Exported app-level types
```
