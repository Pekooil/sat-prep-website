# SAT Study Planner AI — Complete Handoff

**Last updated:** 2026-06-14 (Session 29 — Practice test scheduling overhaul: biweekly cadence on last study day, mandatory 2-days-before test, SAT test day calendar marker, onboarding count display)
**Project root:** `/Users/darcywang/sat-prep-website`
**Stack:** Next.js 16.2.7 (App Router), React 19, TypeScript 5 strict, Tailwind CSS v4, Supabase
**No external AI API** — all planning logic is deterministic TypeScript.

---

## ⚠️ Critical: CWD mismatch

The shell always resets CWD to `/Users/darcywang/Desktop/sat-prep-website` (a ghost folder with only `.claude/` and `.next/`).
The real project is at `/Users/darcywang/sat-prep-website`. Always use absolute paths or `cd` there first.

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

### Legal compliance — age gate + consent (Session 22)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year        SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_ack      BOOLEAN DEFAULT FALSE;
```
Stores birth **year** only (not full DOB) to minimize PII held about minors. Signup
will error until these exist (the upsert writes them). See `LEGAL_COMPLIANCE.md`.

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
  notification-preferences.ts  saveNotificationPreferences(), sendTestReminder()
  onboarding.ts           saveOnboarding → seeds question_sessions + score_history + engine + replanner
  question-inventory.ts   getInventoryWithStats(), createInventoryItem(), updateInventoryItem(),
                          deleteInventoryItem(), bulkImportInventory(), getInventoryLimits()
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
  (dashboard)/settings    Notification preferences
  onboarding/             4-step wizard

  DELETED:
    (dashboard)/info      About, FAQ, contact — removed Session 10

lib/
  study-plan-engine/
    types.ts              StudyPlanEngineInput (includes daySchedule?: Record<number,'study'|'review'|'rest'>);
                          StudyPlanEngineResult (optional inventoryExhausted + nearlyExhaustedSkills)
    domain-catalog.ts     8 SAT domains with CB QB labels, skills, point weights
    scoring.service.ts    rankDomains(), dailyQuestionTarget(), masteryTargetForDomain()
    difficulty.service.ts phase assignment (foundation/skill/advanced/strategy) + difficulty + skill focus
    scheduler.service.ts  buildSchedule() — uses daySchedule when provided; domain rotation via studyDayGlobalIdx counter
    plan-store.service.ts PlanStoreService.save() — inventory-aware assignment pipeline:
                          loadInventoryLimits() → buildSlotsBySubject() → assignStudyBlock() per block
                          (per-skill cap, ≥80% time floor, pickSlot() substitution, substituteBlock()).
                          Bank exhaustion → bankCompleteToTask() + system notification.
    index.ts              StudyPlanEngine class — orchestrator
  adaptive-replanner/
    index.ts              runAdaptiveReplanner() — full v2 pipeline
    types.ts              ReplanTrigger | ReplannerResult | DomainChange | TaskUpdate
    topic-mastery.service.ts    6-factor mastery 0–100; computeTopicMastery(), saveTopicMastery(), volumeMultiplier()
    score-prediction.service.ts computeScorePrediction(), saveScorePrediction()
    missed-assignment.service.ts recoverMissedAssignments() — redistributes overdue tasks into next 14 days
    plan-version.service.ts     savePlanVersion(), restorePlanVersion()
    recommendations.service.ts  generateRecommendations(), saveRecommendations()
  constants.ts            NAV_LINKS (5 links — /info removed), MATH_DOMAINS, RW_DOMAINS, COLLEGE_BOARD_QB_URL, ERROR_TYPES, TEST_TYPES
  utils.ts                cn, todayISO, etc.

components/
  home/
    welcome-banner.tsx         Score progress bar, streak pill, test countdown. Lucide icons: Flame, CalendarDays, Target, PartyPopper.
    score-progress-bar.tsx     Session 28: fill bar is dark purple gradient (#3b0764→#581c87→#6b21a8) with
                               violet glow. Thumb is #c084fc with lavender border. Target score marker is
                               a gold Saturn SVG (40px, viewBox 18×18) — closed ellipse ring (back half behind
                               planet, front arc in front) with same gold colors/drop-shadow as original pill.
    score-card.tsx             Stat cards with colored accent stripe, Lucide icons, hover lift.
                               Session 28: Current Score + Target Score link to /data; Open Errors links to /error-log.
    ai-planner-trigger.tsx     "AI Adaptive Replanner" card — scores + test date + hours/day + day schedule picker.
    quick-stats.tsx            Summary stats row.
    upcoming-tasks.tsx         Next 3 upcoming tasks preview.
  calendar/
    calendar-client.tsx        Month/week/agenda orchestrator + drag-and-drop.
                               Past cells muted, today cell violet tint, week view today-column border.
                               Routes 'Review Session' category to ReviewSessionDialog.
    task-drawer.tsx            Slide-over: QB filters, ClipboardList icon label, instructions, replanner stats, session buttons.
    review-session-dialog.tsx  Slide-over for 'Review Session' tasks: lists active (unmastered, unarchived)
                               error logs; per-entry mastered toggle + EditErrorDialog; Mark Session Complete footer.
    session-workflow-dialog.tsx  6-phase UX (idle→active→review→results→missed_analysis→plan_updated).
                               Session 25: full polish — animated phase transitions (160ms fade+translateY),
                               letter buttons A/B/C/D replacing Select dropdowns, card-per-question missed_analysis,
                               all CSS tokens consistent (no hardcoded slate/bg-slate-50), emoji removed from toast.
    practice-test-score-dialog.tsx  Do NOT modify.
    task-form-dialog.tsx       Manual task creation.
    task-colors.ts             Domain color map + 'Review Session' (slate) entry.
    day-tasks-panel.tsx        LEGACY — never rendered. Safe to delete.
    log-session-dialog.tsx     LEGACY — superseded by SessionWorkflowDialog. Safe to delete.
  inventory/
    inventory-client.tsx       Tab orchestrator (Overview / Inventory / Admin).
    summary-cards.tsx          4 stat cards: Available / Assigned / Completed / Remaining.
    progress-visualization.tsx SVG circular progress + section stacked bars.
    inventory-table.tsx        Sortable, filterable, paginated table with Remaining color badges.
    inventory-charts.tsx       Recharts: by-section bar, by-difficulty bar, most-depleted horizontal bar.
    inventory-admin.tsx        CRUD editor + bulk JSON/CSV import (file upload + paste).
    empty-state.tsx            Empty state with Import + Create buttons.
  data/
    data-client.tsx            Dashboard orchestrator (imports TopicMasteryCards + PredictedScoreWidget from ai-coach/).
    accuracy-trends.tsx, score-trend.tsx, topic-mastery-heatmap.tsx, topic-mastery-trends.tsx,
    mistake-frequency.tsx, study-time-chart.tsx, consistency-chart.tsx, replan-timeline.tsx,
    workload-redistribution.tsx, accuracy-heatmap.tsx, add-score-dialog.tsx
    topic-rankings.tsx         NOT IMPORTED — dead code, safe to delete.
    stats-cards.tsx, score-timeline.tsx, accuracy-chart.tsx, category-stats.tsx  — LEGACY, not imported. Safe to delete.
  ai-coach/                   Components shared with Data tab (route /ai-coach was deleted in Session 8).
    topic-mastery-cards.tsx   8 domain cards sorted weakest→strongest, color-coded by mastery tier.
                              Session 28: each card now has a colored border matching its mastery tier
                              (emerald/blue/amber/rose at 50% opacity). Proficient badge + bar explicitly
                              use blue-500 (no longer the accent CSS variable).
    predicted-score-widget.tsx Predicted score + CI + recharts trend line.
    plan-version-history.tsx  Version list with restore.
    ai-recommendations.tsx    AI coach message list with dismiss.
    ai-coach-panel.tsx        UNUSED — route deleted, file remains. Safe to delete.
  data/
    time-trend.tsx              NEW (Session 25): horizontal grouped bar chart — allocated vs actual time per domain.
  error-log/
    error-log-client.tsx        Session 25: added DomainPieChart (toggleable domain/subject/type modes) + MistakeTrendChart
                                (line chart by date) in a 2-col grid below FrequencySummary.
    error-row.tsx, add-error-dialog.tsx, edit-error-dialog.tsx, mistake-type-badge.tsx
  layout/
    navbar.tsx                Desktop nav (reads NAV_LINKS from constants.ts — 5 links).
    mobile-nav.tsx            Bottom nav: Home · Calendar · Errors · Data · Settings.
    notifications-dropdown.tsx Lucide icons: Clock (reminder), Trophy (achievement), Radio (system), Bot (ai_suggestion).
    saturn-path-logo.tsx, theme-toggle.tsx, theme-provider.tsx
  onboarding/
    onboarding-wizard.tsx     4-step flow (5 for unauthenticated): Goals → Time → Overview → Your Plan → Account.
                              step2Data is always defaultStep2 (all zeros) — performance entry removed.
    step-1-basics.tsx         Goals: current score + target score sliders only. No test date / daily time.
    step-2-time.tsx           NEW — Time: test date input + daily study preset buttons.
                              Updates step1Data (testDate, dailyStudyMinutes); step-2-performance.tsx is obsolete.
    step-3-analysis.tsx       Overview: score journey visual, days-to-test card, daily commitment card,
                              8-domain coverage list, adaptive-plan note. No performance chart. No "no practice data" message.
    step-4-recommendations.tsx Your Plan: CheckCircle2 hero, 4 stat cards (score gap/days/daily/est. gain),
                              "What happens next" 3-step strip. Removed: AI message wall, priority topics, study tips list.
    wizard-progress.tsx       Step 2 label/icon changed from Performance/BarChart2 to Time/Clock.
  settings/
    notification-prefs.tsx    ClipboardList/CalendarDays/AlertTriangle/FileText icons (no emoji).
  tutorial/
    tutorial-client.tsx       7-step QB walkthrough. "Critical" badge text (no emoji).
  ui/                         shadcn/ui primitives — do not modify.

  DELETED (Session 10):
    components/info/          about-section.tsx, faq-accordion.tsx, contact-form.tsx

hooks/
  use-replan-logs.ts          Client-side replan_audit_logs fetch (bypasses router cache) — KEEP in data-client.tsx.
  use-calendar-tasks-range.ts Flexible date-range loader for calendar views.
  use-error-logs.ts           All errors once; client-side filter/sort.
  use-score-history.ts, use-calendar-tasks.ts

types/
  database.ts    Full row/insert/update types for all 12 tables.
  index.ts       App-level re-exports (User, CalendarTask, TopicMastery, PlanVersion, ScorePrediction, AdaptiveRecommendation, ...).
                 NOTE: AIPlanRequest, AIStudyPlan, AIPlanWeek, AIPlanTask are exported but unused since Session 8.

supabase/schema.sql   Complete reference schema + all ALTER TABLE migrations.
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
- Default: Mon–Fri=study, Sat=review, Sun=rest
- Practice tests land on the **last study day** of the week (Friday by default) every 2 weeks, starting at week 2.
- A mandatory practice test is always placed **2 calendar days before the test date**, bypassing the biweekly cadence.
- The **test date itself** is appended to the schedule as a `test_day` entry → creates a `'SAT Test Day'` calendar task (amber color on the calendar).
- With `daySchedule`: any DOW can be any type; the last DOW classified as `'study'` is the practice-test promotion slot.
- Each study day produces **two** tasks: one R&W domain block + one Math domain block
- Two independent rotation counters (`rwStudyDayGlobalIdx` / `mathStudyDayGlobalIdx`) drive separate 7-slot pools per subject
- Each block gets `floor(dailyStudyMinutes / 2)` minutes; question count uses 90% efficiency factor

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

3. **Time Trend** — `components/data/time-trend.tsx`
   - Horizontal grouped bar chart: allocated time vs actual time per domain
   - Allocated = completed `calendar_tasks.duration_minutes`; Actual = `question_sessions.time_spent_minutes`
   - Applies the same date-range filter as other sections via `filteredTasks` in `data-client.tsx`

4. **Study Habits** — StudyTimeChart + ConsistencyChart

5. **Planning Intelligence** — ReplanTimeline + WorkloadRedistribution

> `PredictedScoreWidget` and `TopicMasteryCards` do NOT apply the date-range filter — they always show all-time data.
> `topic-rankings.tsx` was removed in Session 8. File still exists but is not imported.
> **Mistake Analysis section was deleted in Session 25.** `components/data/mistake-frequency.tsx` still exists but is no longer imported by `data-client.tsx`. Its `ErrorSummary` type is still referenced in `DataClientProps`.

---

## Auth

### Env hardening (Session 18)
- `lib/supabase/env.ts` — `getSupabaseUrl()` / `getSupabaseAnonKey()` validate `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and throw a clear, actionable error if missing/empty. Used by `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `proxy.ts` (replacing the unsafe `process.env.X!` non-null assertions). A misconfigured deployment now fails loudly instead of letting the Supabase SDK hang an auth call.
- `lib/app-url.ts` — `getAppUrl()` returns the absolute origin for email/redirect links, preferring `NEXT_PUBLIC_APP_URL`, then `VERCEL_URL`, then localhost. **Treats empty strings as unset** (uses `.trim()` truthiness, not `??`). This fixes a production bug: `NEXT_PUBLIC_APP_URL` was `""` in prod, and `"" ?? fallback` is `""`, so `emailRedirectTo` became the relative `"/auth/confirm"` (no origin) and broke the confirmation link. Used by `actions/auth.ts` and `actions/onboarding.ts`.
- All client-side auth handlers wrap their server-action call in `try/catch` (re-throwing `NEXT_REDIRECT`) so a thrown server error shows a message/toast instead of leaving the button stuck on "Saving…/Signing in…": `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `components/onboarding/onboarding-wizard.tsx`.

### Signup flow
- Primary path is the onboarding wizard (login page "Create one free" → `/onboarding`); `signUpAndSaveOnboarding()` calls `supabase.auth.signUp()`. The standalone `/signup` page → `actions/auth.ts signUp()` is the secondary path.
- **Eager persistence (Session 18):** `signUpAndSaveOnboarding()` no longer bails on `!data.session`. When confirmation is pending it persists the profile + question_sessions + study plan + score_history + notification using the **service-role admin client** (`createAdminClient()`), keyed to `data.user.id` (RLS would block writes with no session). The profile is **upserted** with `has_completed_onboarding: true`. Result: once the user confirms their email and signs in, onboarding is already done and they go **straight to the dashboard** (no re-onboarding). When confirmation is off, the authenticated session client is used as before. Returns `{ needsConfirmation: true }` after persistence.
- The standalone `/signup` page has no onboarding data, so those users still complete onboarding after their first sign-in.
- Both paths render a "Check your email" card when `data.session === null`. If confirmation is off, the session exists immediately and the user is redirected to `/home`.

### Email confirmation landing (Session 18)
- `signUp()` / `signUpAndSaveOnboarding()` set `emailRedirectTo: <appUrl>/auth/confirm`.
- Supabase verifies the email at its own `/auth/v1/verify` endpoint **before** redirecting to `/auth/confirm`, so the account is already confirmed when the page loads.
- `app/auth/confirm/page.tsx` (client) now: reads `error`/`error_description` from query **and** hash → if present, shows the error with a "Back to sign in" link; otherwise calls `supabase.auth.signOut()` (clears any transient session from the redirect so the proxy does not bounce the user onward to `/home`→`/onboarding`) and hard-navigates to `/login?confirmed=1`.
- `app/(auth)/login/page.tsx` shows a green "Your email is confirmed. Sign in to continue." banner on `?confirmed=1`, and surfaces `?error=...` as a red banner.
- Net effect: clicking the confirmation link lands on the **login landing page**, never the onboarding wizard.

### Guest preview (Session 18)
- `actions/onboarding.ts guestPreview()` — `signInAnonymously()` → upserts a demo profile (`full_name: 'Guest'`, scores 1050→1350, test date +84d, `has_completed_onboarding: true`) → seeds a sample plan via `StudyPlanEngine` (all 8 domains seeded weak) + a baseline `score_history` row. No question_sessions / notification / replanner (lighter than full onboarding). The anonymous user is disposable; nothing personal is collected.
- Entry points: a **"Preview the dashboard as a guest"** button on both `app/(auth)/signup/page.tsx` and `app/(auth)/login/page.tsx` (the login page is the real entry — `/signup` isn't linked in-app). On success the handler does `window.location.assign('/home')`.
- The dashboard already handles anonymous users: `app/(dashboard)/home/page.tsx` renders `<GuestUpgradeBanner>` when `user.is_anonymous`; that banner converts the guest via `upgradeGuestAccount()`.
- **Requires** Supabase → Authentication → Sign In/Providers → **"Allow anonymous sign-ins" enabled** (it currently is). Unlike `guestOnboarding` (the wizard's gated step-5 path), `guestPreview` is **not** gated by `ENABLE_GUEST_ONBOARDING`. Abuse note: anonymous auth is a spam/cost vector — add Supabase Auth CAPTCHA/Turnstile + an anon-user cleanup job before heavy traffic.

### Google OAuth (Session 23)
- `app/auth/callback/route.ts` — route handler (GET). Exchanges `?code=` for a session via `exchangeCodeForSession()`, then checks the `users` row for `terms_accepted_at`:
  - No row / no `terms_accepted_at` → `/auth/google-consent` (new user)
  - Has terms + onboarding done → `/home`
  - Has terms + onboarding pending → `/onboarding`
- `app/auth/google-consent/page.tsx` — standalone page (not in `(auth)` layout). Collects birth year + terms/parental ack for first-time Google users. Calls `saveGoogleConsent()` → redirects to `/onboarding`.
- `actions/auth.ts saveGoogleConsent()` — validates age consent (same gate as email signup), upserts `birth_year`/`terms_accepted_at`/`parental_ack` using the authenticated session client.
- Login + signup pages: "Continue with Google" button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })` via the browser client.
- **Required Supabase setup:** Authentication → Providers → Google → Enable → paste `Client ID` + `Client Secret` from Google Cloud Console. Authorized callback URL in Google Cloud = `https://<project-ref>.supabase.co/auth/v1/callback`.

### To disable email confirmation (development)
Supabase Dashboard → Authentication → Settings → uncheck "Enable email confirmations"

---

## Nav

| Surface | Links |
|---|---|
| Desktop (`navbar.tsx`) | Home · Calendar · Error Log · Data · Tutorial |
| Mobile (`mobile-nav.tsx`) | Home · Calendar · Errors · Data · Settings |

Notes:
- `/info` route was **deleted in Session 10** — removed from `NAV_LINKS` in `lib/constants.ts`
- `/ai-coach` route was **deleted in Session 8** — `components/ai-coach/` components remain because the Data tab imports them

---

## Design System (Session 10)

The app uses **violet/purple** as primary (`#7c3aed` = `violet-600`), matching the logo.

### CSS Design Tokens (`app/globals.css`)
```css
/* Dark mode palette */
.dark {
  --background: #0c1524;
  --card: #172033;
  --border: #2a3a52;
  --muted: #1a2840;
  --muted-foreground: #8facc8;
  --shadow-violet: 0 10px 24px -6px rgba(109,40,217,0.45);
}

/* Shimmer skeleton animation */
.sp-shimmer { animation: sp-shimmer 1.6s ease-in-out infinite; }
@keyframes sp-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

/* Entrance animation */
@keyframes sp-fade-in-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
```

### Calendar visual states
| State | Styling |
|---|---|
| Past cell (month) | `bg-slate-50/70 dark:bg-slate-900/40`, muted day number |
| Today cell (month) | `bg-violet-50/60 dark:bg-violet-900/10` |
| Future cell with tasks | Small violet dot indicator |
| Today column (week) | `border-violet-300 dark:border-violet-700` |

### Icon policy
All emoji removed from component JSX. Replaced with Lucide React icons throughout.
Plain-text strings (toast titles) are also clean — no emoji.

### Blue colors intentionally kept (do not change)
- `components/home/score-card.tsx` — `blue` colorMap entry (Current Score card)
- `components/home/quick-stats.tsx` — Study Time stat icon
- `components/calendar/task-colors.ts` — Algebra domain color
- `components/error-log/mistake-type-badge.tsx` — Timing Issue badge (`time` key)
- All chart colors in `components/data/` — score-timeline, accuracy-trends, accuracy-chart, score-trend, mistake-frequency, category-stats, replan-timeline, stats-cards, data-client

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

## Dead Code

**All deleted in Session 31** (pre-launch audit). The 8 files below were confirmed
unimported anywhere and removed from the tree. The `app/beta/` route + `actions/beta.ts`
were also deleted (unreachable dead code that still shipped as a live public page).

| File | Why dead |
|---|---|
| `components/data/topic-rankings.tsx` | Removed from Data tab in Session 8; file not imported |
| `components/calendar/day-tasks-panel.tsx` | Legacy sidebar; never rendered in current calendar |
| `components/calendar/log-session-dialog.tsx` | Superseded by SessionWorkflowDialog |
| `components/data/stats-cards.tsx` | Legacy, not imported by data-client |
| `components/data/score-timeline.tsx` | Legacy, not imported (data tab uses score-trend.tsx instead) |
| `components/data/accuracy-chart.tsx` | Legacy, not imported (data tab uses accuracy-trends.tsx) |
| `components/data/category-stats.tsx` | Legacy, not imported |
| `components/ai-coach/ai-coach-panel.tsx` | Route deleted in Session 8; component unused |
| `app/beta/` (page + beta-gate-form) + `actions/beta.ts` | Beta gate removed in Session 24; self-contained, unlinked |

> `components/data/mistake-frequency.tsx` is NOT deleted — its `ErrorSummary` type is still
> referenced by `DataClientProps`. `components/onboarding/step-2-performance.tsx` is obsolete
> but kept on disk (not imported).

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=         # bare project URL, no /rest/v1/
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; cron + admin inventory writes + eager signup persistence
ADMIN_EMAILS=                     # comma-separated; gates GLOBAL inventory writes. Unset = nobody can write.
CRON_SECRET=                      # REQUIRED — /api/reminders/daily refuses to run if missing
RESEND_API_KEY=                   # resend.com → API Keys
RESEND_FROM_EMAIL=                # must be a verified Resend sender, e.g. "SaturnPath <hi@yourdomain.com>"
                                  # use "SaturnPath <onboarding@resend.dev>" for local dev/testing only
NEXT_PUBLIC_APP_URL=              # REQUIRED in prod, must be NON-EMPTY (e.g. https://sat-prep-website-gold.vercel.app); used in email links and OAuth redirects. Empty "" breaks the signup link.
# ENABLE_GUEST_ONBOARDING=true    # OFF by default; anonymous accounts are a spam/cost vector
```

Set in `.env.local` for local dev; Vercel/Supabase dashboards for production. See `.env.local.example`.

> ⚠️ **Do NOT keep a stray `OPENAI_API_KEY`** in `.env.local` — the app has zero OpenAI usage. If one exists, delete and rotate it.

---

## Security Hardening (Session 17) — REQUIRED manual steps before launch

Code fixes are committed, but two things must be done in the live environment:

1. **Apply the RLS migration in the Supabase SQL Editor** (defense-in-depth for the inventory fix; `schema.sql` is reference-only):
   ```sql
   -- Inventory: authenticated may READ only; writes go through service-role + admin gate
   DROP POLICY IF EXISTS "Authenticated users can insert question inventory" ON question_inventory;
   DROP POLICY IF EXISTS "Authenticated users can update question inventory" ON question_inventory;
   DROP POLICY IF EXISTS "Authenticated users can delete question inventory" ON question_inventory;
   -- (SELECT policy stays as-is)

   -- Harden the SECURITY DEFINER signup trigger against search_path hijack
   CREATE OR REPLACE FUNCTION handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, full_name)
     VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
   ```
2. **Set `ADMIN_EMAILS` + `CRON_SECRET`** in Vercel prod env. Without `ADMIN_EMAILS`, the `/inventory` admin editor will (correctly) reject all writes. Without `CRON_SECRET`, the reminders endpoint returns 500 (fails closed).

Still open (documented, not yet implemented): app-layer rate limiting / CAPTCHA on auth (M7), cron per-user N+1 + 300s timeout risk at ~10k users (M4), unbounded `select('*')` on `/data` (M6), anonymous-user cleanup job (L6). Legal pages (`/privacy`, `/terms`) are baselines — **have counsel review before public launch**, and replace the placeholder contact emails.

---

## Session History

| Session | Key changes |
|---|---|
| 1–5 | Initial build: auth, onboarding, study plan engine, calendar, error log, data page |
| 6 | Adaptive Replanner v1: `replan_audit_logs`, priority_score, replanning_weight, calendar task metadata |
| 7 | Error log rebuild: search/filter/archive, confidence rating, question ID, auto error creation |
| 8 | Adaptive Replanner v2: topic_mastery, plan_versions, score_predictions, adaptive_recommendations; deleted /ai-coach route; removed TopicRankings |
| 9 | Session workflow overhaul: missed_analysis phase, auto error log creation, plan_updated screen, timer |
| 10 | UI/UX overhaul: design tokens, Lucide icons throughout (all emoji removed), dark mode palette, calendar visual states, chart tooltip polish. Deleted /info page + components. |
| 11 | Question Inventory page (`/inventory`): `question_inventory` table, CRUD + bulk import actions, stat cards, charts, admin editor, planner integration (inventory cap on plan generation) |
| 12 | Removed `'Systems of equations'` from Advanced Math domain in `domain-catalog.ts`, `constants.ts`, `lib/sat-planner.ts` |
| 13 | Premium UI/UX rebuild (foundation only): design tokens (`@theme` ramps, surface-elevation, shadow scale), refined UI primitives, new sidebar + topbar layout shell. Branch `ui-rebuild-premium`. No functional changes. |
| 14 | Dual-block study days, inline review errors, practice test rescheduling, test date marker |
| 15 | Review Day overhaul: single `'Review Session'` task per review day (replaces per-domain blocks); new `ReviewSessionDialog` component with inline error-log mastered toggle + edit |
| 16 | Inventory-aware question assignment: replaced `applyInventoryCap()` with full `assignStudyBlock()` pipeline — per-skill inventory cap, ≥80% time floor, cross-skill substitution by adaptive priority, bank-complete tasks + notification; `StudyPlanEngineResult` gains optional `inventoryExhausted` + `nearlyExhaustedSkills` fields |
| 17 | **Launch-readiness security audit + fixes.** C1: global `question_inventory` writes locked to admins (`lib/auth/is-admin.ts` + service-role client; RLS now SELECT-only). H1: `/api/reminders/daily` auth now fails CLOSED (requires `CRON_SECRET`, timing-safe). H2: anonymous `guestOnboarding` gated behind `ENABLE_GUEST_ONBOARDING` (off). H3: added `/privacy` + `/terms` (`app/(legal)/`), fixed signup link (was dead `/info`). M1: CSP header (`next.config.ts`, dev-only `unsafe-eval`). M2: `handle_new_user` `SET search_path`. Cleanup: removed deprecated `X-XSS-Protection`, stale `/info` from `proxy.ts`/`robots.ts`. New env: `ADMIN_EMAILS`, `ENABLE_GUEST_ONBOARDING`. |
| 22 | **Legal compliance (US-only).** Age gate (13+, under-18 parental ack) enforced in `validateAgeConsent` (`lib/legal/config.ts`) on both signup paths; new `users` columns `birth_year`/`terms_accepted_at`/`parental_ack`. Self-service account deletion (`actions/account.ts` + Settings danger-zone + `/login?deleted=1`). Central `LEGAL` config; tightened Privacy (CCPA/SOPIPA/cookies) + Terms; Privacy/Terms links + SAT-trademark disclaimer on landing/login; waitlist consent microcopy; CAN-SPAM email footer (entity+address); non-blocking `CookieNotice`. New `LEGAL_COMPLIANCE.md` (obligations matrix + pre-launch checklist). |
| 24 | **Public launch.** Beta gate removed from `proxy.ts` (deleted `betaToken` fn + step-0 block + `/beta` from matcher). Landing page CTAs replaced: "Join Waitlist" → "Get started free" (→ `/signup`); "Sign in for beta" → "Sign in"; `WaitlistForm` email-capture component removed entirely; hero + closing-CTA sections now have direct signup/login buttons. `getLandingStats()` in `actions/waitlist.ts` now counts from `users` table (not `waitlist_signups`) so the stats strip shows actual user count. `Flag`, `Loader2`, `Input`, `Label` lucide/ui imports removed from landing-page.tsx. `app/beta/` + `actions/beta.ts` remain on disk as dead code (unreachable with no env var set and no proxy gate). |
| 23 | **Google OAuth sign-in/sign-up.** `app/auth/callback/route.ts` — route handler exchanges OAuth code for session, checks `terms_accepted_at` to distinguish new vs returning Google users, routes to `/auth/google-consent` (new) or `/home`/`/onboarding`. `app/auth/google-consent/page.tsx` — standalone consent page (birth year + terms/parental ack) for first-time Google users; mirrors the age gate from email signup. `actions/auth.ts saveGoogleConsent()` — server action validates consent, upserts `birth_year`/`terms_accepted_at`/`parental_ack`, redirects to `/onboarding`. Login + signup pages gain "Continue with Google" button (Supabase `signInWithOAuth` client-side; Google "G" SVG icon). **Requires manual Supabase setup:** Authentication → Providers → Google → enable + paste Google OAuth Client ID/Secret (from Google Cloud Console; callback URL = `<project>.supabase.co/auth/v1/callback`). |
| 25 | **Onboarding UX overhaul.** Removed "Performance" tab (no more practice data entry). New 4-step flow: Goals (scores only) → Time (test date + daily commitment) → Overview (score journey visual, timeline, 8-domain list) → Your Plan (stat cards + "what happens next"). `step-2-performance.tsx` is obsolete (kept on disk, not imported). `step-2-time.tsx` is new. Wizard always passes `defaultStep2` (all zeros) to `saveOnboarding` — domains start with equal priority and adapt via practice sessions. No DB schema changes. |
| 26 | **Error log charts + Data tab time trend + Session workflow dialog polish.** Error log: added `DomainPieChart` (toggleable domain/subject/type breakdown with matching domain hex colors) + `MistakeTrendChart` (violet line chart by date) in a 2-col grid. Subject colors: Math=#3b82f6, R&W=#7c3aed. Data tab: deleted Mistake Analysis section; added Time Trend section (`components/data/time-trend.tsx`) showing allocated vs actual time per domain as a horizontal grouped bar chart; `filteredTasks` computation added to `data-client.tsx`. Session workflow dialog: complete rewrite with 160ms fade+translateY phase transitions, A/B/C/D letter buttons (violet=your answer, emerald=correct answer), card-per-question missed_analysis layout, all tokens consistent (`bg-[var(--surface-sunken)]` etc.), emoji removed from "Time's up!" toast. |
| 27 | **Resend email system.** Signup confirmation emails now sent via Resend with a branded template (`lib/email/confirmation-template.ts`). Both `signUp()` (`actions/auth.ts`) and `signUpAndSaveOnboarding()` (`actions/onboarding.ts`) now use `admin.auth.admin.generateLink({ type: 'signup' })` to get the confirmation URL without triggering Supabase's own SMTP, then send via Resend. Daily reminder emails were already code-complete (`/api/reminders/daily`, `lib/email/reminder-template.ts`, Vercel cron `0 13 * * *` in `vercel.json`). Fixed `RESEND_FROM_EMAIL` placeholder from `noreply@example.com` to `onboarding@resend.dev` for local dev. **Production requires a verified Resend domain** — add it at resend.com/domains and update `RESEND_FROM_EMAIL` in Vercel env. |
| 28 | **UI polish — home dashboard + analytics cards.** `score-progress-bar.tsx`: fill bar → dark purple gradient (`#3b0764→#581c87→#6b21a8`) with violet glow; thumb → `#c084fc`; target marker → gold Saturn SVG (40px, closed ellipse ring with layered front/back arcs). `home/page.tsx`: Current Score + Target Score → `href="/data"`; Open Errors → `href="/error-log"`. `topic-mastery-cards.tsx`: per-card colored border (emerald/blue/amber/rose at 50%); Proficient badge + bar changed from accent CSS var to explicit `blue-500`. Page title icon badges (violet, matching Inventory): Calendar (`Calendar`), Error Log (`ClipboardList`), Analytics (`BarChart3` in `data-client.tsx`), Tutorial (`GraduationCap` in `tutorial-client.tsx`). No DB or schema changes. |
| 30 | **Brand logo update.** Replaced all `saturn-mark.svg`/`saturn-mark-white.svg` usages with `public/logo.svg`. `components/layout/saturn-path-logo.tsx`: mark is now always `logo.svg` (purple gradients work on both light and dark backgrounds). `components/marketing/landing-page.tsx` `SaturnIllustration`: upgraded to logo.svg visual style — explicit purple gradients (`#7c3aed→#a855f7` planet, `#7c3aed→#a855f7→#c084fc` ring), accent dots at ring arc positions, star decorations; all animation code and `ringRef`/`ringIdle` props unchanged. `app/(auth)/layout.tsx`: removed inline `SaturnIllustration` SVG, replaced with `<img src="/logo.svg">` styled with `brightness(0) invert(1)` + drop-shadow glow for the white-glowing brand panel illustration. No DB or schema changes. |
| 31 | **Pre-launch UI/UX + workflow audit.** Added the SAT trademark disclaimer to the `/login` and `/signup` pages (previously only on the landing page; now on all three per the legal checklist). Wired the **"Replan now" button** on the Home `AIPlannerTrigger` card → `triggerManualReplan()` (re-prioritizes existing future tasks from latest session data, with toast + loading state) — closes the documented "no UI entry point" gap. Gated the Settings page's "Email setup required" dev note to `NODE_ENV !== 'production'` (it leaked internal env-var names incl. `SUPABASE_SERVICE_ROLE_KEY` to end users) and replaced its 📧 emoji with a Lucide `Mail` icon. Removed 3 stale `revalidatePath('/ai-coach')` calls (deleted route) from `actions/adaptive-replanner.ts`. **Deleted dead code:** 8 unimported legacy components + the unreachable `app/beta/` route and `actions/beta.ts`. Verified: build passes (0 type errors), no console errors on `/login`, all public routes (`/`, `/login`, `/signup`, `/privacy`, `/terms`) return 200, copyright year is dynamic (2026), nav (sidebar/mobile) matches `NAV_LINKS` (6 links incl. Inventory). Note: the notifications bell already surfaces an unread badge client-side, and the QB tutorial `ScreenshotPlaceholder` renders gracefully — both pre-existing, no change needed. |
| 18 | **Signup + email-confirmation fix** (review feedback: "signup link did nothing, probably a missing env var"). Added `lib/supabase/env.ts` with validated `getSupabaseUrl()`/`getSupabaseAnonKey()` (clear error instead of a silent hang on missing `NEXT_PUBLIC_SUPABASE_*`); wired into server/client/proxy. Added `lib/app-url.ts getAppUrl()` (empty-string-safe origin) — fixes prod `NEXT_PUBLIC_APP_URL=""` producing a relative `emailRedirectTo`; used by `actions/auth.ts` + `actions/onboarding.ts`. Wrapped login/signup/onboarding-wizard server-action calls in `try/catch` (re-throwing `NEXT_REDIRECT`) so failures surface instead of hanging the button. Reworked `app/auth/confirm/page.tsx`: clears any transient session and redirects to `/login?confirmed=1` (was `/home`, which bounced new users into `/onboarding`); login page shows a confirmed/error banner. **Eager signup persistence:** `signUpAndSaveOnboarding()` now writes profile+plan via the service-role admin client when confirmation is pending (upsert `has_completed_onboarding: true`), so a confirmed user lands straight on the dashboard instead of re-onboarding. |
