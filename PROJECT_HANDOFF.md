# Project Handoff

This document is updated at the end of every session. It records the current feature status, known issues, and recommended next steps for whoever picks up this project next. Read `PROJECT_CONTEXT.md` first for the full-picture overview.

---

## Last Updated

2026-06-03 (session 2)

---

## Completed Features

### Infrastructure
- Next.js 16.2.7 App Router at `/Users/darcywang/sat-prep-website`
- Supabase auth + database (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `middleware.ts` guards all dashboard routes
- Full Postgres schema in `supabase/schema.sql` with RLS on all 9 tables
- Hand-written TypeScript types in `types/database.ts`

### Authentication
- Email/password sign-in and sign-up via Supabase Auth
- `actions/auth.ts` — `signIn`, `signUp`, `signOut`
- Postgres trigger auto-creates a `users` row on signup

### Onboarding (`/onboarding`)
- 4-step wizard — basics, domain performance entry, diagnostic analysis, recommendations
- Saves profile, diagnostic tests, question sessions, study plan, score history, notifications
- Fires `runAdaptiveReplanner` on completion to seed initial task metadata

### Study Plan Engine (`lib/study-plan-engine/`)
- Deterministic day-by-day schedule generator; entry point: `StudyPlanEngine.generate(input)`
- Writes one `study_plans` row + per-day `calendar_tasks` rows with QB filters and replanner metadata

### Adaptive Replanner (`lib/adaptive-replanner/`)
- Entry point: `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`
- Re-ranks all 8 domains, updates future unlocked tasks, returns `DomainChange[]` + `predictedScore`
- Triggered by: question session, error log, onboarding, practice/official test score
- Writes an audit log row to `replan_audit_logs` on each run

### Calendar (`/calendar`)
- **Month view** — 7-column grid; task chips show domain + question count; color-coded by category; drag-and-drop between days; today highlighted
- **Week view** — 7-column grid (current week); task cards with domain, question count, subject, status; today column highlighted in blue; horizontally scrollable on mobile
- **Agenda view** — chronological list grouped by date; full task cards with subject badge, question count, duration, QB filter preview tags (domain / skill / difficulty)
- **Task Drawer** — right-side slide-over on any task click:
  - Domain label, section, duration, question count
  - College Board QB filters (domain / skill / difficulty / target questions) with difficulty color badge
  - Link to College Board Question Bank (correct URL: `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search`)
  - 7-step instructions for obtaining QB questions (or 6-step practice test instructions)
  - Expected completion time with exam-pace estimate (71 s/q R&W, 95 s/q Math)
  - Adaptive Planner stats (priority score / score impact / mastery goal)
  - Footer: "Log Session" → `SessionWorkflowDialog`, "Enter Score" → `PracticeTestScoreDialog`, or "Mark Complete" for manual tasks
- **Drag-and-drop rescheduling** — HTML5 drag API; `rescheduleCalendarTask` server action updates Supabase immediately; toast confirmation on success
- **Add Task** button opens `TaskFormDialog` for manual task creation

### Session Workflow (`SessionWorkflowDialog`)
- 5-phase UX: idle → active → review → results → plan_updated
- Countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D entry, correct-answer entry, accuracy vs 90% target, overtime tracking
- On save: inserts `question_sessions` → triggers replanning → shows domain changes + predicted score

### Error Log (`/error-log`)
- Create, review, and master individual errors
- `createErrorLog` triggers replanning after each new entry

### Data / Analytics (`/data`)
- Score timeline, accuracy charts, category stats, session summary cards
- `addScoreEntry` triggers replanning for practice/official/full_length test types

### QB Tutorial (`/tutorial`)
- **Route:** `app/(dashboard)/tutorial/page.tsx` — protected dashboard route, no DB queries
- **Component:** `components/tutorial/tutorial-client.tsx` — full client component (all interactive state)
- **7 steps:** Go to QB → Select section → Apply domain/skill filters → Set difficulty → Export/begin questions → Complete questions → Log session in app
- **Screenshot placeholders:** Each step has a styled `div` with `role="img"` and mock browser chrome; swap in real screenshots by replacing the `ScreenshotPlaceholder` component with an `<Image>` per step
- **Per-step help accordions:** 3–5 collapsible Q&A items built with `@radix-ui/react-accordion` (same pattern as `FAQAccordion` in `/info`)
- **Progress tracker:** `useState<boolean[]>` array persisted to `localStorage` under key `'sat-planner-tutorial-progress'`; progress bar (`components/ui/progress.tsx`); step pills that scroll to the corresponding step card; Reset button; "all done" banner with Calendar link
- **FAQ:** 8 questions at the bottom of the page
- **Nav link:** `'QB Tutorial'` added to `NAV_LINKS` in `lib/constants.ts` (between Data and Info & Contact)
- **Copyright:** No SAT content. Explains the workflow only. Links to `COLLEGE_BOARD_QB_URL`.

### Info Page (`/info`)
- About, FAQ accordion, contact form

---

## In-Progress / Unfinished Features

1. **`log-session-dialog.tsx`** — superseded by `SessionWorkflowDialog` but still exists at `components/calendar/log-session-dialog.tsx`. Safe to delete once confirmed stable.

2. **"Replan Now" button** — no UI to force a manual replanning pass without submitting session data.
   - Add `triggerManualReplan()` to `actions/study-plan.ts` calling `runAdaptiveReplanner(..., 'manual')`
   - Wire to a button in the calendar header (next to "Add Task")
   - Show a toast with `tasksUpdated` count and `predictedScore` on completion

3. **Notifications UI** — `notifications` table is populated but there is no real-time badge or alert display beyond the navbar stub.

---

## Known Bugs

None known as of this session. The following DB migrations must be applied in Supabase if not already done (see `AI_HANDOFF.md` for the full SQL):

- `priority_score`, `mastery_target`, `estimated_score_impact`, `replanning_weight`, `replan_locked`, `last_replanned_at` columns on `calendar_tasks`
- `replan_audit_logs` table + RLS policy + index

---

## Next Recommended Tasks

### Option A — Add a "Replan Now" button (calendar header)

1. Add `triggerManualReplan()` to `actions/study-plan.ts`:
   ```typescript
   export async function triggerManualReplan() {
     'use server'
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return { error: 'Unauthorized' }
     return runAdaptiveReplanner(supabase, user.id, 'manual')
   }
   ```
2. Add a `ReplanButton` client component in the calendar header that calls this action, shows a loading spinner, and displays a toast with `tasksUpdated` and `predictedScore`.
3. Call `reload()` on success to refresh the task list.

### Option B — Replace tutorial screenshot placeholders with real screenshots

Each step in `components/tutorial/tutorial-client.tsx` has a `ScreenshotPlaceholder` component. To replace with real screenshots:
1. Take screenshots of the QB site at each step (with filters applied) and save to `public/tutorial/step-{n}.png`
2. Replace the `<ScreenshotPlaceholder>` call inside each `StepCard` with:
   ```tsx
   <Image src={`/tutorial/step-${step.id}.png`} alt={step.screenshotAlt}
     width={1200} height={525} className="w-full rounded-xl border border-[var(--border)]" />
   ```
3. Remove the `ScreenshotPlaceholder` component and `Image` icon import from `tutorial-client.tsx`.

### Option C — Notifications UI

Wire up the `notifications` table to a real-time badge in the navbar. The `NotificationsDropdown` component (`components/layout/notifications-dropdown.tsx`) already exists — it just needs a live count badge added to its trigger button.

---

## Important Implementation Decisions

1. **No OpenAI.** All planning and replanning is deterministic TypeScript. Do not introduce an LLM dependency.

2. **Tailwind CSS v4** — `@import "tailwindcss"` in `globals.css`. Do NOT use `@tailwind base/components/utilities`. Dark mode uses `@custom-variant dark (&:where(.dark, .dark *))` and the `.dark` class on `<html>`.

3. **Calendar drawer is purely informational.** The session workflow dialogs (`SessionWorkflowDialog`, `PracticeTestScoreDialog`) are untouched — the drawer launches them via callback props. Do not embed session logic in the drawer.

4. **Drag-and-drop uses the HTML5 drag API** — no extra library. Completed tasks (`is_completed = true`) are not draggable. The drop handler no-ops if the task is dropped on its own date.

5. **`rescheduleCalendarTask` only updates `task_date`.** It does not change `replan_locked`. The replanner will re-examine rescheduled incomplete tasks on its next run.

6. **Category colors are the single source of truth** in `components/calendar/task-colors.ts`. If new domains are added to `DOMAIN_CATALOG`, add a matching entry there.

7. **`priority_score` is 1–100 normalized.** Practice tests are fixed at 100. `mastery_target` is fixed at 90 for all study/review tasks.

8. **Replanner updates in-place, never rebuilds.** Only UPDATE operations — no DELETEs or re-inserts.

9. **`replan_locked` is the single source of truth for replanner eligibility.** Set by `toggleTaskComplete`.

10. **QB URL** — the correct College Board Educator Question Bank URL is `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search`. This is set via `COLLEGE_BOARD_QB_URL` in `lib/constants.ts` and used in both the task drawer and the day-tasks panel.

11. **`schema.sql` is a reference file, not an auto-migration.** Always run schema changes manually in the Supabase dashboard.

12. **Next.js 16 async params** — dynamic route segments must `await params`.

13. **Supabase `as any` casts** are intentional workarounds for hand-written type definitions.
