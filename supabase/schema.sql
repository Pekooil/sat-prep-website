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
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS priority_score         NUMERIC  DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS mastery_target         INTEGER  DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS estimated_score_impact NUMERIC  DEFAULT 0;
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replanning_weight      NUMERIC  DEFAULT 0;
-- replan_locked: set TRUE when a task is completed; the Adaptive Replanner must skip locked rows.
ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS replan_locked          BOOLEAN  DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user_date ON calendar_tasks(user_id, task_date);
-- Adaptive Replanner query: future unlocked tasks ordered by priority
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_replanner ON calendar_tasks(user_id, task_date, replanning_weight) WHERE NOT replan_locked;
CREATE INDEX IF NOT EXISTS idx_error_logs_user_subject ON error_logs(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_score_history_user_date ON score_history(user_id, test_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- RLS Policies
CREATE POLICY "Users can manage own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own diagnostics" ON diagnostic_tests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON calendar_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON question_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own errors" ON error_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own scores" ON score_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
