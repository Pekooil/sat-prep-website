# Project Handoff

This document is updated at the end of every session. It records current feature status, known issues, and recommended next steps. Read `AI_HANDOFF.md` for the deep technical reference and `PROJECT_CONTEXT.md` for the full-picture overview.

---

## Last Updated

2026-06-07 (Session 11)

---

## What Was Done This Session

### Session 11 — Question Inventory Page

**New feature:** Full Question Inventory page at `/inventory`.

#### Database
- New table `question_inventory` (global, no user_id) — section, domain, skill, difficulty, available_count
- RLS: authenticated users can read/insert/update/delete
- 29 seed rows covering all 8 SAT domains × all skills × difficulties
- Migration SQL added to `supabase/schema.sql` (Block 6)
- TypeScript types added to `types/database.ts` and `types/index.ts`

#### Server Actions (`actions/question-inventory.ts`)
- `getInventoryWithStats()` — inventory + per-user assigned/completed/remaining computed from calendar_tasks + question_sessions
- `createInventoryItem()`, `updateInventoryItem()`, `deleteInventoryItem()`
- `bulkImportInventory()` — upsert via JSON or CSV, validates section/difficulty/count
- `getInventoryLimits()` — helper for the planner engine

#### Navigation
- Added `Inventory` to desktop nav (`lib/constants.ts` NAV_LINKS)
- Added `QB Stock` link with Package icon to mobile nav

#### Page & Components (`app/(dashboard)/inventory/`, `components/inventory/`)
- `page.tsx` — server component, noStore(), fetches via getInventoryWithStats
- `inventory-client.tsx` — tab orchestrator (Overview / Inventory / Admin)
- `summary-cards.tsx` — 4 stat cards: Available, Assigned, Completed, Remaining
- `progress-visualization.tsx` — SVG circular progress + section stacked progress bars
- `inventory-table.tsx` — sortable, filterable, searchable, paginated table with color-coded Remaining badges
- `inventory-charts.tsx` — Recharts: by-section bar, by-difficulty bar, most-depleted-skills horizontal bar
- `inventory-admin.tsx` — CRUD editor + bulk JSON/CSV import (file upload + paste)
- `empty-state.tsx` — empty state with Import + Create buttons

#### Planner Integration (`lib/study-plan-engine/plan-store.service.ts`)
- `loadInventoryLimits()` — loads inventory map at plan-generation time
- `applyInventoryCap()` — caps StudyBlock question counts against remaining inventory; tracks cumulative per domain+skill+difficulty
- `applyInventoryCapReview()` — same for ReviewBlocks
- Gracefully no-ops if inventory table is empty or unavailable

---

## What Was Done Last Session

### Session 10 — UI/UX Overhaul + Info Page Deletion

#### UI/UX Overhaul (visual-only — no logic/type changes)

**Design system (`app/globals.css`)**
- Refined dark mode palette: `--background: #0c1524`, `--card: #172033`, `--border: #2a3a52`, `--muted: #1a2840`, `--muted-foreground: #8facc8`
- Added `--shadow-violet` CSS var (violet glow drop shadow)
- Added `sp-shimmer` utility class + `sp-fade-in-up` keyframe animation
- Custom `input[type="range"]` thumb styling (violet, shadowed)

**Icon policy — all emoji replaced with Lucide SVG icons**
Every UI emoji was replaced. No emoji remain in rendered component JSX. Toast strings also cleaned up.

| Component | Icons added |
|---|---|
| `notifications-dropdown.tsx` | Clock, Trophy, Radio, Bot |
| `welcome-banner.tsx` | Flame, CalendarDays, Target, PartyPopper |
| `score-card.tsx` | TrendingUp, Target, Sparkles, CalendarCheck, AlertCircle |
| `ai-planner-trigger.tsx` | CheckCircle2 (success state) |
| `consistency-chart.tsx` | Flame (streak display) |
| `notification-prefs.tsx` | ClipboardList, CalendarDays, AlertTriangle, FileText |
| `step-3-analysis.tsx` | AlertTriangle, TrendingUp, CheckCircle2 (LevelBadge) |
| `step-4-recommendations.tsx` | ClipboardList (QB Filters), CheckCircle2 (study tips) |
| `day-tasks-panel.tsx` | ClipboardList (QB Filters label) |
| `error-row.tsx` | CheckCircle2 in Mastered badge and "Mark mastered" button |
| All data chart empty states | Lucide icons in styled containers |
| `tutorial-client.tsx` | `'Critical'` badge text (was `'⚠️ Critical'`) |

**Calendar (`calendar-client.tsx`)**
- Month view: past cells → `bg-slate-50/70 dark:bg-slate-900/40`, muted day numbers; today cell → `bg-violet-50/60 dark:bg-violet-900/10`; future cells with tasks → small violet dot indicator
- Week view: today column → `border-violet-300 dark:border-violet-700`; past column headers muted at `opacity-60`

**Navbar (`navbar.tsx`)**
- Pill nav with `bg-slate-100/80 dark:bg-slate-800/80` frosted glass + ring border
- Active link: white card background + violet text + ring

**Mobile nav (`mobile-nav.tsx`)**
- Active item: `bg-violet-100 dark:bg-violet-900/40` pill

**Chart tooltips (all data charts)**
- Unified `TIP_STYLE` with `boxShadow: '0 4px 12px -2px rgba(15,23,42,0.12)'`

#### Info Page Deletion

- Deleted `app/(dashboard)/info/` (page.tsx, loading.tsx, error.tsx)
- Deleted `components/info/` (about-section.tsx, faq-accordion.tsx, contact-form.tsx)
- Removed `{ href: '/info', label: 'Info & Contact' }` from `NAV_LINKS` in `lib/constants.ts`
- Desktop nav now has 5 links: Home · Calendar · Error Log · Data · Tutorial

---

## Completed Features

### Infrastructure
- Next.js 16.2.7 App Router at `/Users/darcywang/sat-prep-website`
- Supabase auth + database (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `middleware.ts` guards all dashboard routes
- Full Postgres schema in `supabase/schema.sql` with RLS on all tables
- Hand-written TypeScript types in `types/database.ts` + `types/index.ts`

### Authentication
- Email/password sign-in and sign-up via Supabase Auth
- `actions/auth.ts` — `signIn`, `signUp` (handles email confirmation flow), `signOut`
- Postgres trigger auto-creates a `users` row on signup

### Onboarding (`/onboarding`)
- 4-step wizard — basics, domain performance entry, diagnostic analysis, deterministic recommendations
- Saves profile, diagnostic tests, question sessions, study plan, score history, welcome notification
- Fires `runAdaptiveReplanner` on completion to seed initial task metadata

### Study Plan Engine (`lib/study-plan-engine/`)
- Deterministic day-by-day schedule generator; entry point: `StudyPlanEngine.generate(input)`
- Writes one `study_plans` row + per-day `calendar_tasks` rows with QB filters and replanner metadata
- Supports `daySchedule` override (any DOW can be study/review/rest)
- Domain rotation uses running `studyDayGlobalIdx` counter (not day-of-week)

### Adaptive Replanner (`lib/adaptive-replanner/`)
- Entry point: `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`
- **Trigger types:** `question_session` | `error_log` | `practice_test_score` | `manual` | `behind_schedule`
- 6-factor mastery score (accuracy × 0.30, recent × 0.25, improvement × 0.15, mistakes × 0.15, confidence × 0.10, consistency × 0.05)
- Volume multipliers: Mastered ×0.70 / Proficient ×1.00 / Developing ×1.25 / Needs Work ×1.50
- Writes: `topic_mastery`, `score_predictions`, `plan_versions`, `adaptive_recommendations`, `replan_audit_logs`
- Returns `ReplannerResult` with `DomainChange[]`, `predictedScore`, `auditLogId`

### Calendar (`/calendar`)
- **Month / Week / Agenda views** with view switcher; color-coded task chips; drag-and-drop rescheduling
- **Visual states:** past cells muted, today cell violet tint, future task dot indicators
- **Task Drawer** — QB filters (ClipboardList icon label), step-by-step QB instructions, expected time, adaptive-planner stats
- Footer actions: "Log Session" → `SessionWorkflowDialog`, "Enter Score" → `PracticeTestScoreDialog`

### Session Workflow (`SessionWorkflowDialog`)
- **6-phase UX:** idle → active → review → results → missed_analysis → plan_updated
- Countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D entry, correct-answer review
- **Missed-analysis phase:** per-wrong-answer selects for subtopic + mistake type; auto-creates `error_log` rows
- **Plan Updated phase:** improvement %, topic mastery bar, replanner domain changes, predicted score

### Error Log (`/error-log`)
- Full-text search, multi-field filters, sort, Active/Archived tabs
- Edit dialog, confidence rating (1–5), question ID chip (8-char alphanumeric)
- Mastered badge (CheckCircle2 icon), "Mark mastered" button with icon
- Mistake-type badges: BookOpen / Zap / Clock / Target / HelpCircle
- `archiveErrorLog(id, archived)` action

#### DB columns on `error_logs` (apply Block 2 migration if not done):
`corrected_explanation`, `confidence_rating`, `archived`, `custom_mistake_type`, `question_id`, `student_answer`, `correct_answer`

### Data / Analytics (`/data`)
- 8 parallel server fetches with `noStore()`
- Sections: Performance, Topic Analysis, Mistake Analysis, Study Habits, Planning Intelligence
- `useReplanLogs` hook bypasses router cache for fresh replan data
- `PredictedScoreWidget` + `TopicMasteryCards` imported from `components/ai-coach/`

### QB Tutorial (`/tutorial`)
- 7-step interactive QB workflow walkthrough; per-step help accordions; localStorage progress tracker; FAQ

### Settings (`/settings`)
- Notification preferences: email + in-app channels, reminder types (daily/overdue/practice test), timezone
- `saveNotificationPreferences()` + `sendTestReminder()` server actions

---

## Required DB Migrations

Run all three blocks in Supabase SQL Editor. Idempotent (safe to re-run).
Full SQL in `AI_HANDOFF.md` and `supabase/schema.sql`.

| Block | Tables/columns |
|---|---|
| Block 1 | `calendar_tasks` replanner columns + `replan_audit_logs` |
| Block 2 | `error_logs` extended columns |
| Block 3 | `topic_mastery`, `plan_versions`, `score_predictions`, `adaptive_recommendations` |

If you see `Could not find column X in schema cache`: run migrations, then reload schema cache via Supabase Dashboard → Database → Reload Schema Cache.

---

## Not Yet Built

1. **"Replan Now" UI** — `triggerManualReplan()` action exists in `actions/adaptive-replanner.ts`. Still need a button in the UI (calendar header or home page).

2. **Notifications real-time badge** — `notifications` table is populated, `NotificationsDropdown` renders the list, but there is no live unread count on the bell icon. Options: Supabase Realtime subscription, or fetch-on-mount in the dropdown.

3. **QB Tutorial screenshots** — Each step in `tutorial-client.tsx` has a `ScreenshotPlaceholder`. Replace with `<Image>` tags pointing to `public/tutorial/step-{1–7}.png`.

---

## Known Issues

None known. TypeScript is clean (`npx tsc --noEmit` passes with zero errors).

---

## Dead Code (safe to delete — confirmed not imported)

| File | Reason |
|---|---|
| `components/calendar/day-tasks-panel.tsx` | Legacy sidebar, never rendered |
| `components/calendar/log-session-dialog.tsx` | Superseded by SessionWorkflowDialog |
| `components/data/topic-rankings.tsx` | Removed from Data tab in Session 8 |
| `components/data/stats-cards.tsx` | Legacy, not imported |
| `components/data/score-timeline.tsx` | Legacy (data tab uses `score-trend.tsx`) |
| `components/data/accuracy-chart.tsx` | Legacy (data tab uses `accuracy-trends.tsx`) |
| `components/data/category-stats.tsx` | Legacy, not imported |
| `components/ai-coach/ai-coach-panel.tsx` | Route `/ai-coach` deleted in Session 8 |

---

## Next Recommended Tasks

### Option A — "Replan Now" button
Add a manual replanning trigger. `triggerManualReplan()` is ready in `actions/adaptive-replanner.ts`. Add a button to the calendar header (`calendar-client.tsx`) or home page. Show a toast with `tasksUpdated` + `predictedScore` on success.

### Option B — Notifications live unread count
Wire the bell icon to show a red dot or count badge. Subscribe to the `notifications` table via `supabase.channel(...)` + `on('postgres_changes', ...)` in `notifications-dropdown.tsx`, or poll on mount. The dropdown UI is already built.

### Option C — QB Tutorial screenshots
Capture real screenshots of each QB step and save to `public/tutorial/step-{1–7}.png`. Replace `ScreenshotPlaceholder` in `components/tutorial/tutorial-client.tsx`.

### Option D — Delete dead code
Remove the 8 files listed in Dead Code above. No other files import them (verified by absence of any import statement referencing them in the current codebase).

### Option E — Error Log analytics on /data
Surface the error log data in the Data page: mistake-type breakdown chart, domain weakness heatmap, confidence trend line. Components already exist (`MistakeFrequency`) — extend with date-filtered variants.

---

## Implementation Rules (never violate)

1. **No OpenAI.** All planning is deterministic TypeScript. Never introduce an LLM dependency.
2. **Tailwind CSS v4** — use `@import "tailwindcss"` in `globals.css`. Never use `@tailwind base/components/utilities`.
3. **TypeScript strict.** No `any` except intentional Supabase cast workarounds (marked with comments).
4. **`schema.sql` is a reference, not an auto-migration.** Always apply changes manually in Supabase.
5. **Never store SAT question content.** Question ID is an 8-char identifier only. Never store text, passages, or answer choices.
6. **Answer choices stored as A/B/C/D letters only.** Never store the text of answer choices.
7. **`replan_locked = true` tasks are immutable to the replanner.** Set by `toggleTaskComplete`.
8. **Replanner never deletes or adds tasks.** Only UPDATEs existing rows.
9. **`question_sessions` is the canonical source of truth** for topic performance — not `diagnostic_tests`.
10. **`data/page.tsx` must always use `noStore()`.** Never remove it.
11. **QB URL:** `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search` — always in `lib/constants.ts`.
12. **No emoji in component JSX.** Use Lucide React icons. All emoji have been removed as of Session 10.
