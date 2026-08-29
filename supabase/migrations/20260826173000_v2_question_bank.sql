-- SaturnPath V2 question bank.
-- Additive only: this migration does not alter any V1 table.

create schema if not exists saturnpath_private;
revoke all on schema saturnpath_private from public, anon, authenticated;
grant usage on schema saturnpath_private to service_role;

create or replace function saturnpath_private.v2_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.v2_questions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('math', 'reading_writing')),
  domain_key text not null,
  skill_key text not null,
  subskill_key text not null,
  response_type text not null check (response_type in ('mcq', 'spr')),
  authoring_difficulty text not null check (authoring_difficulty in ('easy', 'medium', 'hard')),
  empirical_difficulty numeric(5, 4) check (empirical_difficulty between 0 and 1),
  expected_seconds integer not null check (expected_seconds between 15 and 900),
  status text not null default 'draft' check (
    status in ('draft', 'needs_review', 'approved', 'published', 'quarantined', 'retired')
  ),
  quota_version integer not null default 1 check (quota_version > 0),
  source_type text not null default 'original' check (
    source_type in ('original', 'public_domain', 'licensed')
  ),
  source_reference text,
  rights_status text not null default 'pending' check (
    rights_status in ('pending', 'verified', 'rejected')
  ),
  generator_provider text,
  generator_model text,
  prompt_version text,
  quality_score numeric(5, 2) check (quality_score between 0 and 100),
  current_version_id uuid,
  published_at timestamptz,
  quarantined_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_questions_response_section_check check (
    section = 'math' or response_type = 'mcq'
  ),
  constraint v2_questions_publish_ready_check check (
    status <> 'published'
    or (current_version_id is not null and rights_status = 'verified' and published_at is not null)
  )
);

create table public.v2_question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.v2_questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  stimulus text,
  stem text not null,
  choices jsonb not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array'),
  response_config jsonb not null default '{}'::jsonb check (jsonb_typeof(response_config) = 'object'),
  visual_assets jsonb not null default '[]'::jsonb check (jsonb_typeof(visual_assets) = 'array'),
  accessibility_text text,
  change_reason text not null,
  content_fingerprint text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint v2_question_versions_number_unique unique (question_id, version_number),
  constraint v2_question_versions_fingerprint_unique unique (content_fingerprint)
);

alter table public.v2_questions
  add constraint v2_questions_current_version_fkey
  foreign key (current_version_id)
  references public.v2_question_versions(id)
  on delete set null
  deferrable initially deferred;

create unique index v2_questions_current_version_unique
  on public.v2_questions(current_version_id)
  where current_version_id is not null;

create table public.v2_question_keys (
  question_version_id uuid primary key references public.v2_question_versions(id) on delete cascade,
  correct_answer jsonb not null,
  explanation text not null,
  distractor_rationales jsonb not null default '{}'::jsonb check (jsonb_typeof(distractor_rationales) = 'object'),
  validation_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(validation_evidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.v2_question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.v2_question_versions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  review_pass text not null check (review_pass in ('content_correctness', 'proof_rendering')),
  decision text not null check (decision in ('approved', 'revision_requested', 'rejected')),
  rubric_results jsonb not null check (jsonb_typeof(rubric_results) = 'object'),
  validation_failures jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_failures) = 'array'),
  notes text,
  reviewed_at timestamptz not null default now(),
  constraint v2_question_reviews_pass_unique unique (question_version_id, review_pass)
);

create table public.v2_question_metrics (
  question_id uuid primary key references public.v2_questions(id) on delete cascade,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= attempt_count),
  accuracy numeric(5, 4) check (accuracy between 0 and 1),
  median_seconds numeric(8, 2) check (median_seconds >= 0),
  skip_rate numeric(5, 4) check (skip_rate between 0 and 1),
  answer_choice_distribution jsonb not null default '{}'::jsonb check (jsonb_typeof(answer_choice_distribution) = 'object'),
  discrimination_proxy numeric(6, 4),
  issue_report_count integer not null default 0 check (issue_report_count >= 0),
  quarantine_reason text,
  updated_at timestamptz not null default now()
);

create index v2_questions_delivery_idx
  on public.v2_questions(status, section, domain_key, subskill_key, authoring_difficulty);
create index v2_questions_review_queue_idx
  on public.v2_questions(status, updated_at)
  where status in ('draft', 'needs_review', 'quarantined');
create index v2_question_versions_question_idx
  on public.v2_question_versions(question_id, version_number desc);
create index v2_question_reviews_reviewer_idx
  on public.v2_question_reviews(reviewer_id, reviewed_at desc);

create trigger v2_questions_touch_updated_at
before update on public.v2_questions
for each row execute function saturnpath_private.v2_touch_updated_at();

create trigger v2_question_keys_touch_updated_at
before update on public.v2_question_keys
for each row execute function saturnpath_private.v2_touch_updated_at();

create trigger v2_question_metrics_touch_updated_at
before update on public.v2_question_metrics
for each row execute function saturnpath_private.v2_touch_updated_at();

create or replace function saturnpath_private.v2_validate_current_question_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_version_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.v2_question_versions version
    where version.id = new.current_version_id
      and version.question_id = new.id
  ) then
    raise exception 'current_version_id must belong to the same v2 question';
  end if;

  return new;
end;
$$;

create trigger v2_questions_validate_current_version
before insert or update of current_version_id on public.v2_questions
for each row execute function saturnpath_private.v2_validate_current_question_version();
