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
| Adaptive Replanner | Deterministic TypeScript — triggers on performance events, re-ranks domains |
| React | React 19 |

**No OpenAI dependency.** All planning and replanning is produced by deterministic engines in `lib/study-plan-engine/` and `lib/adaptive-replanner/`.

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
| `/calendar` | Monthly calendar with task management, session workflow, replanner metadata |
| `/error-log` | Mistake tracking with mastery status |
| `/data` | Score timeline, accuracy charts, session analytics |
| `/info` | About, FAQ, contact form |

All dashboard routes are protected by middleware that checks the Supabase session.

---

## Features — Status

### ✅ Completed

- **Authentication** — sign up, sign in, sign out via Supabase Auth; middleware protects all dashboard routes
- **Onboarding wizard** — 4 steps: basics, domain performance entry, diagnostic analysis, deterministic recommendations; saves user profile, diagnostic test, question sessions, baseline score, welcome notification; triggers initial replanning pass on completion
- **Study Plan Engine** — deterministic day-by-day schedule generator (`lib/study-plan-engine/`); produces one `study_plans` row and per-day `calendar_tasks` rows with College Board QB filters and full replanner metadata
- **Adaptive Replanner** — `lib/adaptive-replanner/`; triggered by question session completion, error log creation, onboarding, and practice/official test score submission; re-ranks all 8 domains, updates future unlocked tasks (difficulty, question count, priority scores), returns per-domain `DomainChange[]` and `predictedScore`; writes audit log
- **Session Workflow** — `SessionWorkflowDialog` on the calendar page: countdown timer (71s/q for R&W, 95s/q for Math, rounded to nearest minute), per-question A/B/C/D answer entry, correct-answer entry after submission, results summary (score, accuracy vs 90% target, time used/overtime), plan-updated screen with specific domain changes and potential score
- **Calendar** — three views (month/week/agenda) with view switcher; task cards color-coded by domain category; clicking any task opens a right-side drawer showing QB filters, step-by-step QB instructions, and expected completion time; drag-and-drop rescheduling updates Supabase immediately; replanner metadata displayed in drawer; practice test completion opens score dialog; session workflow accessible from drawer footer
- **Error Log** — create errors, mark mastered, review count tracking; triggers replanning on creation
- **Data / Analytics** — score timeline, accuracy charts, category stats, session summary cards; practice/official/full_length test score submission triggers replanning
- **Info page** — about section, FAQ accordion, contact form

### 🔜 Not Yet Built

- **"Replan Now" button** — no UI to force a manual replanning pass
- **College Board Workflow page** — visual guide for applying QB filters
- **Notifications UI** — table is populated but no real-time badge/alert
- **Cleanup:** `log-session-dialog.tsx` is superseded by `SessionWorkflowDialog` and can be deleted

---

## Replanner Metadata on `calendar_tasks`

Every plan-generated task carries these fields, updated on each replanning pass:

| Field | Range | Meaning |
|---|---|---|
| `priority_score` | 1–100 | Normalized domain urgency; practice tests = 100 |
| `mastery_target` | 90 (fixed) | Accuracy % target shown to student; practice tests = 0 (N/A) |
| `estimated_score_impact` | 0–n | Potential SAT-point gain from this domain |
| `replanning_weight` | 0–1 | Used by replanner to scale adjustment aggression |
| `replan_locked` | bool | `true` = task completed, replanner must skip |
| `last_replanned_at` | timestamp | When this task was last updated by the replanner |

---

## Key Directories

```
actions/
  auth.ts                  signIn, signUp, signOut
  calendar.ts              CRUD for calendar_tasks; toggleTaskComplete sets replan_locked
  error-logs.ts            CRUD for error_logs; createErrorLog triggers replanning
  onboarding.ts            saveOnboarding; triggers initial replanning after diagnostic insert
  question-sessions.ts     createQuestionSession; triggers replanning; returns DomainChange[] + predictedScore
  score-history.ts         addScoreEntry; triggers replanning for practice/official/full_length
  study-plan.ts            generatePlanFromProfile, generatePlanFromForm
  ai-planner.ts            generateAIStudyPlan (Home page trigger)

app/                       Next.js App Router pages
components/
  calendar/
    day-tasks-panel.tsx            Task list with session dialogs + replanner metadata display
    session-workflow-dialog.tsx    5-phase session UX: idle → active → review → results → plan_updated
    practice-test-score-dialog.tsx Score entry for practice test tasks
    log-session-dialog.tsx         Legacy quick-log dialog (superseded, can be deleted)
  ...

lib/
  study-plan-engine/       Initial schedule generator (see PLANNER_ALGORITHM.md)
  adaptive-replanner/
    index.ts               runAdaptiveReplanner() — main entry point
    types.ts               ReplanTrigger, ReplannerResult, DomainChange, TaskUpdate

supabase/schema.sql        Full Postgres schema + all migration ALTER TABLE statements
types/
  database.ts              Hand-written Supabase types (includes replan_audit_logs)
  index.ts                 App-level type exports
```

---

## Replanner Trigger Map

| Event | Action file | Trigger type |
|---|---|---|
| Question session logged (via SessionWorkflowDialog) | `actions/question-sessions.ts` | `question_session` |
| Error log created | `actions/error-logs.ts` | `error_log` |
| Onboarding completed (diagnostic sessions) | `actions/onboarding.ts` | `question_session` |
| Practice / official / full_length test score added | `actions/score-history.ts` | `practice_test_score` |
