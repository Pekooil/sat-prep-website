-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  target_score INTEGER DEFAULT 1550,
  current_score INTEGER,
  test_date DATE,
  study_hours_per_week INTEGER DEFAULT 10,
  daily_study_minutes INTEGER DEFAULT 60,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add columns if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_study_minutes INTEGER DEFAULT 60;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- diagnostic_tests
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  math_score INTEGER CHECK (math_score BETWEEN 200 AND 800),
  reading_writing_score INTEGER CHECK (reading_writing_score BETWEEN 200 AND 800),
  total_score INTEGER GENERATED ALWAYS AS (COALESCE(math_score, 0) + COALESCE(reading_writing_score, 0)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- study_plans
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  ai_generated BOOLEAN DEFAULT FALSE,
  plan_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- calendar_tasks
CREATE TABLE IF NOT EXISTS calendar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'reading_writing', 'both')),
  category TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  college_board_filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- question_sessions
CREATE TABLE IF NOT EXISTS question_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_task_id UUID REFERENCES calendar_tasks(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'reading_writing')),
  category TEXT NOT NULL,
  subcategory TEXT,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  time_spent_minutes INTEGER,
  college_board_filters JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- error_logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_session_id UUID REFERENCES question_sessions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'reading_writing')),
  category TEXT NOT NULL,
  subcategory TEXT,
  error_type TEXT NOT NULL CHECK (error_type IN ('concept', 'careless', 'time', 'strategy', 'other')),
  description TEXT NOT NULL,
  my_answer TEXT,
  correct_approach TEXT,
  college_board_domain TEXT,
  college_board_skill TEXT,
  mastered BOOLEAN DEFAULT FALSE,
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- score_history
CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('diagnostic', 'practice', 'official', 'full_length')),
  test_date DATE NOT NULL,
  math_score INTEGER CHECK (math_score BETWEEN 200 AND 800),
  reading_writing_score INTEGER CHECK (reading_writing_score BETWEEN 200 AND 800),
  total_score INTEGER GENERATED ALWAYS AS (COALESCE(math_score, 0) + COALESCE(reading_writing_score, 0)) STORED,
  math_section_breakdown JSONB,
  reading_writing_section_breakdown JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'achievement', 'system', 'ai_suggestion')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Adaptive Replanner columns on calendar_tasks
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS priority_score         NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS mastery_target         INTEGER    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS estimated_score_impact NUMERIC    DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replanning_weight      NUMERIC    DEFAULT 0;
-- replan_locked: set TRUE when a task is completed; the Adaptive Replanner must skip locked rows.
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replan_locked          BOOLEAN    DEFAULT FALSE;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS last_replanned_at      TIMESTAMPTZ;

-- replan_audit_logs: immutable record of every replanning run
CREATE TABLE IF NOT EXISTS replan_audit_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by     TEXT        NOT NULL CHECK (triggered_by IN ('question_session','error_log','practice_test_score','manual')),
  trigger_id       UUID,
  tasks_updated    INTEGER     DEFAULT 0,
  domains_reprioritized JSONB,
  changes_summary  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replan_audit_user ON replan_audit_logs(user_id, created_at DESC);
ALTER TABLE replan_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own replan logs" ON replan_audit_logs FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user_date ON calendar_tasks(user_id, task_date);
-- Adaptive Replanner query: future unlocked tasks ordered by priority
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_replanner ON calendar_tasks(user_id, task_date, replanning_weight) WHERE NOT replan_locked;
CREATE INDEX IF NOT EXISTS idx_error_logs_user_subject ON error_logs(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_score_history_user_date ON score_history(user_id, test_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Auto-create user profile on signup
-- SECURITY DEFINER runs with the function owner's privileges. Pinning
-- search_path prevents a malicious object in another schema from shadowing
-- `users` / `INSERT` and hijacking the elevated execution context.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Migration: Error Log enhancements (sessions 3 & 4)
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS corrected_explanation TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS confidence_rating     INTEGER CHECK (confidence_rating BETWEEN 1 AND 5);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS archived              BOOLEAN DEFAULT FALSE;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS custom_mistake_type   TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS question_id           TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS student_answer        TEXT CHECK (student_answer IN ('A','B','C','D'));
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS correct_answer        TEXT CHECK (correct_answer IN ('A','B','C','D'));
CREATE INDEX IF NOT EXISTS idx_error_logs_user_archived ON error_logs(user_id, archived);

-- ─── Adaptive Replanner v2 — new tables ────────────────────────────────────

-- topic_mastery: computed 6-factor mastery snapshot (0-100) per domain per user
CREATE TABLE IF NOT EXISTS topic_mastery (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_key                TEXT        NOT NULL,
  domain_label              TEXT        NOT NULL,
  subject                   TEXT        NOT NULL CHECK (subject IN ('math','reading_writing')),
  mastery_score             NUMERIC     NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  accuracy_score            NUMERIC     DEFAULT 0,
  recent_accuracy           NUMERIC     DEFAULT 0,
  improvement_factor        NUMERIC     DEFAULT 0,
  mistake_cleanliness       NUMERIC     DEFAULT 0,
  confidence_factor         NUMERIC     DEFAULT 0,
  consistency_factor        NUMERIC     DEFAULT 0,
  total_questions_attempted INTEGER     DEFAULT 0,
  total_sessions            INTEGER     DEFAULT 0,
  computed_at               TIMESTAMPTZ DEFAULT NOW(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, domain_key)
);
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mastery" ON topic_mastery FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON topic_mastery(user_id);

-- plan_versions: snapshot of future tasks before each replan (for compare/restore)
CREATE TABLE IF NOT EXISTS plan_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id   UUID        REFERENCES study_plans(id) ON DELETE SET NULL,
  version_number  INTEGER     NOT NULL DEFAULT 1,
  triggered_by    TEXT        NOT NULL,
  reason          TEXT,
  tasks_snapshot  JSONB       NOT NULL DEFAULT '[]',
  tasks_updated   INTEGER     DEFAULT 0,
  predicted_score NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own versions" ON plan_versions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_plan_versions_user ON plan_versions(user_id, created_at DESC);

-- score_predictions: history of predicted SAT scores with confidence intervals
CREATE TABLE IF NOT EXISTS score_predictions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_score    INTEGER     NOT NULL,
  confidence_low     INTEGER     NOT NULL,
  confidence_high    INTEGER     NOT NULL,
  baseline_score     INTEGER,
  consistency_factor NUMERIC,
  session_count      INTEGER,
  mastery_snapshot   JSONB,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE score_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own predictions" ON score_predictions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_score_predictions_user ON score_predictions(user_id, created_at DESC);

-- adaptive_recommendations: AI coach messages generated per replan
CREATE TABLE IF NOT EXISTS adaptive_recommendations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  replan_audit_log_id  UUID        REFERENCES replan_audit_logs(id) ON DELETE SET NULL,
  domain_key           TEXT,
  domain_label         TEXT,
  recommendation_type  TEXT        NOT NULL CHECK (recommendation_type IN (
    'increase_volume','reduce_volume','intervention',
    'maintenance','schedule_change','recovery','general'
  )),
  message              TEXT        NOT NULL,
  old_mastery          NUMERIC,
  new_mastery          NUMERIC,
  is_read              BOOLEAN     DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE adaptive_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recommendations" ON adaptive_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_recommendations_user ON adaptive_recommendations(user_id, created_at DESC);

-- Extend replan_audit_logs to accept 'behind_schedule' trigger
ALTER TABLE replan_audit_logs DROP CONSTRAINT IF EXISTS replan_audit_logs_triggered_by_check;
ALTER TABLE replan_audit_logs ADD CONSTRAINT replan_audit_logs_triggered_by_check
  CHECK (triggered_by IN ('question_session','error_log','practice_test_score','manual','behind_schedule'));

-- RLS Policies
CREATE POLICY "Users can manage own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own diagnostics" ON diagnostic_tests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON calendar_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON question_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own errors" ON error_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own scores" ON score_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ─── Reminder System — notification_preferences ────────────────────────────

-- Stores per-user reminder settings: channels, types, schedule, timezone.
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id),
  email_reminders_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_reminders_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  daily_assignment_reminder BOOLEAN     NOT NULL DEFAULT TRUE,
  overdue_reminder          BOOLEAN     NOT NULL DEFAULT TRUE,
  practice_test_reminder    BOOLEAN     NOT NULL DEFAULT TRUE,
  reminder_time             TIME        NOT NULL DEFAULT '08:00:00',
  timezone                  TEXT        NOT NULL DEFAULT 'America/New_York',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification_preferences"
  ON notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences(user_id);

-- ─── Performance Indexes (Block 5 — add without breaking existing) ──────────

-- calendar_tasks: most common query patterns
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user_date
  ON calendar_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user_completed
  ON calendar_tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user_locked
  ON calendar_tasks(user_id, replan_locked);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_category
  ON calendar_tasks(user_id, category) WHERE category IS NOT NULL;

-- question_sessions: aggregate queries by user + category
CREATE INDEX IF NOT EXISTS idx_question_sessions_user_date
  ON question_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_question_sessions_user_category
  ON question_sessions(user_id, category);

-- error_logs: filter by archived + user
CREATE INDEX IF NOT EXISTS idx_error_logs_user_category
  ON error_logs(user_id, category);

-- notifications: fast unread count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

-- score_predictions: latest prediction per user
CREATE INDEX IF NOT EXISTS idx_score_predictions_user_latest
  ON score_predictions(user_id, created_at DESC);

-- topic_mastery: sort by mastery score
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user_score
  ON topic_mastery(user_id, mastery_score);

-- adaptive_recommendations: unread per user
CREATE INDEX IF NOT EXISTS idx_adaptive_recs_user_unread
  ON adaptive_recommendations(user_id, is_read, created_at DESC);

-- ─── Additional RLS Policies ────────────────────────────────────────────────

-- plan_versions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plan_versions' AND policyname = 'Users can manage own plan_versions'
  ) THEN
    CREATE POLICY "Users can manage own plan_versions"
      ON plan_versions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- topic_mastery
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topic_mastery' AND policyname = 'Users can manage own topic_mastery'
  ) THEN
    CREATE POLICY "Users can manage own topic_mastery"
      ON topic_mastery FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- score_predictions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'score_predictions' AND policyname = 'Users can manage own predictions'
  ) THEN
    CREATE POLICY "Users can manage own predictions"
      ON score_predictions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── Question Inventory — Block 6 Migration ────────────────────────────────────
-- Global catalog of College Board Question Bank available question counts.
-- Admin-managed; no user_id (shared across all users).

CREATE TABLE IF NOT EXISTS question_inventory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section         TEXT        NOT NULL CHECK (section IN ('Reading and Writing', 'Math')),
  domain          TEXT        NOT NULL,
  skill           TEXT        NOT NULL,
  difficulty      TEXT        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  available_count INTEGER     NOT NULL DEFAULT 0 CHECK (available_count >= 0),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT question_inventory_unique UNIQUE (section, domain, skill, difficulty)
);
ALTER TABLE question_inventory ENABLE ROW LEVEL SECURITY;

-- Inventory is GLOBAL shared state (no user_id). Authenticated users may only
-- READ it. Writes are performed exclusively by the service-role client (which
-- bypasses RLS) behind an admin allowlist gate in actions/question-inventory.ts
-- (assertAdmin → ADMIN_EMAILS). This prevents any logged-in student — or an
-- anonymous guest — from deleting/poisoning the catalog for all users.
-- Drop any legacy permissive write policies if upgrading an existing database.
DROP POLICY IF EXISTS "Authenticated users can insert question inventory" ON question_inventory;
DROP POLICY IF EXISTS "Authenticated users can update question inventory" ON question_inventory;
DROP POLICY IF EXISTS "Authenticated users can delete question inventory" ON question_inventory;
DROP POLICY IF EXISTS "Authenticated users can read question inventory"   ON question_inventory;
CREATE POLICY "Authenticated users can read question inventory"
  ON question_inventory FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_question_inventory_section_domain
  ON question_inventory(section, domain, difficulty);

-- Development seed data (placeholder counts — replace with actual CB QB counts)
INSERT INTO question_inventory (section, domain, skill, difficulty, available_count) VALUES
  ('Math', 'Algebra', 'Linear equations in one variable',  'easy',   80),
  ('Math', 'Algebra', 'Linear equations in two variables', 'easy',   70),
  ('Math', 'Algebra', 'Linear functions',                  'medium', 65),
  ('Math', 'Algebra', 'Systems of linear equations',       'medium', 60),
  ('Math', 'Algebra', 'Linear inequalities',               'hard',   55),
  ('Math', 'Advanced Math', 'Equivalent expressions',              'easy',   65),
  ('Math', 'Advanced Math', 'Nonlinear equations in one variable', 'medium', 62),
  ('Math', 'Advanced Math', 'Systems of equations',                'medium', 58),
  ('Math', 'Advanced Math', 'Nonlinear functions',                 'hard',   50),
  ('Math', 'Problem-Solving and Data Analysis', 'Ratios, rates, and proportional relationships',                'easy',   70),
  ('Math', 'Problem-Solving and Data Analysis', 'Percentages',                                                   'easy',   65),
  ('Math', 'Problem-Solving and Data Analysis', 'One-variable data: distributions and measures of center and spread', 'medium', 60),
  ('Math', 'Problem-Solving and Data Analysis', 'Two-variable data: models and scatterplots',                    'medium', 55),
  ('Math', 'Problem-Solving and Data Analysis', 'Probability and conditional probability',                       'medium', 52),
  ('Math', 'Problem-Solving and Data Analysis', 'Inference from sample statistics and margin of error',          'hard',   45),
  ('Math', 'Problem-Solving and Data Analysis', 'Evaluating statistical claims',                                 'hard',   48),
  ('Math', 'Geometry and Trigonometry', 'Area and volume',                  'easy',   58),
  ('Math', 'Geometry and Trigonometry', 'Lines, angles, and triangles',     'easy',   55),
  ('Math', 'Geometry and Trigonometry', 'Right triangles and trigonometry', 'medium', 52),
  ('Math', 'Geometry and Trigonometry', 'Circles',                          'hard',   45),
  ('Reading and Writing', 'Information and Ideas', 'Central ideas and details',          'easy',   85),
  ('Reading and Writing', 'Information and Ideas', 'Command of evidence (textual)',       'medium', 72),
  ('Reading and Writing', 'Information and Ideas', 'Command of evidence (quantitative)', 'medium', 68),
  ('Reading and Writing', 'Information and Ideas', 'Inferences',                         'hard',   60),
  ('Reading and Writing', 'Craft and Structure', 'Words in context',           'easy',   90),
  ('Reading and Writing', 'Craft and Structure', 'Text structure and purpose', 'medium', 75),
  ('Reading and Writing', 'Craft and Structure', 'Cross-text connections',     'hard',   55),
  ('Reading and Writing', 'Expression of Ideas', 'Transitions',          'easy',   75),
  ('Reading and Writing', 'Expression of Ideas', 'Rhetorical synthesis', 'medium', 65),
  ('Reading and Writing', 'Standard English Conventions', 'Boundaries',                'easy',   80),
  ('Reading and Writing', 'Standard English Conventions', 'Form, structure, and sense', 'medium', 72)
ON CONFLICT (section, domain, skill, difficulty) DO NOTHING;
