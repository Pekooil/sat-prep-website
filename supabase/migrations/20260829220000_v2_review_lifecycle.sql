-- SaturnPath V2 review lifecycle, spaced retesting, and similar-question proof.

alter table public.v2_practice_sessions
  add column current_review_item_id uuid references public.v2_review_items(id) on delete set null;

create table public.v2_review_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_item_id uuid not null references public.v2_review_items(id) on delete cascade,
  action text not null check (action in ('resume', 'save', 'defer', 'practice_now')),
  idempotency_key text not null,
  response_snapshot jsonb not null check (jsonb_typeof(response_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  constraint v2_review_actions_idempotency_unique unique (user_id, idempotency_key)
);

alter table public.v2_review_actions enable row level security;
revoke all on table public.v2_review_actions from public, anon, authenticated;
grant select, insert, update, delete on table public.v2_review_actions to service_role;

create index v2_review_actions_item_idx
  on public.v2_review_actions(review_item_id, created_at desc);

create or replace function saturnpath_private.v2_review_item_response(
  p_review public.v2_review_items
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_review.id,
    'state', p_review.state,
    'subskillKey', p_review.subskill_key,
    'nextDueAt', p_review.next_due_at,
    'lapseCount', p_review.lapse_count,
    'summary', case p_review.state
      when 'due' then 'Ready for correction'
      when 'learning' then 'Quick Fix in progress'
      when 'retesting' then 'Similar retest scheduled'
      else 'Confirmed and resolved'
    end
  );
$$;

create or replace function public.v2_list_review_items(
  p_user_id uuid,
  p_state text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_state is not null and p_state not in ('due', 'learning', 'retesting', 'resolved') then
    raise exception using errcode = 'P0001', message = 'review_state_invalid';
  end if;

  select coalesce(
    jsonb_agg(saturnpath_private.v2_review_item_response(item) order by item.next_due_at, item.created_at),
    '[]'::jsonb
  ) into v_items
  from public.v2_review_items item
  where item.user_id = p_user_id
    and (p_state is null or item.state = p_state);

  return v_items;
end;
$$;

create or replace function public.v2_act_on_review_item(
  p_user_id uuid,
  p_review_item_id uuid,
  p_action text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.v2_review_items%rowtype;
  v_existing public.v2_review_actions%rowtype;
  v_response jsonb;
begin
  select * into v_existing
  from public.v2_review_actions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.review_item_id = p_review_item_id and v_existing.action = p_action then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = 'P0001', message = 'review_action_conflict';
  end if;

  if p_action not in ('resume', 'save', 'defer', 'practice_now') then
    raise exception using errcode = 'P0001', message = 'review_action_invalid';
  end if;

  select * into v_review
  from public.v2_review_items
  where id = p_review_item_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'review_item_not_found';
  end if;

  if p_action in ('resume', 'practice_now') and v_review.state in ('due', 'learning') then
    update public.v2_review_items
    set state = 'learning',
        next_due_at = now(),
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'lastAction', p_action,
          'lastActionAt', now()
        )
    where id = v_review.id
    returning * into v_review;
  elsif p_action = 'practice_now' and v_review.state = 'retesting' then
    update public.v2_review_items
    set next_due_at = now(),
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'lastAction', p_action,
          'lastActionAt', now()
        )
    where id = v_review.id
    returning * into v_review;
  elsif p_action = 'defer' and v_review.state <> 'resolved' then
    update public.v2_review_items
    set next_due_at = greatest(next_due_at, now()) + interval '1 day',
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'lastAction', 'defer',
          'lastActionAt', now()
        )
    where id = v_review.id
    returning * into v_review;
  elsif p_action = 'save' then
    update public.v2_review_items
    set resolution_evidence = resolution_evidence || jsonb_build_object(
          'lastAction', 'save',
          'lastActionAt', now()
        )
    where id = v_review.id
    returning * into v_review;
  end if;

  v_response := saturnpath_private.v2_review_item_response(v_review);
  insert into public.v2_review_actions (
    user_id, review_item_id, action, idempotency_key, response_snapshot
  ) values (
    p_user_id, p_review_item_id, p_action, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.v2_get_due_review_assignments(
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignments jsonb;
begin
  if not exists (
    select 1 from public.v2_practice_sessions
    where id = p_session_id and user_id = p_user_id and state in ('active', 'paused')
  ) then
    raise exception using errcode = 'P0001', message = 'session_not_found';
  end if;

  select coalesce(jsonb_agg(assignment.payload order by assignment.next_due_at, assignment.review_item_id, assignment.question_id), '[]'::jsonb)
  into v_assignments
  from (
    select distinct on (q.id)
      ri.next_due_at,
      ri.id as review_item_id,
      q.id as question_id,
      jsonb_build_object('questionId', q.id, 'reviewItemId', ri.id) as payload
    from public.v2_review_items ri
    join public.v2_questions source_question on source_question.id = ri.question_id
    join public.v2_questions q on (
      (ri.state in ('due', 'learning') and q.id = ri.question_id)
      or (
        ri.state = 'retesting'
        and q.section = source_question.section
        and q.subskill_key = ri.subskill_key
        and q.id <> ri.question_id
      )
    )
    left join public.v2_question_metrics metrics on metrics.question_id = q.id
    where ri.user_id = p_user_id
      and ri.state <> 'resolved'
      and ri.next_due_at <= now()
      and q.status = 'published'
      and q.rights_status = 'verified'
      and metrics.quarantine_reason is null
      and not exists (
        select 1 from public.v2_attempts attempt
        where attempt.session_id = p_session_id and attempt.question_id = q.id
      )
    order by q.id, ri.next_due_at, ri.id
  ) assignment;

  return v_assignments;
end;
$$;

create or replace function public.v2_attach_review_to_reservation(
  p_user_id uuid,
  p_session_id uuid,
  p_question_id uuid,
  p_review_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
  v_review public.v2_review_items%rowtype;
  v_source public.v2_questions%rowtype;
  v_candidate public.v2_questions%rowtype;
begin
  select * into v_session
  from public.v2_practice_sessions
  where id = p_session_id and user_id = p_user_id
  for update;
  if not found or v_session.current_question_id is distinct from p_question_id then
    raise exception using errcode = 'P0001', message = 'question_not_assigned';
  end if;

  select * into v_review
  from public.v2_review_items
  where id = p_review_item_id
    and user_id = p_user_id
    and state <> 'resolved'
    and next_due_at <= now();
  if not found then
    raise exception using errcode = 'P0001', message = 'review_item_unavailable';
  end if;

  select * into v_source from public.v2_questions where id = v_review.question_id;
  select * into v_candidate from public.v2_questions where id = p_question_id;
  if not (
    (v_review.state in ('due', 'learning') and v_candidate.id = v_source.id)
    or (
      v_review.state = 'retesting'
      and v_candidate.id <> v_source.id
      and v_candidate.section = v_source.section
      and v_candidate.subskill_key = v_review.subskill_key
    )
  ) then
    raise exception using errcode = 'P0001', message = 'review_item_unavailable';
  end if;

  update public.v2_practice_sessions
  set current_review_item_id = v_review.id
  where id = v_session.id;
end;
$$;

create or replace function saturnpath_private.v2_capture_adaptive_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
begin
  select * into v_session
  from public.v2_practice_sessions
  where id = new.session_id and user_id = new.user_id;

  if v_session.current_selection_reason is not null then
    new.selection_reason_snapshot := v_session.current_selection_reason;
    new.selection_evidence_snapshot := coalesce(v_session.current_selection_evidence, '{}'::jsonb);
    new.selection_algorithm_version := coalesce(v_session.current_selection_algorithm_version, 'practice-random.v0');
  end if;
  if v_session.current_review_item_id is not null then
    new.review_item_id := v_session.current_review_item_id;
  end if;
  return new;
end;
$$;

create or replace function saturnpath_private.v2_create_review_item_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question public.v2_questions%rowtype;
  v_review public.v2_review_items%rowtype;
begin
  if new.is_correct or new.review_item_id is not null then
    return new;
  end if;
  select * into v_question from public.v2_questions where id = new.question_id;
  insert into public.v2_review_items (
    user_id, source_attempt_id, question_id, subskill_key, state, next_due_at,
    interval_days, lapse_count, resolution_evidence
  ) values (
    new.user_id, new.id, new.question_id, v_question.subskill_key, 'due', new.submitted_at,
    0, 0, jsonb_build_object(
      'createdBy', 'incorrect_attempt',
      'sourceAttemptId', new.id,
      'algorithmVersion', 'review-intake.v1'
    )
  )
  on conflict (source_attempt_id) do update set source_attempt_id = excluded.source_attempt_id
  returning * into v_review;
  update public.v2_attempts set review_item_id = v_review.id where id = new.id;
  return new;
end;
$$;

create or replace function saturnpath_private.v2_update_review_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.v2_review_items%rowtype;
  v_question public.v2_questions%rowtype;
  v_next_interval integer;
begin
  if new.review_item_id is null then
    return new;
  end if;
  select * into v_review from public.v2_review_items where id = new.review_item_id for update;
  select * into v_question from public.v2_questions where id = new.question_id;

  if not new.is_correct then
    update public.v2_review_items
    set state = 'learning',
        next_due_at = new.submitted_at,
        interval_days = 0,
        lapse_count = lapse_count + 1,
        resolved_at = null,
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'quickFix', true,
          'quickFixAttemptId', new.id,
          'algorithmVersion', 'review-spacing.v1'
        )
    where id = v_review.id;
  elsif v_review.state in ('due', 'learning') and new.question_id = v_review.question_id then
    v_next_interval := greatest(3, case when v_review.interval_days = 0 then 3 else v_review.interval_days * 2 end);
    update public.v2_review_items
    set state = 'retesting',
        corrected_at = coalesce(corrected_at, new.submitted_at),
        next_due_at = new.submitted_at + make_interval(days => v_next_interval),
        interval_days = v_next_interval,
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'correctionAttemptId', new.id,
          'correctionConfirmedAt', new.submitted_at,
          'algorithmVersion', 'review-spacing.v1'
        )
    where id = v_review.id;
  elsif v_review.state = 'retesting'
        and new.question_id <> v_review.question_id
        and v_question.subskill_key = v_review.subskill_key then
    update public.v2_review_items
    set state = 'resolved',
        similar_confirmation_attempt_id = new.id,
        resolved_at = new.submitted_at,
        next_due_at = new.submitted_at,
        resolution_evidence = resolution_evidence || jsonb_build_object(
          'similarConfirmationAttemptId', new.id,
          'resolvedAt', new.submitted_at,
          'algorithmVersion', 'review-spacing.v1'
        )
    where id = v_review.id;
  end if;
  return new;
end;
$$;

create trigger v2_attempts_update_review_lifecycle
after insert on public.v2_attempts
for each row execute function saturnpath_private.v2_update_review_from_attempt();

create or replace function saturnpath_private.v2_clear_current_selection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_question_id is null then
    new.current_selection_reason := null;
    new.current_selection_evidence := null;
    new.current_selection_algorithm_version := null;
    new.current_review_item_id := null;
  end if;
  return new;
end;
$$;

revoke all on function saturnpath_private.v2_review_item_response(public.v2_review_items) from public, anon, authenticated;
revoke all on function public.v2_list_review_items(uuid, text) from public, anon, authenticated;
revoke all on function public.v2_act_on_review_item(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.v2_get_due_review_assignments(uuid, uuid) from public, anon, authenticated;
revoke all on function public.v2_attach_review_to_reservation(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function saturnpath_private.v2_update_review_from_attempt() from public, anon, authenticated;

grant execute on function saturnpath_private.v2_review_item_response(public.v2_review_items) to service_role;
grant execute on function public.v2_list_review_items(uuid, text) to service_role;
grant execute on function public.v2_act_on_review_item(uuid, uuid, text, text) to service_role;
grant execute on function public.v2_get_due_review_assignments(uuid, uuid) to service_role;
grant execute on function public.v2_attach_review_to_reservation(uuid, uuid, uuid, uuid) to service_role;
grant execute on function saturnpath_private.v2_update_review_from_attempt() to service_role;
