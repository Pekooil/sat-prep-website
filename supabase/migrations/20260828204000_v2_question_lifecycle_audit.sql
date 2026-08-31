-- Revision history, quarantine/retirement controls, and append-only audit.

create table public.v2_question_audit_log (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.v2_questions(id) on delete restrict,
  question_version_id uuid references public.v2_question_versions(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  actor_subject_hash text not null check (actor_subject_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (action in (
    'draft_created', 'version_created', 'review_recorded',
    'published', 'quarantined', 'retired'
  )),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.v2_question_audit_log enable row level security;
revoke all on public.v2_question_audit_log from public, anon, authenticated;
grant select, insert on public.v2_question_audit_log to service_role;

create trigger v2_question_audit_log_immutable
before update or delete on public.v2_question_audit_log
for each row execute function saturnpath_private.v2_reject_immutable_question_record();

create or replace function saturnpath_private.v2_question_actor_hash(p_actor_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_actor_id::text, 'sha256'), 'hex');
$$;

create or replace function saturnpath_private.v2_audit_question_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.v2_question_audit_log (
    question_id, question_version_id, actor_id, actor_subject_hash, action, details
  ) values (
    new.question_id,
    new.id,
    new.created_by,
    saturnpath_private.v2_question_actor_hash(new.created_by),
    case when new.version_number = 1 then 'draft_created' else 'version_created' end,
    jsonb_build_object('versionNumber', new.version_number, 'changeReason', new.change_reason)
  );
  return new;
end;
$$;

create trigger v2_question_versions_audit
after insert on public.v2_question_versions
for each row execute function saturnpath_private.v2_audit_question_version();

create or replace function saturnpath_private.v2_audit_question_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  reviewed_question_id uuid;
begin
  select question_id into reviewed_question_id
  from public.v2_question_versions where id = new.question_version_id;

  insert into public.v2_question_audit_log (
    question_id, question_version_id, actor_id, actor_subject_hash, action, details
  ) values (
    reviewed_question_id,
    new.question_version_id,
    new.reviewer_id,
    saturnpath_private.v2_question_actor_hash(new.reviewer_id),
    'review_recorded',
    jsonb_build_object('reviewPass', new.review_pass, 'decision', new.decision)
  );
  return new;
end;
$$;

create trigger v2_question_reviews_audit
after insert on public.v2_question_reviews
for each row execute function saturnpath_private.v2_audit_question_review();

create or replace function saturnpath_private.v2_audit_question_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  publishing_actor uuid;
begin
  if old.status <> 'published' and new.status = 'published' then
    select reviewer_id into publishing_actor
    from public.v2_question_reviews
    where question_version_id = new.current_version_id
      and review_pass = 'proof_rendering'
      and decision = 'approved';

    insert into public.v2_question_audit_log (
      question_id, question_version_id, actor_id, actor_subject_hash, action, details
    ) values (
      new.id,
      new.current_version_id,
      publishing_actor,
      saturnpath_private.v2_question_actor_hash(publishing_actor),
      'published',
      jsonb_build_object('previousStatus', old.status)
    );
  end if;
  return new;
end;
$$;

create trigger v2_questions_publish_audit
after update of status on public.v2_questions
for each row execute function saturnpath_private.v2_audit_question_publish();

create or replace function public.v2_create_question_revision(
  p_actor_id uuid,
  p_question_id uuid,
  p_stimulus text,
  p_stem text,
  p_choices jsonb,
  p_response_config jsonb,
  p_visual_assets jsonb,
  p_accessibility_text text,
  p_change_reason text,
  p_content_fingerprint text,
  p_correct_answer jsonb,
  p_explanation text,
  p_distractor_rationales jsonb,
  p_validation_evidence jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  question_record public.v2_questions%rowtype;
  next_version_number integer;
  created_version_id uuid;
begin
  select * into question_record from public.v2_questions
  where id = p_question_id for update;

  if question_record.id is null then
    raise exception 'Question does not exist.' using errcode = 'P0002';
  end if;
  if question_record.status in ('published', 'retired') then
    raise exception 'Published questions must be quarantined before revision; retired questions cannot be revised.' using errcode = '23514';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version_number
  from public.v2_question_versions where question_id = p_question_id;

  insert into public.v2_question_versions (
    question_id, version_number, stimulus, stem, choices, response_config,
    visual_assets, accessibility_text, change_reason, content_fingerprint, created_by
  ) values (
    p_question_id, next_version_number, p_stimulus, p_stem, p_choices,
    p_response_config, p_visual_assets, p_accessibility_text, p_change_reason,
    p_content_fingerprint, p_actor_id
  ) returning id into created_version_id;

  insert into public.v2_question_keys (
    question_version_id, correct_answer, explanation,
    distractor_rationales, validation_evidence
  ) values (
    created_version_id, p_correct_answer, p_explanation,
    p_distractor_rationales, p_validation_evidence
  );

  update public.v2_questions
  set current_version_id = created_version_id, status = 'needs_review'
  where id = p_question_id;

  return created_version_id;
end;
$$;

create or replace function public.v2_set_question_lifecycle(
  p_actor_id uuid,
  p_question_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  question_record public.v2_questions%rowtype;
begin
  select * into question_record from public.v2_questions
  where id = p_question_id for update;
  if question_record.id is null then
    raise exception 'Question does not exist.' using errcode = 'P0002';
  end if;
  if p_status not in ('quarantined', 'retired') then
    raise exception 'Unsupported lifecycle status.' using errcode = '23514';
  end if;
  if question_record.status = 'retired' then
    raise exception 'Retired questions cannot change lifecycle state.' using errcode = '23514';
  end if;

  insert into public.v2_question_metrics (question_id, quarantine_reason)
  values (p_question_id, p_reason)
  on conflict (question_id) do update set quarantine_reason = excluded.quarantine_reason;

  update public.v2_questions set
    status = p_status,
    quarantined_at = case when p_status = 'quarantined' then now() else quarantined_at end,
    retired_at = case when p_status = 'retired' then now() else retired_at end
  where id = p_question_id;

  insert into public.v2_question_audit_log (
    question_id, question_version_id, actor_id, actor_subject_hash, action, details
  ) values (
    p_question_id,
    question_record.current_version_id,
    p_actor_id,
    saturnpath_private.v2_question_actor_hash(p_actor_id),
    case when p_status = 'quarantined' then 'quarantined' else 'retired' end,
    jsonb_build_object('reason', p_reason, 'previousStatus', question_record.status)
  );
end;
$$;

revoke all on function public.v2_create_question_revision(uuid,uuid,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.v2_create_question_revision(uuid,uuid,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) to service_role;
revoke all on function public.v2_set_question_lifecycle(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.v2_set_question_lifecycle(uuid,uuid,text,text) to service_role;
