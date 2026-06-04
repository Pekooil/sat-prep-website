# Project Handoff

This document is updated at the end of every session. It records the current feature status, known issues, and recommended next steps for whoever picks up this project next. Read `PROJECT_CONTEXT.md` first for the full-picture overview.

---

## Last Updated

2026-06-03 (session 5)

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
- **Month / Week / Agenda views** with view switcher; color-coded task chips; drag-and-drop rescheduling
- **Task Drawer** — QB filters, step-by-step instructions, expected time, adaptive-planner stats
- Footer actions: "Log Session" → `SessionWorkflowDialog`, "Enter Score" → `PracticeTestScoreDialog`

### Session Workflow (`SessionWorkflowDialog`) — updated sessions 3 & 5
- **6-phase UX:** idle → active → review → results → missed_analysis → plan_updated
- Countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D entry, correct-answer review, accuracy vs 90% target
- **Missed-analysis phase:** per-wrong-answer selects for subtopic + mistake type; answers (A–D) passed through automatically to auto-created error logs; "Skip Analysis" skips tagging; auto-skipped on 100% accuracy
- **Auto error log creation:** `student_answer` + `correct_answer` now stored in auto-created error_log rows
- **Plan Updated phase:** improvement %, topic mastery bar, auto-created error log notice

### Error Log (`/error-log`) — fully rebuilt sessions 4 & 5

#### Database columns on `error_logs` (all new — apply migration below):
| Column | Type | Notes |
|---|---|---|
| `corrected_explanation` | TEXT | Student's own explanation after review |
| `confidence_rating` | INTEGER 1–5 | How confident they won't repeat |
| `archived` | BOOLEAN DEFAULT FALSE | Soft-delete |
| `custom_mistake_type` | TEXT | Free-text label when `error_type = 'other'` |
| `question_id` | TEXT | 8-char alphanumeric QB identifier (no question content stored) |
| `student_answer` | TEXT ('A'–'D') | Wrong answer the student chose |
| `correct_answer` | TEXT ('A'–'D') | Correct answer |

#### Features
- **Search** — full-text across description, domain, skill, approaches, corrected explanation
- **Filters** — section, domain, mistake type, mastery status (collapsible panel with filter-count badge)
- **Sort** — newest / oldest / domain A–Z / mistake type / confidence low→high / confidence high→low
- **Active / Archived tabs** with entry counts; archive/restore per row
- **Edit dialog** (`EditErrorDialog`) — pre-populated form for all fields
- **Mistake-type badges** (`MistakeTypeBadge`) — color+icon: BookOpen (Concept Gap) / Zap (Careless Error) / Clock (Timing Issue) / Target (Strategy Error) / HelpCircle (Other/custom)
- **Custom mistake type** — when "Other" is selected, a text field captures any label; shown in badge
- **Question ID chip** — monospace, `#CBFB2B8D` style; 8-char alphanumeric, validated, stored uppercase
- **Answer display** — red chip (wrong) + arrow + green chip (correct) in badge row and expanded view
- **Confidence rating** — 1–5 picker (colored red→green); shown as colored pill on each row
- **Corrected explanation** — blue-highlighted block in expanded view
- **"Most Frequent Mistakes" summary card** — mistake-type breakdown bars (active/total counts), weakest domains, mastery %
- **`archiveErrorLog(id, archived)`** action added to `actions/error-logs.ts`
- All filtering/sorting client-side in `error-log-client.tsx`; hook loads all errors once

#### Label changes (UI only, DB columns unchanged)
- "Category" → **"Domain"** throughout error log UI and filter panel
- "Subcategory" → **"Skill"** throughout error log UI and filter panel

### Data / Analytics (`/data`)
- Score timeline, accuracy charts, category stats, session summary cards
- `addScoreEntry` triggers replanning for practice/official/full_length test types

### QB Tutorial (`/tutorial`)
- 7-step interactive onboarding for the College Board QB workflow; per-step help accordions; progress tracker (localStorage); FAQ section; bottom CTA

### Info Page (`/info`)
- About, FAQ accordion, contact form

---

## Required DB Migrations

**Apply ALL of the following in Supabase Dashboard → SQL Editor.** The schema.sql file is the reference.

```sql
-- calendar_tasks: Adaptive Replanner columns
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

-- error_logs: all new columns (sessions 3–5)
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS corrected_explanation TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS confidence_rating     INTEGER CHECK (confidence_rating BETWEEN 1 AND 5);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS archived              BOOLEAN DEFAULT FALSE;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS custom_mistake_type   TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS question_id           TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS student_answer        TEXT CHECK (student_answer IN ('A','B','C','D'));
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS correct_answer        TEXT CHECK (correct_answer IN ('A','B','C','D'));
CREATE INDEX IF NOT EXISTS idx_error_logs_user_archived ON error_logs(user_id, archived);
```

**Verify with:**
```sql
-- Should return 6 rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'calendar_tasks'
  AND column_name IN ('priority_score','mastery_target','estimated_score_impact',
                      'replanning_weight','replan_locked','last_replanned_at');

-- Should not error
SELECT COUNT(*) FROM replan_audit_logs;

-- Should return 7 rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'error_logs'
  AND column_name IN ('corrected_explanation','confidence_rating','archived',
                      'custom_mistake_type','question_id','student_answer','correct_answer');
```

---

## In-Progress / Unfinished Features

1. **`log-session-dialog.tsx`** — superseded by `SessionWorkflowDialog`. Safe to delete: `components/calendar/log-session-dialog.tsx` and `components/calendar/day-tasks-panel.tsx`.

2. **"Replan Now" button** — no UI to force a manual replanning pass.
   - Add `triggerManualReplan()` to `actions/study-plan.ts` → calls `runAdaptiveReplanner(..., 'manual')`
   - Add a `ReplanButton` in the calendar header; show toast with `tasksUpdated` + `predictedScore`

3. **Notifications UI** — `notifications` table is populated but no real-time badge in the navbar.

---

## Known Issues

None known. If the Supabase schema cache error appears (`Could not find column X in schema cache`), the DB migrations above have not been applied yet. Run the SQL block, then reload the Supabase schema cache via **Supabase Dashboard → Database → Reload Schema Cache**.

---

## Next Recommended Tasks

### Option A — Notifications badge in navbar
Wire up the `notifications` table to a live unread-count badge on the bell icon in `components/layout/navbar.tsx`. The `NotificationsDropdown` component already exists — add a `useEffect` that subscribes to Supabase realtime or fetches on mount.

### Option B — "Replan Now" button
Add a manual replanning trigger to the calendar header so users can force a plan refresh at any time.

### Option C — QB Tutorial screenshots
Replace `ScreenshotPlaceholder` in each step of `components/tutorial/tutorial-client.tsx` with real `<Image>` tags. Save screenshots to `public/tutorial/step-{1–7}.png`.

### Option D — Error Log analytics on /data page
Surface the error log data on the `/data` page: a breakdown chart of mistake types over time, domain weakness heatmap, confidence trend line.

---

## Implementation Rules (never violate)

1. **No OpenAI.** All planning is deterministic TypeScript. Never introduce an LLM dependency.
2. **Tailwind CSS v4** — use `@import "tailwindcss"` in `globals.css`. Never use `@tailwind base/components/utilities`.
3. **TypeScript strict mode.** No `any` except intentional Supabase cast workarounds (marked with comments).
4. **`schema.sql` is a reference, not an auto-migration.** Always apply changes manually in Supabase.
5. **Never store SAT question content.** Question ID is an 8-char identifier only.
6. **Answer choices stored as A/B/C/D letters only.** Never store the text of answer choices.
7. **`replan_locked = true` tasks are immutable to the replanner.** Set by `toggleTaskComplete`.
8. **Replanner never deletes.** Only UPDATEs.
9. **Supabase `as any` casts** are intentional type workarounds — mark with comments.
10. **QB URL:** `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search` — in `lib/constants.ts`.
