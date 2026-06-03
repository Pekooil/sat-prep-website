# AI Handoff

This document describes the current state of the codebase for the next AI agent picking up this project. Read PROJECT_CONTEXT.md first for the big picture.

---

## Completed Features

### Infrastructure
- Next.js 16.2.7 App Router at `/Users/darcywang/sat-prep-website` (not `~/Desktop/`)
- Supabase auth + database wired (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `middleware.ts` guards `/home`, `/calendar`, `/data`, `/error-log`, `/info`
- Full Postgres schema in `supabase/schema.sql` with RLS on all 9 tables (includes `replan_audit_logs`)
- Hand-written TypeScript types in `types/database.ts`

### Auth
- `actions/auth.ts` — `signIn`, `signUp`, `signOut`
- `/login` and `/signup` pages
- Postgres trigger `on_auth_user_created` auto-creates a `users` row on signup

### Onboarding (`/onboarding`)
- 4-step wizard; on completion writes profile, diagnostic_tests, question_sessions, study_plans, score_history, notifications
- After saving, fires `runAdaptiveReplanner` (fire-and-forget) to seed initial task metadata

### Study Plan Engine (`lib/study-plan-engine/`)
Full day-by-day schedule generator. Entry point: `StudyPlanEngine.generate(input)`.

Every generated `calendar_tasks` row includes:
- `priority_score` — normalized **1–100** (computed as `max(1, round(rawScore / maxRawScore × 100))`)
- `mastery_target` — fixed at **90** for all study/review tasks; 0 for practice tests (N/A)
- `estimated_score_impact` — potential SAT points from this domain (raw `potentialPoints`)
- `replanning_weight` — normalized 0–1 priority (used by replanner for aggression)
- `replan_locked: false` — set true only when task is completed

### Adaptive Replanner (`lib/adaptive-replanner/`)

**Entry point:** `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`

**Returns:** `ReplannerResult` with:
- `tasksUpdated` — count of modified tasks
- `taskChanges: DomainChange[]` — per-domain summary of what changed (difficulty, question count, priority)
- `predictedScore` — `min(1600, currentScore + sum(all domain potentialPoints))` — upper-bound score if plan is fully executed
- `domainsReprioritized` — top-5 domain snapshot for the audit log
- `changesSummary` — human-readable string
- `auditLogId` — UUID of the `replan_audit_logs` row written

**Triggered by:**

| Event | File | Trigger type |
|---|---|---|
| Question session logged | `actions/question-sessions.ts` | `question_session` |
| Error log created | `actions/error-logs.ts` | `error_log` |
| Onboarding completed | `actions/onboarding.ts` | `question_session` |
| Practice/official/full_length score added | `actions/score-history.ts` | `practice_test_score` |

**Algorithm (per run):**
1. Load user profile (`current_score`, `target_score`, `test_date`, `daily_study_minutes`)
2. Aggregate all `question_sessions` → per-domain accuracy (`fetchTopicPerformance`)
3. Re-rank all 8 domains with `rankDomains()` → fresh priority ordering
4. Fetch all future unlocked tasks: `WHERE replan_locked = FALSE AND task_date > TODAY`
5. For each task:
   - Practice tests (`category = 'Full Practice Test'`): set `priority_score: 100`, `replanningWeight: 0.9` — never touch title, description, or duration
   - Study/review tasks: recompute phase (from task_date vs. test_date), difficulty, question count, title, description, all 4 metadata fields; track old vs new difficulty and question count for `DomainChange`
6. Batch-update all modified tasks in parallel chunks of 100
7. Set `last_replanned_at` on every updated task
8. Compute `predictedScore`
9. Write one `replan_audit_logs` row

**Safeguards:**
- Never touches `replan_locked = true` tasks
- Never deletes any task
- Never modifies practice test content
- Question count ceiling: `min(80, floor(duration_minutes × 0.80 / 1.25))`
- Only operates on tasks belonging to the active `study_plans` row

### Calendar (`/calendar`)

**Views:** Month, Week, Agenda — controlled by a view-switcher tab bar in the header. Navigation (prev/next/today) adjusts by month, week, or 30-day window depending on the active view.

**Data fetching:** `hooks/use-calendar-tasks-range.ts` — takes `startDate`/`endDate` strings and reloads on change. The range is recomputed whenever the view or anchor date changes.

**Color coding:** `components/calendar/task-colors.ts` — maps the 8 SAT domain categories + "Full Practice Test" to distinct Tailwind color schemes (bg, border, text, dot, left-bar).

**Task cards:**
- Month view: compact chips with colored left bar, domain name, and question count.
- Week view: taller cards with domain, question count, subject, and completion icon.
- Agenda view: full cards with subject badge, question count, duration, and a preview of QB filter tags (domain / skill / difficulty).

**Task Drawer (`components/calendar/task-drawer.tsx`):**  
Right-side slide-over panel. Opens on any task card click. Shows:
- Domain category label + colored dot + title
- Quick stats: section, duration, question count
- College Board QB filters (domain / skill / difficulty / target questions)
- "Open College Board Question Bank" external link
- Numbered step-by-step instructions for obtaining questions (or practice test instructions for Full Practice Tests)
- Expected completion time panel (allocated minutes + exam-pace estimate)
- Adaptive Planner metadata (priority / score impact / mastery goal)
- Footer: "Log Session" button (→ SessionWorkflowDialog), "Enter Score" (→ PracticeTestScoreDialog), or "Mark Complete" for manual tasks

**Drag-and-drop rescheduling:** HTML5 drag-and-drop on task cards (disabled for completed tasks). Dropping onto a different day cell calls `rescheduleCalendarTask` server action which updates `task_date` in Supabase immediately, then reloads the task list.

**`actions/calendar.ts` now exports `rescheduleCalendarTask(id, newDate)`.**

- **`SessionWorkflowDialog`** (`components/calendar/session-workflow-dialog.tsx`) — the primary session completion UX, a 5-phase state machine:
  1. **idle** — task info, question count, time budget
  2. **active** — countdown timer + per-question "Your Answer" dropdowns (A/B/C/D)
  3. **review** — "Correct Answer" dropdowns alongside locked "Your Answer" column
  4. **results** — score (X/N), accuracy %, vs 90% mastery target, per-question ✓/✗, time left / overtime
  5. **plan_updated** — replanner changes (per-domain difficulty/question deltas) + potential score

- Timer rules: **71 seconds/question** for Reading & Writing, **95 seconds/question** for Math. Total time rounded up to the nearest full minute. At expiry: toast notification, timer flips to red `+MM:SS overtime` — does not lock input.

- `DayTasksPanel` — per-task AI Replanner Info panel shows: `priority_score` (1–100), `mastery_target` (90%), `estimated_score_impact` (+N pts), `replanning_weight` (%), `last_replanned_at` (relative timestamp)

- Completing a plan-generated study/review task → opens `SessionWorkflowDialog` → on save: inserts `question_sessions` row → triggers replanning → shows plan-updated screen
- Completing a plan-generated practice test task → opens `PracticeTestScoreDialog` → inserts `score_history` row → triggers replanning
- Manually-created tasks complete directly

### Error Log (`/error-log`)
- `createErrorLog` triggers replanning after each new entry

### Data / Analytics (`/data`)
- `addScoreEntry` triggers replanning for `practice`, `official`, and `full_length` test types

---

## In-Progress / Unfinished Features

1. **`log-session-dialog.tsx`** — superseded by `SessionWorkflowDialog` but still exists. Can be deleted once `SessionWorkflowDialog` is confirmed stable in production.

2. **Manual "Replan Now" button** — no UI to force a replanning pass without submitting data. Implement as `triggerManualReplan()` in `actions/study-plan.ts` calling `runAdaptiveReplanner(..., 'manual')`, wired to a button in the calendar header or home page.

3. **Notifications UI** — `notifications` table is populated; no real-time badge or alert UI beyond the navbar stub.


---

## Known Bugs / Required DB Migrations

The following SQL must be applied in **Supabase Dashboard → SQL Editor** if not already done:

```sql
-- Adaptive replanner columns on calendar_tasks
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS priority_score         NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS mastery_target         INTEGER    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS estimated_score_impact NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replanning_weight      NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replan_locked          BOOLEAN    DEFAULT FALSE;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS last_replanned_at      TIMESTAMPTZ;

-- Replanner index
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_replanner
  ON calendar_tasks(user_id, task_date, replanning_weight) WHERE NOT replan_locked;

-- Audit log table
CREATE TABLE IF NOT EXISTS replan_audit_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by          TEXT        NOT NULL CHECK (triggered_by IN ('question_session','error_log','practice_test_score','manual')),
  trigger_id            UUID,
  tasks_updated         INTEGER     DEFAULT 0,
  domains_reprioritized JSONB,
  changes_summary       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replan_audit_user ON replan_audit_logs(user_id, created_at DESC);
ALTER TABLE replan_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own replan logs" ON replan_audit_logs FOR ALL USING (auth.uid() = user_id);
```

Verify with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'calendar_tasks'
  AND column_name IN ('priority_score','mastery_target','estimated_score_impact',
                      'replanning_weight','replan_locked','last_replanned_at');
-- must return 6 rows

SELECT COUNT(*) FROM replan_audit_logs; -- must not error
```

---

## Next Recommended Task

**Add a "Replan Now" button** to the calendar header or home page.

1. Add `triggerManualReplan()` to `actions/study-plan.ts` — calls `runAdaptiveReplanner(supabase, user.id, 'manual')`
2. Wire to a button in `components/home/ai-planner-trigger.tsx` or the calendar page header
3. Show a toast with `tasksUpdated` count and the `predictedScore` on completion

This gives students explicit control over replanning without needing to submit new session data.

---

## Important Implementation Decisions

1. **No OpenAI.** All planning and replanning is deterministic TypeScript. Do not introduce an LLM dependency.

2. **`priority_score` is 1–100 normalized.** The raw gap × leverage value is used internally for ranking but the DB column stores the normalized value. Practice tests are fixed at 100.

3. **`mastery_target` is fixed at 90.** It does not vary by target score. The internal `targetAccuracy` still drives difficulty selection in the engine; 90 is the display-facing goal.

4. **Replanner updates in-place, never rebuilds.** Only UPDATE operations — no DELETEs or re-inserts. Preserves user-added manual tasks.

5. **`replan_locked` is the single source of truth for replanner eligibility.** Set by `toggleTaskComplete`. The replanner filters `WHERE replan_locked = FALSE`.

6. **`schema.sql` is a reference file, not an auto-migration.** Always run changes manually in the Supabase dashboard and verify.

7. **`createQuestionSession` returns replanner details to the client.** `SessionWorkflowDialog` uses the returned `taskChanges` and `predictedScore` to populate the `plan_updated` phase without a second fetch.

8. **Supabase `as any` casts** are intentional for hand-written type workarounds.

9. **Tailwind CSS v4** — `@import "tailwindcss"` in `globals.css`. Do NOT use `@tailwind base/components/utilities`.

10. **Next.js 16 async params** — dynamic route segments must `await params`.

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
