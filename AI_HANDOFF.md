# AI Handoff

Technical reference for AI agents continuing work on this project. Read `PROJECT_CONTEXT.md` first for the product overview, and `PROJECT_HANDOFF.md` for feature status and next steps.

---

## Quick Start

- **Project root:** `/Users/darcywang/sat-prep-website` (NOT `~/Desktop/sat-prep-website`)
- **Run dev server:** `npm run dev` from the project root (port 3000)
- **Launch config:** `.claude/launch.json` → `sat-planner`
- **Stack:** Next.js 16.2.7, React 19, TypeScript 5 strict, Tailwind CSS v4, Supabase

---

## Directory Map

```
actions/
  auth.ts                   signIn, signUp, signOut
  calendar.ts               getCalendarTasks, createCalendarTask, updateCalendarTask,
                            toggleTaskComplete (sets replan_locked), deleteCalendarTask,
                            rescheduleCalendarTask (drag-and-drop: updates task_date only)
  error-logs.ts             CRUD; createErrorLog triggers replanning
  onboarding.ts             saveOnboarding; triggers initial replanning after diagnostic insert
  question-sessions.ts      createQuestionSession; triggers replanning; returns DomainChange[] + predictedScore
  score-history.ts          addScoreEntry; triggers replanning for practice/official/full_length
  study-plan.ts             generatePlanFromProfile, generatePlanFromForm
  ai-planner.ts             generateAIStudyPlan (Home page trigger — calls generatePlanFromForm)

app/
  (auth)/login              Email/password sign-in
  (auth)/signup             Account creation
  (dashboard)/home          Score cards, upcoming tasks, AI Plan Generator
  (dashboard)/calendar      Study calendar (month/week/agenda views)
  (dashboard)/error-log     Mistake tracking
  (dashboard)/data          Score timeline, accuracy charts, session analytics
  (dashboard)/tutorial      QB tutorial (7-step workflow, progress tracker, FAQ)
  (dashboard)/info          About, FAQ, contact form
  onboarding/               4-step wizard

components/
  calendar/
    calendar-client.tsx           Main calendar orchestrator — month, week, agenda views,
                                  view switcher, drag-and-drop, drawer + dialog state management
    task-drawer.tsx               Right-side slide-over: QB filters, QB instructions,
                                  expected time, replanner stats, session launch buttons
    task-colors.ts                Shared color map for all 8 SAT domains + Full Practice Test
    session-workflow-dialog.tsx   5-phase session UX (DO NOT MODIFY — answering system)
    practice-test-score-dialog.tsx Score entry for practice test tasks (DO NOT MODIFY)
    task-form-dialog.tsx          Manual task creation form
    day-tasks-panel.tsx           Legacy sidebar panel — still exists but NOT rendered in the
                                  current calendar-client. Can be deleted safely.
    log-session-dialog.tsx        Legacy quick-log — superseded by SessionWorkflowDialog.
                                  Can be deleted.
  tutorial/
    tutorial-client.tsx           Full client component — 7-step QB workflow tutorial,
                                  ScreenshotPlaceholder, HelpAccordion, StepCard sub-components,
                                  progress tracker (localStorage), FAQ accordion, bottom CTA
  ui/                             Radix UI wrappers: button, badge, card, dialog, select, tabs, ...
  home/                           Home page components
  layout/                         Navbar, sidebar, theme provider

hooks/
  use-calendar-tasks.ts           Original hook (loads by year/month) — still used by legacy code
  use-calendar-tasks-range.ts     Flexible hook (loads by startDate/endDate) — used by calendar-client
  use-error-logs.ts
  use-score-history.ts

lib/
  study-plan-engine/
    types.ts                      StudyPlanEngineInput, DaySchedule, DomainEntry, etc.
    domain-catalog.ts             8 SAT domains with CB QB labels, skills, point weights
    scoring.service.ts            rankDomains() — ranks by accuracy gap × point leverage
    difficulty.service.ts         phase assignment (foundation/skill/advanced/strategy)
    scheduler.service.ts          buildSchedule() — produces day-by-day DaySchedule[]
    plan-store.service.ts         PlanStoreService.save() — inserts study_plans + calendar_tasks
    index.ts                      StudyPlanEngine class — orchestrator
  adaptive-replanner/
    index.ts                      runAdaptiveReplanner() — main entry point
    types.ts                      ReplanTrigger, ReplannerResult, DomainChange, TaskUpdate
  supabase/
    client.ts                     createClient() for browser
    server.ts                     createClient() for Server Components / Server Actions
  constants.ts                    MATH_DOMAINS, RW_DOMAINS, COLLEGE_BOARD_QB_URL, etc.
  utils.ts                        cn, formatDate, subjectLabel, todayISO, etc.

supabase/schema.sql               Full Postgres schema + all ALTER TABLE migrations (reference only)
types/
  database.ts                     Hand-written Supabase row types
  index.ts                        App-level type re-exports (CalendarTask, User, CollegeBoardFilter, etc.)
```

---

## Study Plan Engine

**Entry point:** `StudyPlanEngine.generate(input: StudyPlanEngineInput)`

**Input shape:**
```typescript
{
  userId: string
  currentScore: number       // 400–1600
  targetScore: number
  testDate: string           // ISO date
  dailyStudyMinutes: number
  topicPerformance: TopicPerformance[]  // per-domain attempted/correct from question_sessions
}
```

**Output:** Writes one `study_plans` row + N `calendar_tasks` rows.

**Task metadata written at generation:**
- `priority_score` — normalized 1–100 (`max(1, round(raw / maxRaw × 100))`); practice tests = 100
- `mastery_target` — fixed 90 for study/review tasks; 0 for practice tests
- `estimated_score_impact` — raw `potentialPoints` (domain's point gap)
- `replanning_weight` — 0–1 normalized; practice tests = 0.9
- `replan_locked: false` — set true when completed via `toggleTaskComplete`

---

## Adaptive Replanner

**Entry point:** `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`

**`triggeredBy` values:** `'question_session' | 'error_log' | 'practice_test_score' | 'manual'`

**Returns:** `ReplannerResult`:
```typescript
{
  tasksUpdated: number
  taskChanges: DomainChange[]     // per-domain difficulty/question delta
  predictedScore: number          // min(1600, current + sum(potentialPoints))
  domainsReprioritized: object    // top-5 snapshot for audit log
  changesSummary: string
  auditLogId: string
}
```

**Algorithm (per run):**
1. Load profile (`current_score`, `target_score`, `test_date`, `daily_study_minutes`)
2. Aggregate all `question_sessions` → per-domain accuracy via `fetchTopicPerformance`
3. Re-rank 8 domains with `rankDomains()` → fresh priority order
4. Fetch all future unlocked tasks: `WHERE replan_locked = FALSE AND task_date > TODAY`
5. For each task:
   - Practice tests → set `priority_score: 100`, `replanningWeight: 0.9`; never touch title/description/duration
   - Study/review → recompute phase, difficulty, question count, title, description, all 4 metadata fields
6. Batch-update modified tasks in parallel chunks of 100
7. Set `last_replanned_at` on every updated row
8. Compute `predictedScore`
9. Write one `replan_audit_logs` row

**Safeguards:**
- Never touches `replan_locked = true` tasks
- Never deletes any task
- Question count ceiling: `min(80, floor(duration_minutes × 0.80 / 1.25))`
- Only operates on tasks in the active `study_plans` row

**Trigger map:**

| Event | File | Trigger type |
|---|---|---|
| Question session logged (SessionWorkflowDialog) | `actions/question-sessions.ts` | `question_session` |
| Error log created | `actions/error-logs.ts` | `error_log` |
| Onboarding completed (diagnostic sessions) | `actions/onboarding.ts` | `question_session` |
| Practice / official / full_length score added | `actions/score-history.ts` | `practice_test_score` |

---

## Calendar Architecture

### Views

`components/calendar/calendar-client.tsx` orchestrates three views:

| View | Date range loaded | Task presentation |
|---|---|---|
| Month | First–last of current month | Compact chips: colored left bar + domain + question count |
| Week | Sun–Sat of current week | Taller cards: domain, question count, subject, status icon |
| Agenda | Today + 90 days | Full cards: subject badge, question count, duration, QB filter tag row |

Navigation adjusts by month (month view), 7 days (week view), or 30 days (agenda view).

Data is fetched via `hooks/use-calendar-tasks-range.ts` which takes `startDate`/`endDate` strings and reloads when either changes.

### Task Drawer

`components/calendar/task-drawer.tsx` — right-side CSS-transition slide-over (not Radix Dialog). Opens on any task card click; escape key and backdrop click close it.

**Content:**
1. Header: category dot + label + title + quick stats (section, duration, question count)
2. College Board QB filters section (domain / skill / difficulty badge / target questions)
3. "Open College Board Question Bank" link → `COLLEGE_BOARD_QB_URL`
4. Numbered instructions (7 steps for QB sessions; 6 steps for practice tests)
5. Expected completion time (allocated minutes + exam-pace estimate: 71 s/q R&W, 95 s/q Math)
6. Adaptive Planner stats (priority / score impact / mastery goal) — hidden for practice tests
7. Footer actions:
   - Plan study tasks → "Log Session" → `SessionWorkflowDialog`
   - Plan practice tests → "Enter Score" → `PracticeTestScoreDialog`
   - Manual tasks → "Mark Complete" → `toggleTaskComplete`

### Drag-and-Drop

HTML5 drag API — no extra library. Task cards are `draggable={!task.is_completed}`. On drop onto a different day cell, `rescheduleCalendarTask(taskId, newDate)` is called, which updates `task_date` in Supabase and calls `revalidatePath('/calendar')`. The client-side `reload()` then refreshes the task list.

**Important:** `rescheduleCalendarTask` only updates `task_date`. It does not touch `replan_locked`. The replanner will pick up rescheduled incomplete tasks on its next run.

### Color System

`components/calendar/task-colors.ts` is the single source of truth. Each of the 8 SAT domains + "Full Practice Test" maps to `{ bg, border, text, dot, leftBar }` Tailwind class strings. If new domains are added to `DOMAIN_CATALOG`, add a matching entry here.

### Session Dialogs (DO NOT MODIFY)

`SessionWorkflowDialog` and `PracticeTestScoreDialog` are the answering system. They must not be changed. The calendar drawer and calendar client may _reference_ them (open/close, pass props) but must not alter their internal logic.

---

## Required DB Migrations

Apply in **Supabase Dashboard → SQL Editor** if not already done:

```sql
-- Adaptive replanner columns on calendar_tasks
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS priority_score         NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS mastery_target         INTEGER    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS estimated_score_impact NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replanning_weight      NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replan_locked          BOOLEAN    DEFAULT FALSE;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS last_replanned_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendar_tasks_replanner
  ON calendar_tasks(user_id, task_date, replanning_weight) WHERE NOT replan_locked;

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

Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'calendar_tasks'
  AND column_name IN ('priority_score','mastery_target','estimated_score_impact',
                      'replanning_weight','replan_locked','last_replanned_at');
-- must return 6 rows

SELECT COUNT(*) FROM replan_audit_logs; -- must not error
```

---

## Implementation Rules

1. **No OpenAI.** All planning and replanning is deterministic TypeScript. Never add an LLM dependency.
2. **Tailwind CSS v4** — use `@import "tailwindcss"` in `globals.css`. Never use `@tailwind base/components/utilities`. Dark mode: `@custom-variant dark (&:where(.dark, .dark *))` + `.dark` class on `<html>`.
3. **TypeScript strict mode.** No `any` except intentional Supabase cast workarounds (marked with comments).
4. **`schema.sql` is a reference, not an auto-migration.** Always apply changes manually in Supabase and verify.
5. **Next.js 16 async params** — dynamic route segments must `await params` before use.
6. **`replan_locked = true` tasks are immutable to the replanner.** Set by `toggleTaskComplete`; removed on un-complete.
7. **Replanner never deletes or rebuilds.** Only UPDATEs. Manual tasks are always preserved.
8. **`createQuestionSession` returns replanner details directly.** `SessionWorkflowDialog` uses the returned `taskChanges` and `predictedScore` to render the `plan_updated` phase — no second fetch needed.
9. **Calendar drawer is purely informational.** Do not embed session/scoring logic in the drawer.
10. **QB URL:** `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search` — set in `lib/constants.ts` as `COLLEGE_BOARD_QB_URL`.
11. **Tutorial progress** is stored in `localStorage` under key `'sat-planner-tutorial-progress'` as a `boolean[]` of length 7. The `TutorialClient` component handles hydration safety with a `hydrated` flag to avoid SSR mismatch.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
