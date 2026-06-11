# Project Handoff

This document is updated at the end of every session. It records current feature status, known issues, and recommended next steps. Read `AI_HANDOFF.md` for the deep technical reference and `PROJECT_CONTEXT.md` for the full-picture overview.

---

## Last Updated

2026-06-11 (Session 18 — Signup + email-confirmation fix)

---

## What Was Done This Session

### Session 18 — Signup + Email-Confirmation Fix

**Trigger:** App review feedback — *"I tried signing up and it seemed to not work (the signup link didn't do anything), probably because of a missing environment variable,"* plus a request that the Supabase confirmation link land on the **login** page, not onboarding.

**Root causes**
1. Supabase clients used `process.env.NEXT_PUBLIC_SUPABASE_URL!` / `..._ANON_KEY!` (bare non-null assertions). A missing/empty value let the Supabase SDK throw deep inside the signup server action; the page handlers did not catch it, so the button hung on "Saving…/Signing in…" and *nothing visibly happened*.
2. `app/auth/confirm/page.tsx` redirected to `/home` after confirmation. For a brand-new (not-yet-onboarded) user the dashboard layout then bounced them to `/onboarding`; when no session was detected it was a dead-end ("the link may have expired").

**Root cause found:** the pulled `.vercel/.env.production.local` has `NEXT_PUBLIC_APP_URL=""` (empty). `signUpAndSaveOnboarding()` built `emailRedirectTo` with `process.env.NEXT_PUBLIC_APP_URL ?? …`, and `"" ?? fallback` is `""`, so the confirmation redirect became the relative `"/auth/confirm"` (no origin) — i.e. the broken "signup link." This is almost certainly the env var the reviewer hit.

**Changes**
- **`lib/app-url.ts` (new)** — `getAppUrl()` returns the absolute origin, preferring `NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → localhost, **treating empty strings as unset** (`.trim()` truthiness, not `??`). Used by `actions/auth.ts` and `actions/onboarding.ts` for `emailRedirectTo`.
- **`lib/supabase/env.ts` (new)** — `getSupabaseUrl()` / `getSupabaseAnonKey()` validate the public Supabase env vars and throw a clear, actionable message naming the missing variable. Wired into `lib/supabase/server.ts`, `lib/supabase/client.ts`, `proxy.ts`.
- **Error surfacing** — `login`, `signup`, and the onboarding wizard now wrap their server-action call in `try/catch` (re-throwing `NEXT_REDIRECT`); a thrown error shows an inline message/toast instead of hanging the button.
- **Confirmation redirect** — `app/auth/confirm/page.tsx` clears any transient session and redirects to `/login?confirmed=1` (handles `error`/`error_description` from query **or** hash). `app/(auth)/login/page.tsx` renders a green "Your email is confirmed. Sign in to continue." banner (and a red banner for `?error=`).
- **Eager signup persistence** — `signUpAndSaveOnboarding()` now persists profile + question_sessions + study plan + score_history + notification via the **service-role admin client** when email confirmation is pending (no session ⇒ RLS would block writes), upserting `has_completed_onboarding: true`. So once the user confirms and signs in, they go **straight to the dashboard** — no second onboarding. (`SUPABASE_SERVICE_ROLE_KEY` must be set, which it is.)

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean (only pre-existing `recs` unused warnings); `next build` succeeds; in-browser `/auth/confirm` → `/login?confirmed=1` with banner, wizard renders, no console errors. The eager-persistence DB path is covered by build/typecheck/logic review (a full run requires creating a real account).

**⚠️ Action items (production) — do these in the dashboards, then redeploy:**
1. **Vercel → Settings → Environment Variables (Production):** set `NEXT_PUBLIC_APP_URL = https://sat-prep-website-gold.vercel.app` (it is currently empty — this is the core bug), and confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are present. **Redeploy** (env changes only take effect on a new build).
2. **Supabase → Authentication → URL Configuration:** Site URL = `https://sat-prep-website-gold.vercel.app`; add `https://sat-prep-website-gold.vercel.app/**` (and `/auth/confirm`) to the Redirect URLs allow-list.

### Session 16 — Inventory-Aware Question Assignment

**Goal:** Make plan generation respect the Question Bank inventory: never over-assign a skill, substitute another skill when one runs out, fill ≥80% of study time, keep both subjects on every study day, and stop + prompt when the whole bank is scheduled.

#### Plan Generation (`lib/study-plan-engine/plan-store.service.ts`)
- Replaced the old `applyInventoryCap()` (which assigned 1 question when a skill was exhausted) with a full assignment pipeline:
  - **80% time floor** — every study block targets at least `ceil(blockMinutes × 0.80 / 1.25)` questions before capping (applies even with no inventory configured).
  - **Inventory cap** — no `domain|skill|difficulty` is assigned more than its `available_count`; tracked via a cumulative `used` map.
  - **Cross-skill substitution** — when the planned skill can't fill the floor, `pickSlot()` substitutes another skill in the **same subject** by adaptive-planner priority (`buildSlotsBySubject()` sorts inventory slots by `priorityScore`). Substitutes rebuild title/description/filters/difficulty/metadata via `substituteBlock()`.
  - **Bank-complete** — when both subjects are exhausted, remaining study days become `bankCompleteToTask()` Review & Practice sessions and one `type:'system'` notification is written.
- `save()` now returns `inventoryExhausted` + `nearlyExhaustedSkills`.
- Added optional `inventoryExhausted?` / `nearlyExhaustedSkills?` to `StudyPlanEngineResult` (`lib/study-plan-engine/types.ts`).

#### Verification
- `npx tsc --noEmit` clean (strict mode), `npx eslint` clean on changed files.
- Not browser-verified: logic is server-side and requires auth + a seeded `question_inventory` + plan generation. To verify in-app: seed inventory on `/inventory`, generate a plan, and inspect `/calendar` (capped counts, substituted skills, Review & Practice days, "Question Bank fully scheduled" notification).

#### Copyright compliance
- No change to what is stored: tasks still carry only domain/skill label strings, difficulty, and integer question counts. No SAT content introduced. COPYRIGHT_COMPLIANCE.md remains accurate.

---

### Session 15 — Review Day Overhaul: Single Review Session + Inline Error Log

**Goal:** Replace the multiple domain-specific blocks on review days with a single "Review Session" task that shows active error log mistakes and lets users edit/master them inline on the calendar.

#### Plan Generation (`lib/study-plan-engine/plan-store.service.ts`)
- Replaced the per-domain `reviewBlockToTask()` loop with a single `reviewSessionToTask()` per review day
- New task: `category: 'Review Session'`, `subject: 'both'`, `title: 'Review Session'`
- No QB filters (`college_board_filters: null`), no skill label
- Duration = `day.totalDurationMinutes` (full review allocation), priority 50, replanning weight 0.5
- Removed the now-unused `applyInventoryCapReview()` private method and `ReviewBlock` import

#### Colors (`components/calendar/task-colors.ts`)
- Added `'Review Session'` entry with identical slate colors to `'Full Practice Test'`
- Legend in calendar updated: "Practice Test" → "Practice Test / Review"

#### Adaptive Replanner (`lib/adaptive-replanner/index.ts`)
- No code change needed — replanner already skips tasks whose `category` doesn't match a domain label, so `'Review Session'` tasks are silently skipped (same as the `Full Practice Test` path but via the `if (!rd) continue` guard)

#### New Component (`components/calendar/review-session-dialog.tsx`)
- Slide-over drawer (same layout pattern as `TaskDrawer`) opens when user clicks a Review Session task
- Fetches active error logs client-side: `mastered = false`, `archived = false`, ordered by `created_at` desc
- Displays count of active mistakes and a `ReviewErrorCard` per entry
- Each card: mastered toggle (circle → marks mastered, removes from list), Pencil edit button (opens `EditErrorDialog`), expand/collapse for full detail (what I did, correct approach, my explanation, mark mastered button)
- Empty state: "No active mistakes" with `BookOpenCheck` icon
- Loading skeleton while fetching
- Footer: "Mark Session Complete" button (calls `onMarkComplete` + closes drawer); shows "Session completed" badge if already done

#### Calendar Client (`components/calendar/calendar-client.tsx`)
- Added `reviewSessionTask` state
- `openDrawer()` now routes `category === 'Review Session'` tasks to `ReviewSessionDialog` instead of `TaskDrawer`
- `ReviewSessionDialog` rendered alongside other dialogs

**TypeScript:** `npx tsc --noEmit` → 0 errors.

---

### Session 13 — Premium UI/UX Rebuild: Foundation (Phases 0–2)

Ground-up visual elevation of the app. **Foundation only** this session (tokens →
primitives → layout shell); page-by-page redesign is the next checkpoint, paused for
review. Branch: `ui-rebuild-premium`. No functional, schema, action, or planner
changes — `npm run build` clean, `npm run test` green (44/44).

**Phase 0 — Design tokens (`app/globals.css`):**
- Single-sourced color ramps via `@theme`; `:root` ramp aliases point at them.
- New **surface-elevation** tokens (`--surface-base/-raised/-overlay/-sunken`),
  warm-tinted off-whites in light, layered slate-950→900→800 in dark.
- **Hairline border** tokens (`--border` ~8%, `--border-strong` ~12%, `--input-border`).
- **`shadow-xs`→`xl`** scale = 1px ring + soft layered shadow (light + dark variants).
- Refined type scale (body 15px, display 28–40px @ `-0.02em`), radii standardized to
  8/10/14 (`--radius-sm/-md/-lg`), motion 150–200ms.
- Added `--accent` / `--accent-soft` (brand text/active states; violet-400 in dark),
  `--gradient-mesh`, `.sp-hover-lift`, `.sp-display`, `.sp-mesh` helpers, and a global
  `prefers-reduced-motion` guard. All prior token names + `sp-*` helpers preserved.

**Phase 1 — Primitives (`components/ui/`):**
- Refined: Button (depth + `icon-sm` size), Card (`interactive` prop, radius-lg,
  shadow-xs), Input/Textarea/Select (size variants, accent focus ring, surfaces),
  Badge (size variants), Tabs, Switch, Checkbox, Progress, Skeleton (shimmer),
  Dialog/Dropdown/Select/Toast (overlay surface + shadow-lg/xl), Label.
- **New:** `tooltip.tsx`, `segmented-control.tsx`, `empty-state.tsx`,
  `stat-card.tsx` (StatCard + MetricCard + DeltaBadge), `page-header.tsx`.

**Phase 2 — Layout shell (sidebar + top bar):**
- New `components/layout/sidebar.tsx` — fixed left sidebar, icon+label nav with active
  rail, user menu at bottom. New `components/layout/topbar.tsx` — breadcrumb (desktop) /
  logo (mobile), theme toggle, notification bell.
- `app/(dashboard)/layout.tsx` rewired to sidebar + offset content column; `mobile-nav`
  restyled to accent tokens; notification badge given a ring.
- `components/layout/navbar.tsx` is now **orphaned** (old top pill-nav, left in place,
  not imported). Safe to delete during page-redesign phase.

**Next:** page redesigns in order home → calendar → data → error-log → onboarding →
auth → tutorial → settings → inventory → marketing landing.

---

### Session 12 — Remove "Systems of equations" from Advanced Math

Removed the `'Systems of equations'` skill from the **Advanced Math** category across all three source files:
- `lib/constants.ts` — removed from `MATH_DOMAINS` Advanced Math skills array
- `lib/study-plan-engine/domain-catalog.ts` — removed from `advancedMath` domain skills
- `lib/sat-planner.ts` — removed from `advancedMath` domain skills

The **Algebra** category's `'Systems of linear equations'` skill was left untouched in all files.

---

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

## Earlier Sessions

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
- `proxy.ts` guards all dashboard routes (Next.js 16 renamed Middleware → Proxy)
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
- **Inventory-aware assignment** (`plan-store.service.ts`): loads `question_inventory` at plan-generation time; enforces per-`(domain, skill, difficulty)` caps via cumulative tracking; floors each block at ≥80% of study time; substitutes another skill in the same subject (by adaptive priority) when the planned skill runs low; converts remaining study days to `'Review Session'` Review & Practice tasks once the full bank is exhausted; writes a `type:'system'` notification; returns `inventoryExhausted` + `nearlyExhaustedSkills` to the caller

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
- **Review Session routing** — clicking a `'Review Session'` task opens `ReviewSessionDialog` (not `TaskDrawer`)

### Review Session Dialog (`components/calendar/review-session-dialog.tsx`)
- Slide-over for Saturday review days; fetches active (unmastered, unarchived) error log entries
- Per-entry: inline mastered toggle (removes from list immediately), Pencil → `EditErrorDialog`, expand/collapse detail
- Empty state with `BookOpenCheck` icon; loading skeleton; "Mark Session Complete" footer button

### Session Workflow (`SessionWorkflowDialog`)
- **6-phase UX:** idle → active → review → results → missed_analysis → plan_updated
- Countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D entry, correct-answer review
- **Missed-analysis phase:** per-wrong-answer selects for subtopic + mistake type; auto-creates `error_log` rows
- **Plan Updated phase:** improvement %, topic mastery bar, replanner domain changes, predicted score

### Question Inventory (`/inventory`)
- Admin-managed catalog (`question_inventory` table) of CB QB available question counts per `(section, domain, skill, difficulty)`
- Summary stat cards: Available / Assigned / Completed / Remaining
- SVG circular progress + section stacked progress bars
- Sortable/filterable/paginated table with color-coded Remaining badges
- Recharts: by-section bar, by-difficulty bar, most-depleted horizontal bar
- CRUD editor + bulk JSON/CSV import (file-upload + paste)
- `actions/question-inventory.ts` — `getInventoryWithStats()`, CRUD, `bulkImportInventory()`, `getInventoryLimits()`

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
| Block 6 | `question_inventory` table (29 seed rows covering all 8 domains × skills × difficulties) |

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

### Option B — Surface `inventoryExhausted` to the UI
`StudyPlanEngine.generate()` now returns `inventoryExhausted: boolean` and `nearlyExhaustedSkills: string[]`. Consider showing a warning banner when the Home page triggers plan generation and `inventoryExhausted` is true, or when the plan meta contains tasks with `category: 'Review & Practice — Question Bank Complete'`. The system notification is already written, but a proactive visual prompt would be more discoverable.

### Option C — Notifications live unread count
Wire the bell icon to show a red dot or count badge. Subscribe to the `notifications` table via `supabase.channel(...)` + `on('postgres_changes', ...)` in `notifications-dropdown.tsx`, or poll on mount. The dropdown UI is already built.

### Option D — QB Tutorial screenshots
Capture real screenshots of each QB step and save to `public/tutorial/step-{1–7}.png`. Replace `ScreenshotPlaceholder` in `components/tutorial/tutorial-client.tsx`.

### Option E — Delete dead code
Remove the 8 files listed in Dead Code above. No other files import them.

### Option F — Error Log analytics on /data
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
