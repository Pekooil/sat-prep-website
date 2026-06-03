# Database Schema

Source of truth: `supabase/schema.sql`. TypeScript types: `types/database.ts`.

All tables have Row Level Security enabled. Every policy uses `auth.uid()` so queries are automatically scoped to the authenticated user.

---

## Table Overview

| Table | Purpose |
|---|---|
| `users` | Extended profile for each auth.users row |
| `diagnostic_tests` | Section-level scores from practice and official tests |
| `study_plans` | One active plan per user; envelope for calendar tasks |
| `calendar_tasks` | One row per study block, review block, or practice test day |
| `question_sessions` | Per-session QB results (attempted / correct by domain) |
| `error_logs` | Individual mistake entries with mastery tracking |
| `score_history` | Composite + section scores over time for charts |
| `notifications` | In-app alerts (reminders, achievements, system messages) |

---

## users

Extends `auth.users`. Created automatically by the `on_auth_user_created` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK — references `auth.users(id)` |
| `full_name` | `text` | nullable |
| `email` | `text` | nullable |
| `target_score` | `integer` | default 1550 |
| `current_score` | `integer` | nullable; updated by `addScoreEntry` |
| `test_date` | `date` | nullable; ISO date of upcoming SAT |
| `study_hours_per_week` | `integer` | default 10 |
| `daily_study_minutes` | `integer` | default 60; used by study plan engine |
| `has_completed_onboarding` | `boolean` | default false |
| `created_at` | `timestamptz` | auto |
| `updated_at` | `timestamptz` | auto |

**RLS:** `Users can manage own profile` — `auth.uid() = id` for ALL operations.

---

## diagnostic_tests

Stores section-level scores from any diagnostic or practice test. The `total_score` column is computed.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `test_date` | `date` | required |
| `math_score` | `integer` | 200–800 check |
| `reading_writing_score` | `integer` | 200–800 check |
| `total_score` | `integer` | GENERATED: `math_score + reading_writing_score` |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | auto |

---

## study_plans

One row per generated plan. Only one plan should be `is_active = true` at a time. The plan engine deactivates existing plans before inserting a new one.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `title` | `text` | e.g. "12-Week SAT Study Plan — Target 1400 (3 Practice Tests)" |
| `description` | `text` | nullable; human-readable strategy summary |
| `start_date` | `date` | required |
| `end_date` | `date` | required; equals the SAT test date |
| `is_active` | `boolean` | default true |
| `ai_generated` | `boolean` | default false (engine is deterministic, not AI) |
| `plan_data` | `jsonb` | nullable; stores engine metadata and phase summaries |
| `created_at` | `timestamptz` | auto |
| `updated_at` | `timestamptz` | auto |

**`plan_data` shape (from engine):**
```jsonb
{
  "totalDays": 84,
  "studyDays": 60,
  "reviewDays": 12,
  "practiceTestDays": 3,
  "restDays": 12,
  "phases": [ { "phase": "foundation", "label": "...", ... }, ... ],
  "topPriorityDomains": [ { "label": "Craft and Structure", "currentAccuracy": 42, ... }, ... ],
  "generatedAt": "2026-06-03T..."
}
```

---

## calendar_tasks

One row per study block. Each `DaySchedule` from the engine maps to one or more tasks. Rest days produce no rows.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `study_plan_id` | `uuid` | nullable FK → study_plans (SET NULL on plan delete) |
| `title` | `text` | e.g. "Algebra — Medium · 18q" or "Full Practice Test #2" |
| `description` | `text` | nullable; full session instructions |
| `task_date` | `date` | required; the specific calendar day |
| `start_time` | `time` | nullable |
| `duration_minutes` | `integer` | default 60 |
| `subject` | `text` | `'math' \| 'reading_writing' \| 'both'` |
| `category` | `text` | nullable; domain label (e.g. "Algebra") or "Full Practice Test" |
| `is_completed` | `boolean` | default false |
| `college_board_filters` | `jsonb` | QB filter bag (see below) |
| `created_at` | `timestamptz` | auto |
| `updated_at` | `timestamptz` | auto |

**`college_board_filters` shape:**
```jsonb
{
  "domain": "Algebra",
  "skill": "Linear equations in one variable",
  "difficulty": "easy"
}
```
For practice test days: `{ "domain": "Full-Length Practice Test", "skill": "Complete test simulation (Bluebook)", "difficulty": "hard" }`.

**Indexes:** `idx_calendar_tasks_user_date` on `(user_id, task_date)`.

---

## question_sessions

Records the outcome of one College Board QB session. Users enter results after practicing on the CB website.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `calendar_task_id` | `uuid` | nullable FK → calendar_tasks (SET NULL on task delete) |
| `session_date` | `date` | required |
| `subject` | `text` | `'math' \| 'reading_writing'` |
| `category` | `text` | domain label — must match `DOMAIN_CATALOG[].label` for engine aggregation |
| `subcategory` | `text` | nullable; specific skill label |
| `questions_attempted` | `integer` | default 0 |
| `questions_correct` | `integer` | default 0 |
| `time_spent_minutes` | `integer` | nullable |
| `college_board_filters` | `jsonb` | nullable; QB filters that were applied |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | auto |

**Important:** The study plan engine reads this table to compute `TopicPerformance` for domain ranking. It aggregates `questions_attempted` and `questions_correct` grouped by `category` (mapped to domain key via `DOMAIN_CATALOG[].label`). Sessions created during onboarding have `notes = 'From onboarding diagnostic'`.

---

## error_logs

One row per mistake the student wants to track and review.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `question_session_id` | `uuid` | nullable FK → question_sessions |
| `subject` | `text` | `'math' \| 'reading_writing'` |
| `category` | `text` | domain label |
| `subcategory` | `text` | nullable; specific skill |
| `error_type` | `text` | `'concept' \| 'careless' \| 'time' \| 'strategy' \| 'other'` |
| `description` | `text` | required; what went wrong |
| `my_answer` | `text` | nullable |
| `correct_approach` | `text` | nullable; the right method |
| `college_board_domain` | `text` | nullable; CB domain label |
| `college_board_skill` | `text` | nullable; CB skill label |
| `mastered` | `boolean` | default false |
| `review_count` | `integer` | default 0 |
| `last_reviewed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | auto |
| `updated_at` | `timestamptz` | auto |

**Indexes:** `idx_error_logs_user_subject` on `(user_id, subject)`.

---

## score_history

Composite and section-level scores over time. Powers the Data page score timeline chart.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `test_type` | `text` | `'diagnostic' \| 'practice' \| 'official' \| 'full_length'` |
| `test_date` | `date` | required |
| `math_score` | `integer` | nullable; 200–800 |
| `reading_writing_score` | `integer` | nullable; 200–800 |
| `total_score` | `integer` | GENERATED: `math_score + reading_writing_score` |
| `math_section_breakdown` | `jsonb` | nullable; per-domain breakdown |
| `reading_writing_section_breakdown` | `jsonb` | nullable |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | auto |

**Indexes:** `idx_score_history_user_date` on `(user_id, test_date)`.

Adding a score via `addScoreEntry` also updates `users.current_score`.

---

## notifications

In-app alerts. Currently populated by the system; no user-generated notifications.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → users |
| `title` | `text` | required |
| `message` | `text` | required |
| `type` | `text` | `'reminder' \| 'achievement' \| 'system' \| 'ai_suggestion'` |
| `is_read` | `boolean` | default false |
| `link` | `text` | nullable; relative URL to navigate on click |
| `created_at` | `timestamptz` | auto |

**Indexes:** `idx_notifications_user_unread` on `(user_id, is_read)`.

---

## Postgres Trigger

```sql
-- Runs AFTER INSERT on auth.users
-- Creates the matching users profile row automatically on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## RLS Policy Summary

| Table | Policy |
|---|---|
| `users` | `auth.uid() = id` |
| `diagnostic_tests` | `auth.uid() = user_id` |
| `study_plans` | `auth.uid() = user_id` |
| `calendar_tasks` | `auth.uid() = user_id` |
| `question_sessions` | `auth.uid() = user_id` |
| `error_logs` | `auth.uid() = user_id` |
| `score_history` | `auth.uid() = user_id` |
| `notifications` | `auth.uid() = user_id` |

All policies are `FOR ALL` (SELECT, INSERT, UPDATE, DELETE).
