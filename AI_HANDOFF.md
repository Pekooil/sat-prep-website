# SAT Study Planner AI — Complete Handoff

**Last updated:** 2026-06-05 (Session 9)
**Project root:** `/Users/darcywang/sat-prep-website`
**Stack:** Next.js 16.2.7 (App Router), React 19, TypeScript 5 strict, Tailwind CSS v4, Supabase
**No external AI API** — all planning logic is deterministic TypeScript.

---

## ⚠️ Critical: CWD mismatch

The shell always resets CWD to `/Users/darcywang/Desktop/sat-prep-website` (a ghost folder with only `.claude/` and `.next/`).
The real project is at `/Users/darcywang/sat-prep-website`. Always use absolute paths or cd there first.

---

## Quick Start

```bash
cd /Users/darcywang/sat-prep-website
npm run dev        # port 3000
```

Launch config: `.claude/launch.json` → server name `sat-planner`

---

## Required DB Migrations

Apply all three blocks in **Supabase SQL Editor** as one script. All statements are idempotent.
Full SQL is in `supabase/schema.sql` (bottom section).

### Auth trigger fix (if new users can't register)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Block 1 — Adaptive Replanner v1 columns + replan_audit_logs
```sql
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS priority_score         NUMERIC     DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS mastery_target         INTEGER     DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS estimated_score_impact NUMERIC     DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replanning_weight      NUMERIC     DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replan_locked          BOOLEAN     DEFAULT FALSE;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS last_replanned_at      TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_replanner
  ON calendar_tasks(user_id, task_date, replanning_weight) WHERE NOT replan_locked;

CREATE TABLE IF NOT EXISTS replan_audit_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by          TEXT        NOT NULL,
  trigger_id            UUID,
  tasks_updated         INTEGER     DEFAULT 0,
  domains_reprioritized JSONB,
  changes_summary       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replan_audit_user ON replan_audit_logs(user_id, created_at DESC);
ALTER TABLE replan_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own replan logs" ON replan_audit_logs;
CREATE POLICY "Users can view own replan logs" ON replan_audit_logs FOR ALL USING (auth.uid() = user_id);
```

### Block 2 — Error Log extra columns
```sql
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS corrected_explanation TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS confidence_rating     INTEGER CHECK (confidence_rating BETWEEN 1 AND 5);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS archived              BOOLEAN DEFAULT FALSE;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS custom_mistake_type   TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS question_id           TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS student_answer        TEXT CHECK (student_answer IN ('A','B','C','D'));
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS correct_answer        TEXT CHECK (correct_answer IN ('A','B','C','D'));
CREATE INDEX IF NOT EXISTS idx_error_logs_user_archived ON error_logs(user_id, archived);
```

### Block 3 — Adaptive Replanner v2 new tables
```sql
CREATE TABLE IF NOT EXISTS topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL, domain_label TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math','reading_writing')),
  mastery_score NUMERIC NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  accuracy_score NUMERIC DEFAULT 0, recent_accuracy NUMERIC DEFAULT 0,
  improvement_factor NUMERIC DEFAULT 0, mistake_cleanliness NUMERIC DEFAULT 0,
  confidence_factor NUMERIC DEFAULT 0, consistency_factor NUMERIC DEFAULT 0,
  total_questions_attempted INTEGER DEFAULT 0, total_sessions INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (user_id, domain_key)
);
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own mastery" ON topic_mastery;
CREATE POLICY "Users can manage own mastery" ON topic_mastery FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON topic_mastery(user_id);

CREATE TABLE IF NOT EXISTS plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1, triggered_by TEXT NOT NULL,
  reason TEXT, tasks_snapshot JSONB NOT NULL DEFAULT '[]',
  tasks_updated INTEGER DEFAULT 0, predicted_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own versions" ON plan_versions;
CREATE POLICY "Users can manage own versions" ON plan_versions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_plan_versions_user ON plan_versions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS score_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_score INTEGER NOT NULL, confidence_low INTEGER NOT NULL,
  confidence_high INTEGER NOT NULL, baseline_score INTEGER,
  consistency_factor NUMERIC, session_count INTEGER,
  mastery_snapshot JSONB, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE score_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own predictions" ON score_predictions;
CREATE POLICY "Users can manage own predictions" ON score_predictions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_score_predictions_user ON score_predictions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  replan_audit_log_id UUID REFERENCES replan_audit_logs(id) ON DELETE SET NULL,
  domain_key TEXT, domain_label TEXT,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'increase_volume','reduce_volume','intervention','maintenance','schedule_change','recovery','general'
  )),
  message TEXT NOT NULL, old_mastery NUMERIC, new_mastery NUMERIC,
  is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE adaptive_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recommendations" ON adaptive_recommendations;
CREATE POLICY "Users can manage own recommendations" ON adaptive_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_recommendations_user ON adaptive_recommendations(user_id, created_at DESC);

ALTER TABLE replan_audit_logs DROP CONSTRAINT IF EXISTS replan_audit_logs_triggered_by_check;
ALTER TABLE replan_audit_logs ADD CONSTRAINT replan_audit_logs_triggered_by_check
  CHECK (triggered_by IN ('question_session','error_log','practice_test_score','manual','behind_schedule'));
```

---

## Directory Map

```
actions/
  adaptive-replanner.ts   triggerManualReplan(), recoverMissedAndReplan(), restoreVersion(id), markRecommendationRead(id)
  ai-planner.ts           generateAIStudyPlan({currentScore, targetScore, testDate, hoursPerDay, daySchedule})
  auth.ts                 signIn(), signUp() [returns {needsConfirmation:true} if email unconfirmed], signOut()
  calendar.ts             CRUD; rescheduleCalendarTask (drag-drop); toggleTaskComplete (sets replan_locked)
  error-logs.ts           createErrorLog, updateErrorLog, archiveErrorLog, markErrorMastered, deleteErrorLog
  onboarding.ts           saveOnboarding → seeds question_sessions + score_history + engine + replanner
  question-sessions.ts    createQuestionSession(data, missedAnalysis?) → runs replanner, returns SessionMetrics + ReplannerResult
  score-history.ts        addScoreEntry → updates current_score (even partial); triggers replanner for non-diagnostic
  study-plan.ts           generatePlanFromProfile(), generatePlanFromForm({..., daySchedule?})

app/
  (auth)/login            Email/password sign-in
  (auth)/signup           Account creation (shows "check email" card when confirmation required)
  (dashboard)/home        Score cards, upcoming tasks, AI Adaptive Replanner card
  (dashboard)/calendar    Month/week/agenda views, drag-and-drop, TaskDrawer, session dialogs
  (dashboard)/data        Full analytics dashboard — 8 parallel fetches, noStore()
  (dashboard)/error-log   Mistake tracking with search/filter/archive
  (dashboard)/tutorial    Static QB tutorial (7-step workflow)
  (dashboard)/info        About, FAQ, contact
  onboarding/             4-step wizard

lib/
  study-plan-engine/
    types.ts              StudyPlanEngineInput (includes daySchedule?: Record<number,'study'|'review'|'rest'>)
    domain-catalog.ts     8 SAT domains with CB QB labels, skills, point weights
    scoring.service.ts    rankDomains() — ranks by accuracy gap × point leverage
    difficulty.service.ts phase assignment (foundation/skill/advanced/strategy) + difficulty + skill focus
    scheduler.service.ts  buildSchedule() — uses daySchedule when provided; domain rotation via studyDayGlobalIdx counter
    plan-store.service.ts PlanStoreService.save() — writes study_plans + calendar_tasks
    index.ts              StudyPlanEngine class — orchestrator
  adaptive-replanner/
    index.ts              runAdaptiveReplanner() — full v2 pipeline
    types.ts              ReplanTrigger | ReplannerResult | DomainChange | TaskUpdate
    topic-mastery.service.ts    6-factor mastery 0–100; computeTopicMastery(), saveTopicMastery(), volumeMultiplier()
    score-prediction.service.ts computeScorePrediction(), saveScorePrediction()
    missed-assignment.service.ts recoverMissedAssignments() — redistributes overdue tasks into next 14 days
    plan-version.service.ts     savePlanVersion(), restorePlanVersion()
    recommendations.service.ts  generateRecommendations(), saveRecommendations()
  constants.ts            NAV_LINKS, MATH_DOMAINS, RW_DOMAINS, COLLEGE_BOARD_QB_URL, ERROR_TYPES, TEST_TYPES
  utils.ts                cn, todayISO, etc.

components/
  home/
    ai-planner-trigger.tsx    "AI Adaptive Replanner" card — scores + test date + hours/day + day schedule picker
  calendar/
    calendar-client.tsx       Month/week/agenda orchestrator + drag-and-drop
    task-drawer.tsx           Slide-over: QB filters, instructions, replanner stats, session buttons
    session-workflow-dialog.tsx  6-phase UX (idle→active→review→results→missed_analysis→plan_updated)
    practice-test-score-dialog.tsx  Do NOT modify
    task-form-dialog.tsx      Manual task creation
    task-colors.ts            Domain color map
  data/
    data-client.tsx           Dashboard orchestrator (imports TopicMasteryCards + PredictedScoreWidget from ai-coach/)
    accuracy-trends.tsx, score-trend.tsx, topic-mastery-heatmap.tsx, topic-mastery-trends.tsx,
    mistake-frequency.tsx, study-time-chart.tsx, consistency-chart.tsx, replan-timeline.tsx,
    workload-redistribution.tsx, accuracy-heatmap.tsx, add-score-dialog.tsx
    [REMOVED: topic-rankings.tsx still exists as file but is no longer imported]
  ai-coach/                   Components shared with Data tab (route /ai-coach was deleted)
    topic-mastery-cards.tsx   8 domain cards sorted weakest→strongest, color-coded by mastery tier
    predicted-score-widget.tsx Predicted score + CI + recharts trend line
    plan-version-history.tsx  Version list with restore
    ai-recommendations.tsx    AI coach message list with dismiss
    ai-coach-panel.tsx        [UNUSED — route deleted, file remains]
  error-log/
    error-log-client.tsx, error-row.tsx, add-error-dialog.tsx, edit-error-dialog.tsx, mistake-type-badge.tsx
  layout/
    navbar.tsx                Desktop nav (reads NAV_LINKS from constants.ts)
    mobile-nav.tsx            Bottom nav: Home, Calendar, Errors, Data, Info

hooks/
  use-replan-logs.ts          Client-side replan_audit_logs fetch (bypasses router cache) — KEEP IN data-client.tsx
  use-calendar-tasks-range.ts Flexible date-range loader for calendar views
  use-error-logs.ts           All errors once; client-side filter/sort
  use-score-history.ts, use-calendar-tasks.ts

types/
  database.ts    Full row/insert/update types for all 12 tables
  index.ts       App-level re-exports (User, CalendarTask, TopicMastery, PlanVersion, ScorePrediction, AdaptiveRecommendation, ...)

supabase/schema.sql   Complete reference schema + all ALTER TABLE migrations
```

---

## Data Flow

```
Onboarding wizard
  → saveOnboarding()
    ├── question_sessions  8 rows (canonical source for topic performance)
    ├── score_history      1 baseline row
    ├── notifications      Welcome (non-fatal)
    └── StudyPlanEngine.generate() → study_plans + calendar_tasks
          → runAdaptiveReplanner('question_session')

User completes calendar task
  → SessionWorkflowDialog (6-phase)
    → createQuestionSession(data, missedAnalysis)
      ├── question_sessions  1 row with real timer data
      ├── error_logs         Auto-created for each tagged missed question
      └── runAdaptiveReplanner('question_session')
            ├── computeTopicMastery()    → save to topic_mastery
            ├── computeScorePrediction() → save to score_predictions
            ├── savePlanVersion()        → snapshot to plan_versions
            ├── UPDATE calendar_tasks    (future unlocked only)
            ├── generateRecommendations() → save to adaptive_recommendations
            └── INSERT replan_audit_logs

Data tab load
  → data/page.tsx (noStore(), 8 parallel queries)
    → DataClient (props: scores, sessions, errors, replans, tasks, profile, mastery, predictions)
      → useReplanLogs(initialReplans)  ← client-side refetch bypasses router cache
```

---

## Study Plan Engine Detail

### Input
```typescript
interface StudyPlanEngineInput {
  userId: string
  currentScore: number          // 400–1600
  targetScore: number           // > currentScore
  testDate: string              // ISO YYYY-MM-DD
  dailyStudyMinutes: number     // 15–300 (validated by engine)
  topicPerformance?: TopicPerformance[]   // loaded from DB automatically
  daySchedule?: Record<number, 'study' | 'review' | 'rest'>  // 0=Sun…6=Sat
}
```

### Day scheduling
- Default: Mon–Fri=study, Sat=review (or practice_test in practice-test weeks), Sun=rest
- With `daySchedule`: any DOW can be any type; practice test promotion is still automatic ('review' on practice-test week → 'practice_test')
- Domain rotation uses `studyDayGlobalIdx` (running counter), NOT day-of-week index, so rotation works correctly with any schedule

### AI Adaptive Replanner form (Home page)
- `hoursPerDay` (0.5–8, step 0.5) → `dailyStudyMinutes = hoursPerDay × 60` (clamped 15–300)
- `daySchedule` from day-picker UI (Mon–Sun buttons, cycles Study→Review→Rest)
- **No weak areas input** — domain priorities come entirely from `question_sessions` DB data

---

## Adaptive Replanner v2 Detail

### Trigger types
`'question_session' | 'error_log' | 'practice_test_score' | 'manual' | 'behind_schedule'`

### Per-run pipeline
1. Load user profile
2. Fetch previous mastery from `topic_mastery` (for change detection)
3. `computeTopicMastery()` — 6 factors from question_sessions + error_logs
4. `savePlanVersion()` — snapshot future tasks before any changes
5. If `behind_schedule`: `recoverMissedAssignments()` — redistribute overdue tasks
6. `rankDomains()` — re-rank 8 domains by accuracy gap × point leverage
7. `computeScorePrediction()` — predicted score + CI
8. Fetch all future unlocked tasks
9. For each task: apply mastery-tier volume multiplier + recompute difficulty/title/description
10. Batch UPDATE in parallel chunks of 100
11. Write `replan_audit_logs`
12. `saveTopicMastery()`, `saveScorePrediction()`, `saveRecommendations()`, `updateVersionTaskCount()`

### 6-factor mastery score (0–100)
| Factor | Weight | Source |
|---|---|---|
| All-time accuracy | 0.30 | question_sessions (all) |
| Recent accuracy | 0.25 | question_sessions (last 3) |
| Improvement trajectory | 0.15 | first-half vs second-half accuracy |
| Mistake cleanliness | 0.15 | error_logs count (inverted) |
| Confidence rating | 0.10 | error_logs.confidence_rating avg (1–5 → 0–100) |
| Study consistency | 0.05 | sessions in last 14 days / 10 |

### Volume multipliers by mastery tier
| Score | Tier | Multiplier |
|---|---|---|
| 90–100 | Mastered | ×0.70 |
| 70–89 | Proficient | ×1.00 |
| 50–69 | Developing | ×1.25 |
| <50 | Needs Work | ×1.50 |

### Score prediction formula
```
masteryGain = Σ (masteryScore/100 × domain.questionCount × domain.pointsPerQuestion × 0.4)
adjustedGain = masteryGain × consistencyFactor
predictedScore = min(1600, currentScore + adjustedGain)
ciWidth: <5 sessions→±100, 5–19→±70, 20–49→±50, 50+→±30
```

### Safeguards (never break)
- Never touches `replan_locked = true` tasks
- Never modifies practice test content (title, duration, description)
- Never stores or displays SAT question content
- Only recommends CB QB filters, question counts, difficulty levels, schedule changes

---

## Data Tab Sections (in render order)

1. **Performance**
   - AccuracyTrends + ScoreTrend in 2-col grid
   - PredictedScoreWidget (full width, gap via `space-y-4` wrapper) ← from `components/ai-coach/`

2. **Topic Analysis**
   - TopicMasteryHeatmap (full width)
   - TopicMasteryTrends + AccuracyHeatmap (2-col grid)
   - TopicMasteryCards (8-domain cards) ← from `components/ai-coach/`

3. **Mistake Analysis** — MistakeFrequency

4. **Study Habits** — StudyTimeChart + ConsistencyChart

5. **Planning Intelligence** — ReplanTimeline + WorkloadRedistribution

> **Note:** `TopicRankings` (Weakest/Strongest boxes) was removed in session 8. The file still exists but is not imported.
> `PredictedScoreWidget` and `TopicMasteryCards` do NOT apply the date-range filter — they always show all-time data.

---

## Auth

### Signup flow
- `actions/auth.ts signUp()` returns `{ needsConfirmation: true }` when `data.session === null`
- `app/(auth)/signup/page.tsx` renders a "Check your email" success card in that case
- If email confirmation is off in Supabase, the session exists immediately and the user is redirected to `/home`

### To disable email confirmation (development)
Supabase Dashboard → Authentication → Settings → uncheck "Enable email confirmations"

---

## Nav

| Surface | Links |
|---|---|
| Desktop (navbar.tsx) | Home · Calendar · Error Log · Data · QB Tutorial · Info & Contact |
| Mobile (mobile-nav.tsx) | Home · Calendar · Errors · Data · Info |

The `/ai-coach` route was **deleted** in session 8. `components/ai-coach/` components remain because the Data tab imports them.

---

## Theme Colors (Session 9)

The app uses **violet/purple** as the primary theme color (`#7c3aed` = `violet-600`), matching the logo.

**Intentionally kept blue (do not change):**
- `components/home/score-card.tsx` — `blue` colorMap entry (Current Score card)
- `components/home/quick-stats.tsx` — Study Time stat icon
- `components/calendar/task-colors.ts` — Algebra domain color
- `components/error-log/mistake-type-badge.tsx` — Timing Issue badge (`time` key)
- `components/info/about-section.tsx` — Step 1 "Generate Your AI Plan" icon background
- `components/data/` — All chart colors (score-timeline, accuracy-trends, accuracy-chart, score-trend, mistake-frequency, category-stats, replan-timeline, stats-cards, data-client)

---

## Implementation Rules

1. **No OpenAI / external AI.** All logic is deterministic TypeScript.
2. **Tailwind CSS v4** — `@import "tailwindcss"` in globals.css. Dark mode via `.dark` class.
3. **TypeScript strict.** `// eslint-disable-next-line @typescript-eslint/no-explicit-any` only for Supabase cast workarounds.
4. **`schema.sql` is reference only.** Apply all changes manually in Supabase SQL Editor.
5. **Never store SAT question content.** `question_id` is an 8-char alphanumeric identifier only.
6. **Answer choices are A/B/C/D letters only.** `student_answer` / `correct_answer` never store text.
7. **`replan_locked = true` tasks are immutable to the replanner.** Set by `toggleTaskComplete`.
8. **Replanner never deletes or adds tasks.** Only UPDATEs existing rows.
9. **`question_sessions` is the canonical source of truth** for topic performance. `diagnostic_tests` is legacy (exists in schema, not written to).
10. **`data/page.tsx` must always use `noStore()`.** Never remove it.
11. **`useReplanLogs` hook in `data-client.tsx` must stay.** It bypasses router cache so ReplanTimeline/WorkloadRedistribution show fresh data.
12. **Domain priorities in plan generation come from DB only** — never from user checkbox/text input.
13. **QB URL:** `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search` (in `lib/constants.ts`)
14. **Tutorial progress:** `localStorage` key `'sat-planner-tutorial-progress'`, `boolean[]` length 7.

---

## Dead Code (safe to delete)

- `components/data/topic-rankings.tsx` — removed from Data tab, file not imported
- `components/data/day-tasks-panel.tsx`, `log-session-dialog.tsx` — legacy, never rendered
- `components/data/stats-cards.tsx`, `score-timeline.tsx`, `accuracy-chart.tsx`, `category-stats.tsx` — legacy
- `components/ai-coach/ai-coach-panel.tsx` — route deleted, component unused
- `types/index.ts` exports `AIPlanRequest`, `AIStudyPlan`, `AIPlanWeek`, `AIPlanTask` — unused after session 8 refactor

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Both are required. Set in `.env.local` for local dev; Supabase dashboard for production.
