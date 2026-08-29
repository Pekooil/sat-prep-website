-- SaturnPath V2 student practice and adaptation state.
-- Identity references auth.users directly so V2 remains isolated from V1 profile drift.

create table public.v2_daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_date date not null,
  total_minutes integer not null check (total_minutes between 0 and 600),
  new_minutes integer not null check (new_minutes >= 0),
  review_minutes integer not null check (review_minutes >= 0),
  math_minutes integer not null check (math_minutes >= 0),
  reading_writing_minutes integer not null check (reading_writing_minutes >= 0),
  math_completed_value numeric(10, 4) not null default 0 check (math_completed_value >= 0),
  reading_writing_completed_value numeric(10, 4) not null default 0 check (reading_writing_completed_value >= 0),
  review_completed_value numeric(10, 4) not null default 0 check (review_completed_value >= 0),
  skipped_low_value_questions integer not null default 0 check (skipped_low_value_questions >= 0),
  minutes_saved integer not null default 0 check (minutes_saved >= 0),
  savings_audit jsonb not null default '{}'::jsonb check (jsonb_typeof(savings_audit) = 'object'),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_daily_recommendations_user_date_unique unique (user_id, recommendation_date),
  constraint v2_daily_recommendations_minutes_check check (total_minutes = new_minutes + review_minutes),
  constraint v2_daily_recommendations_subject_minutes_check check (
    total_minutes = math_minutes + reading_writing_minutes + review_minutes
  )
);

create table public.v2_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_recommendation_id uuid references public.v2_daily_recommendations(id) on delete set null,
  state text not null default 'active' check (state in ('active', 'paused', 'completed', 'abandoned')),
  recommended_minutes integer not null check (recommended_minutes between 0 and 600),
  actual_minutes integer not null default 0 check (actual_minutes between 0 and 1440),
  new_minutes_planned integer not null default 0 check (new_minutes_planned >= 0),
  review_minutes_planned integer not null default 0 check (review_minutes_planned >= 0),
  planned_value numeric(10, 4) not null default 0 check (planned_value >= 0),
  completed_value numeric(10, 4) not null default 0 check (completed_value >= 0),
  current_micro_set integer not null default 1 check (current_micro_set > 0),
  ending_reason text check (ending_reason in ('recommended_stop', 'user_stop', 'time_limit', 'completed', 'interrupted')),
  client_version text not null,
  idempotency_key text not null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_practice_sessions_idempotency_unique unique (user_id, idempotency_key),
  constraint v2_practice_sessions_planned_minutes_check check (
    recommended_minutes = new_minutes_planned + review_minutes_planned
  ),
  constraint v2_practice_sessions_end_state_check check (
    (state in ('active', 'paused') and ended_at is null)
    or (state in ('completed', 'abandoned') and ended_at is not null)
  )
);

create table public.v2_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.v2_practice_sessions(id) on delete cascade,
  question_id uuid not null references public.v2_questions(id) on delete restrict,
  question_version_id uuid not null references public.v2_question_versions(id) on delete restrict,
  review_item_id uuid,
  micro_set_number integer not null check (micro_set_number > 0),
  selected_answer jsonb not null,
  is_correct boolean not null,
  server_response_seconds integer not null check (server_response_seconds >= 0),
  client_response_seconds integer check (client_response_seconds >= 0),
  expected_seconds integer not null check (expected_seconds between 15 and 900),
  answer_change_count integer not null default 0 check (answer_change_count >= 0),
  hint_used boolean not null default false,
  explanation_viewed boolean not null default false,
  mistake_classification text check (
    mistake_classification in ('concept', 'careless', 'pacing', 'strategy', 'other')
  ),
  classified_at timestamptz,
  selection_reason_snapshot jsonb not null check (jsonb_typeof(selection_reason_snapshot) = 'object'),
  path_delta_snapshot jsonb not null check (jsonb_typeof(path_delta_snapshot) = 'object'),
  scratch_signal_snapshot jsonb check (scratch_signal_snapshot is null or jsonb_typeof(scratch_signal_snapshot) = 'object'),
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint v2_attempts_idempotency_unique unique (user_id, idempotency_key)
);

create table public.v2_attempt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.v2_practice_sessions(id) on delete cascade,
  attempt_id uuid references public.v2_attempts(id) on delete cascade,
  event_type text not null check (event_type in (
    'question_presented', 'answer_selected', 'answer_changed', 'scratch_opened',
    'scratch_tool_changed', 'calculator_opened', 'submitted', 'explanation_viewed',
    'skipped', 'paused', 'resumed'
  )),
  sequence_number integer not null check (sequence_number > 0),
  choice_id text,
  answer_change_count integer check (answer_change_count >= 0),
  scratch_tool text check (scratch_tool in ('pen', 'pencil', 'marker', 'eraser', 'text', 'lasso')),
  calculator_mode text check (calculator_mode in ('scientific', 'graphing', 'official_link')),
  client_elapsed_ms integer check (client_elapsed_ms >= 0),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint v2_attempt_events_session_sequence_unique unique (session_id, sequence_number)
);

create table public.v2_user_skill_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('math', 'reading_writing')),
  domain_key text not null,
  subskill_key text not null,
  mastery_estimate numeric(5, 4) not null default 0 check (mastery_estimate between 0 and 1),
  confidence numeric(5, 4) not null default 0 check (confidence between 0 and 1),
  lifetime_accuracy numeric(5, 4) check (lifetime_accuracy between 0 and 1),
  recent_accuracy numeric(5, 4) check (recent_accuracy between 0 and 1),
  speed_ratio numeric(8, 4) check (speed_ratio >= 0),
  easy_performance jsonb not null default '{}'::jsonb check (jsonb_typeof(easy_performance) = 'object'),
  medium_performance jsonb not null default '{}'::jsonb check (jsonb_typeof(medium_performance) = 'object'),
  hard_performance jsonb not null default '{}'::jsonb check (jsonb_typeof(hard_performance) = 'object'),
  lifetime_attempts integer not null default 0 check (lifetime_attempts >= 0),
  effective_sample_size numeric(10, 4) not null default 0 check (effective_sample_size >= 0),
  retention_strength numeric(8, 4) not null default 0 check (retention_strength >= 0),
  last_practiced_at timestamptz,
  due_at timestamptz,
  common_mistake_tags text[] not null default '{}',
  algorithm_version text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, section, subskill_key)
);

create table public.v2_review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_attempt_id uuid not null unique references public.v2_attempts(id) on delete cascade,
  question_id uuid not null references public.v2_questions(id) on delete restrict,
  subskill_key text not null,
  state text not null default 'due' check (state in ('due', 'learning', 'retesting', 'resolved')),
  corrected_at timestamptz,
  similar_confirmation_attempt_id uuid references public.v2_attempts(id) on delete set null,
  next_due_at timestamptz not null,
  interval_days integer not null default 0 check (interval_days >= 0),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  resolution_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(resolution_evidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint v2_review_items_resolution_check check (
    (state = 'resolved' and resolved_at is not null)
    or (state <> 'resolved' and resolved_at is null)
  )
);

alter table public.v2_attempts
  add constraint v2_attempts_review_item_fkey
  foreign key (review_item_id)
  references public.v2_review_items(id)
  on delete set null
  deferrable initially deferred;

create table public.v2_adaptation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.v2_practice_sessions(id) on delete cascade,
  attempt_id uuid references public.v2_attempts(id) on delete set null,
  before_route jsonb not null check (jsonb_typeof(before_route) = 'object'),
  after_route jsonb not null check (jsonb_typeof(after_route) = 'object'),
  trigger_type text not null check (trigger_type in (
    'correctness', 'pacing', 'scratch_signal', 'mastery', 'review_due', 'stop_rule', 'manual'
  )),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  user_facing_label text not null,
  minutes_delta integer not null default 0,
  questions_delta integer not null default 0,
  displayed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.v2_scratch_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique references public.v2_attempts(id) on delete cascade,
  scratch_used boolean not null,
  stroke_count integer not null default 0 check (stroke_count >= 0),
  text_block_count integer not null default 0 check (text_block_count >= 0),
  erase_action_count integer not null default 0 check (erase_action_count >= 0),
  calculator_open_count integer not null default 0 check (calculator_open_count >= 0),
  graph_open_count integer not null default 0 check (graph_open_count >= 0),
  diagnostic_label text,
  diagnostic_confidence numeric(5, 4) check (diagnostic_confidence between 0 and 1),
  analysis_model text,
  analysis_version text,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create index v2_daily_recommendations_user_date_idx
  on public.v2_daily_recommendations(user_id, recommendation_date desc);
create index v2_practice_sessions_user_state_idx
  on public.v2_practice_sessions(user_id, state, started_at desc);
create index v2_attempts_session_submitted_idx
  on public.v2_attempts(session_id, submitted_at);
create index v2_attempts_user_question_idx
  on public.v2_attempts(user_id, question_id, submitted_at desc);
create index v2_attempt_events_attempt_idx
  on public.v2_attempt_events(attempt_id, sequence_number);
create index v2_user_skill_state_due_idx
  on public.v2_user_skill_state(user_id, due_at)
  where due_at is not null;
create index v2_review_items_due_idx
  on public.v2_review_items(user_id, state, next_due_at);
create index v2_adaptation_events_session_idx
  on public.v2_adaptation_events(session_id, created_at);

create trigger v2_daily_recommendations_touch_updated_at
before update on public.v2_daily_recommendations
for each row execute function saturnpath_private.v2_touch_updated_at();

create trigger v2_practice_sessions_touch_updated_at
before update on public.v2_practice_sessions
for each row execute function saturnpath_private.v2_touch_updated_at();

create trigger v2_user_skill_state_touch_updated_at
before update on public.v2_user_skill_state
for each row execute function saturnpath_private.v2_touch_updated_at();

create trigger v2_review_items_touch_updated_at
before update on public.v2_review_items
for each row execute function saturnpath_private.v2_touch_updated_at();
