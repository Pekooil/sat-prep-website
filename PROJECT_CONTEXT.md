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
| `/` | **Public marketing landing page** — hero + Join Wishlist form, three feature blocks, "how it works" strip, closing CTA, footer. Logged-in users are redirected to `/home` by `app/page.tsx`; logged-out users see the landing page. Renders `components/marketing/landing-page.tsx`. The wishlist email form is the only live backend interaction. |
| `/login` | Email/password sign-in |
| `/signup` | Account creation |
| `/onboarding` | 4-step setup wizard (redirects away once completed) |
| `/home` | Dashboard: score cards, upcoming tasks, AI Plan Generator |
| `/calendar` | Month / week / agenda views; color-coded task cards; task drawer with QB filters + instructions; drag-and-drop rescheduling; session workflow |
| `/error-log` | Mistake tracking with mastery status |
| `/data` | Score timeline, accuracy charts, session analytics |
| `/tutorial` | 7-step College Board Question Bank onboarding tutorial; per-step progress tracker (localStorage); collapsible help accordions; FAQ section |
| `/settings` | Notification preferences (email + in-app reminders, timezone, reminder types) |
| `/inventory` | Question Inventory — tracks CB QB available question counts per category; prevents planner over-assignment; admin CRUD + bulk CSV/JSON import |

All dashboard routes are protected by `proxy.ts` (Next.js 16's renamed Middleware) that checks the Supabase session.

> **Removed:** `/info` (About, FAQ, contact form) was deleted in Session 10.

---

## Features — Status

### ✅ Completed

- **Marketing landing page** (`/`) — public, logged-out landing page that replaces the old `/`→`/login` redirect. Built with the "Quiet Monochrome" design tokens and `components/ui` primitives: sticky top bar (logo + Join Wishlist + discreet Sign in), hero with the primary wishlist email form and a brand Saturn visual, three core-feature cards (Adaptive planning / Automated error log / Completely free), a copyright-safe "plan → practice with CB Question Bank → log & adapt" strip, a closing wishlist CTA, and a footer. Fully responsive, dark (default) + light, honors reduced motion. Wires up nothing in the app — the **only** live action is the wishlist email capture (`actions/waitlist.ts` → `waitlist_signups`). `app/page.tsx` keeps the server-side `getUser()` check and still redirects authenticated users to `/home`. The old `/`→`/home` rule in `next.config.ts` was removed so `/` reaches the page
- **Authentication** — sign up, sign in, sign out via Supabase Auth; `proxy.ts` protects all dashboard routes
- **Onboarding wizard** — 4 steps: basics, domain performance entry, diagnostic analysis, deterministic recommendations; saves user profile, diagnostic test, question sessions, baseline score, welcome notification; triggers initial replanning pass on completion
- **Study Plan Engine** — deterministic day-by-day schedule generator (`lib/study-plan-engine/`); each study day produces **two** `calendar_tasks` rows — one R&W domain + one Math domain — each using half the daily study minutes at 90% question-time efficiency; **review days produce one `'Review Session'` task** (no domain blocks); produces one `study_plans` row total with full replanner metadata; **inventory-aware assignment** enforces per-skill question caps, ≥80% time floor, cross-skill substitution by adaptive priority, and bank-complete notifications
- **Adaptive Replanner** — `lib/adaptive-replanner/`; triggered by question session completion, error log creation, onboarding, and practice/official test score submission; re-ranks all 8 domains, updates future unlocked tasks (difficulty, question count, priority scores), returns per-domain `DomainChange[]` and `predictedScore`; writes audit log
- **Session Workflow** — `SessionWorkflowDialog` on the calendar page: 6-phase UX (idle → active → review → results → missed_analysis → plan_updated); countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D answer entry, correct-answer review, results summary; **missed-analysis phase** lets users tag each wrong answer with a subtopic and mistake type (Concept Gap / Careless Error / Timing Issue / Misread Question / Strategy Error) — skippable, auto-creates `error_log` entries; plan-updated screen shows improvement %, topic mastery (5-session rolling avg), replanner domain changes, and potential score
- **Calendar** — three views (month/week/agenda) with view switcher; task cards color-coded by domain category; clicking any task opens a right-side drawer showing QB filters, step-by-step QB instructions, and expected completion time; drag-and-drop rescheduling updates Supabase immediately; replanner metadata displayed in drawer; practice test completion opens score dialog; session workflow accessible from drawer footer; **Review Session** tasks (Saturday review days) open `ReviewSessionDialog` — a dedicated error-log review drawer with inline mastered toggle + edit dialog
- **Error Log** — create errors, mark mastered, review count tracking; triggers replanning on creation
- **Data / Analytics** — score timeline, accuracy charts, category stats, session summary cards; practice/official/full_length test score submission triggers replanning
- **QB Tutorial** (`/tutorial`) — 7-step interactive onboarding walkthrough for the College Board Question Bank workflow; per-step collapsible help Q&A accordions; progress tracker with localStorage persistence and progress bar; FAQ section
- **Settings** (`/settings`) — notification preferences: email + in-app reminder channels, reminder types (daily, overdue, practice test), timezone, test-send button
- **Question Inventory** (`/inventory`) — admin-managed catalog of CB QB available question counts per skill/difficulty; stat cards (available/assigned/completed/remaining); Recharts charts; sortable/filterable/paginated table; CRUD editor; bulk CSV/JSON import; planner reads inventory at plan-generation time to enforce per-skill caps and substitution
- **UI/UX overhaul** — cohesive violet/slate design tokens, Lucide SVG icons throughout (all emoji removed), refined dark mode palette, calendar visual states (past/today/future/task dots), chart tooltip polish

### 🔜 Not Yet Built

- **"Replan Now" button** — `triggerManualReplan()` action exists; no UI entry point yet
- **Notifications real-time badge** — `notifications` table is populated but unread count is not surfaced in the navbar bell in real time
- **QB Tutorial screenshots** — `ScreenshotPlaceholder` components in `tutorial-client.tsx` await real `<Image>` tags pointing to `public/tutorial/step-{1–7}.png`

### 🗑 Dead Code (safe to delete)

- `components/calendar/day-tasks-panel.tsx` + `log-session-dialog.tsx` — legacy, never rendered
- `components/data/topic-rankings.tsx`, `stats-cards.tsx`, `score-timeline.tsx`, `accuracy-chart.tsx`, `category-stats.tsx` — legacy, not imported
- `components/ai-coach/ai-coach-panel.tsx` — route deleted in Session 8, component unused

> **Note:** QB workflow instructions appear in two places: (1) the task drawer on the Calendar page (concise 7-step quick guide per session), and (2) the dedicated `/tutorial` page (full interactive tutorial with help accordions, progress tracking, and FAQ).

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
  calendar.ts              CRUD for calendar_tasks; toggleTaskComplete sets replan_locked;
                           rescheduleCalendarTask updates task_date (drag-and-drop)
  error-logs.ts            CRUD for error_logs; createErrorLog triggers replanning
  onboarding.ts            saveOnboarding; triggers initial replanning after diagnostic insert
  question-inventory.ts    CRUD + bulkImportInventory + getInventoryLimits (planner helper)
  question-sessions.ts     createQuestionSession; triggers replanning; returns DomainChange[] + predictedScore
  score-history.ts         addScoreEntry; triggers replanning for practice/official/full_length
  study-plan.ts            generatePlanFromProfile, generatePlanFromForm
  ai-planner.ts            generateAIStudyPlan (Home page trigger)
  waitlist.ts              joinWaitlist — inserts into waitlist_signups (landing page only;
                           no auth, no app logic; unique email = friendly success)

app/                       Next.js App Router pages
  page.tsx                 Root: redirects logged-in users to /home; renders the marketing
                           LandingPage for logged-out visitors
components/
  marketing/
    landing-page.tsx               Public landing page (client component): hero + wishlist
                                   form, feature cards, how-it-works, closing CTA, footer
  calendar/
    calendar-client.tsx            Orchestrator: month/week/agenda views, drag-and-drop,
                                   drawer + dialog state management; routes 'Review Session'
                                   tasks to ReviewSessionDialog
    task-drawer.tsx                Right-side slide-over: QB filters, QB instructions,
                                   expected time, replanner stats, session launch buttons
    review-session-dialog.tsx      Slide-over for 'Review Session' tasks: shows active error
                                   log entries with inline mastered toggle + EditErrorDialog
    task-colors.ts                 Color map for all 8 SAT domains + Full Practice Test +
                                   Review Session (slate)
    session-workflow-dialog.tsx    6-phase session UX (idle/active/review/results/missed_analysis/plan_updated)
    practice-test-score-dialog.tsx Score entry for practice test tasks (DO NOT MODIFY)
    task-form-dialog.tsx           Manual task creation form
    day-tasks-panel.tsx            LEGACY — not rendered; can be deleted
    log-session-dialog.tsx         LEGACY — superseded; can be deleted
  inventory/
    inventory-client.tsx           Tab orchestrator (Overview / Inventory / Admin)
    summary-cards.tsx              4 stat cards: Available, Assigned, Completed, Remaining
    progress-visualization.tsx     SVG circular progress + section stacked progress bars
    inventory-table.tsx            Sortable/filterable/paginated table
    inventory-charts.tsx           Recharts: by-section bar, by-difficulty bar, depleted-skills bar
    inventory-admin.tsx            CRUD editor + bulk JSON/CSV import
    empty-state.tsx                Empty state with Import + Create buttons
  ...

hooks/
  use-calendar-tasks-range.ts  Loads tasks for any startDate/endDate range
  use-calendar-tasks.ts        Original month-scoped hook (legacy)

lib/
  study-plan-engine/
    index.ts               StudyPlanEngine.generate() — main orchestrator
    scheduler.service.ts   buildSchedule() — day classification, domain rotation, block building
    plan-store.service.ts  PlanStoreService.save() — inventory-aware assignment pipeline;
                           enforces per-skill caps, ≥80% time floor, cross-skill substitution,
                           bank-complete task + notification; returns inventoryExhausted + nearlyExhaustedSkills
    scoring.service.ts     rankDomains(), dailyQuestionTarget(), masteryTargetForDomain()
    difficulty.service.ts  phaseForWeek(), difficultyForSession(), skillFocusForSession()
    domain-catalog.ts      8 SAT domains with CB QB labels, skills, point weights
    types.ts               All engine types including StudyPlanEngineResult
  adaptive-replanner/
    index.ts               runAdaptiveReplanner() — main entry point
    types.ts               ReplanTrigger, ReplannerResult, DomainChange, TaskUpdate

supabase/schema.sql        Full Postgres schema + all migration ALTER TABLE statements
types/
  database.ts              Hand-written Supabase types (includes replan_audit_logs, question_inventory)
  index.ts                 App-level type exports (CalendarTask, CollegeBoardFilter, QuestionInventory, etc.)
```

---

## Replanner Trigger Map

| Event | Action file | Trigger type |
|---|---|---|
| Question session logged (via SessionWorkflowDialog) | `actions/question-sessions.ts` | `question_session` |
| Error log created | `actions/error-logs.ts` | `error_log` |
| Onboarding completed (diagnostic sessions) | `actions/onboarding.ts` | `question_session` |
| Practice / official / full_length test score added | `actions/score-history.ts` | `practice_test_score` |
