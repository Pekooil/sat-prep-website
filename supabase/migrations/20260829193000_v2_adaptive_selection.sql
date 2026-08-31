-- SaturnPath V2 deterministic adaptive selection and skill-state foundation.
-- Selection is computed by the shared TypeScript engine; these functions expose
-- answer-safe context and atomically reserve its selected published question.

alter table public.v2_practice_sessions
  add column current_selection_reason jsonb,
  add column current_selection_evidence jsonb,
  add column current_selection_algorithm_version text;

alter table public.v2_practice_sessions
  add constraint v2_practice_sessions_selection_reason_check check (
    current_selection_reason is null or jsonb_typeof(current_selection_reason) = 'object'
  ),
  add constraint v2_practice_sessions_selection_evidence_check check (
    current_selection_evidence is null or jsonb_typeof(current_selection_evidence) = 'object'
  );

alter table public.v2_attempts
  add column selection_algorithm_version text not null default 'practice-random.v0',
  add column selection_evidence_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(selection_evidence_snapshot) = 'object');

create or replace function public.v2_get_adaptive_selection_context(
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
  v_due_count integer;
  v_review_delivered integer;
  v_candidates jsonb;
begin
  select * into v_session
  from public.v2_practice_sessions
  where id = p_session_id and user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'session_not_found';
  end if;
  if v_session.state not in ('active', 'paused') then
    raise exception using errcode = 'P0001', message = 'session_not_active';
  end if;

  select count(*) into v_due_count
  from public.v2_review_items
  where user_id = p_user_id
    and state <> 'resolved'
    and next_due_at <= now();

  select count(*) into v_review_delivered
  from public.v2_attempts
  where session_id = p_session_id
    and micro_set_number = v_session.current_micro_set
    and selection_evidence_snapshot->>'strategy' = 'review_due';

  select coalesce(jsonb_agg(candidate.payload order by candidate.question_id), '[]'::jsonb)
  into v_candidates
  from (
    select
      q.id as question_id,
      jsonb_build_object(
        'questionId', q.id,
        'section', q.section,
        'domainKey', q.domain_key,
        'subskillKey', q.subskill_key,
        'difficulty', q.authoring_difficulty,
        'empiricalDifficulty', q.empirical_difficulty,
        'globalAttemptCount', coalesce(qm.attempt_count, 0),
        'globalAccuracy', qm.accuracy,
        'userAttemptCount', coalesce(exposure.attempt_count, 0),
        'lastAttemptedAt', exposure.last_attempted_at,
        'dueReview', exists (
          select 1
          from public.v2_review_items ri
          where ri.user_id = p_user_id
            and ri.question_id = q.id
            and ri.state <> 'resolved'
            and ri.next_due_at <= now()
        ),
        'skillState', case when skill.user_id is null then null else jsonb_build_object(
          'mastery', skill.mastery_estimate,
          'confidence', skill.confidence,
          'lifetimeAttempts', skill.lifetime_attempts,
          'speedRatio', skill.speed_ratio
        ) end
      ) as payload
    from public.v2_questions q
    join public.v2_question_versions version on version.id = q.current_version_id
    left join public.v2_question_metrics qm on qm.question_id = q.id
    left join public.v2_user_skill_state skill
      on skill.user_id = p_user_id
      and skill.section = q.section
      and skill.subskill_key = q.subskill_key
    left join lateral (
      select count(*)::integer as attempt_count, max(a.submitted_at) as last_attempted_at
      from public.v2_attempts a
      where a.user_id = p_user_id and a.question_id = q.id
    ) exposure on true
    where q.status = 'published'
      and q.rights_status = 'verified'
      and qm.quarantine_reason is null
      and not exists (
        select 1 from public.v2_attempts session_attempt
        where session_attempt.session_id = p_session_id
          and session_attempt.question_id = q.id
      )
  ) candidate;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'now', now(),
    -- At most one due-review slot per micro-set. W8 owns review lifecycle;
    -- W7 only prevents review work from crowding out new adaptive practice.
    'reviewCapacity', case when v_due_count > 0 and v_review_delivered < 1 then 1 else 0 end,
    'candidates', v_candidates
  );
end;
$$;

create or replace function public.v2_reserve_adaptive_question(
  p_user_id uuid,
  p_session_id uuid,
  p_question_id uuid,
  p_selection_reason jsonb,
  p_selection_evidence jsonb,
  p_algorithm_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
  v_question public.v2_questions%rowtype;
  v_version public.v2_question_versions%rowtype;
  v_reason jsonb;
begin
  if jsonb_typeof(p_selection_reason) <> 'object'
     or jsonb_array_length(coalesce(p_selection_reason->'metrics', '[]'::jsonb)) <> 2
     or nullif(trim(p_selection_reason->>'primaryLabel'), '') is null then
    raise exception using errcode = 'P0001', message = 'selection_reason_invalid';
  end if;
  if jsonb_typeof(p_selection_evidence) <> 'object'
     or nullif(trim(p_algorithm_version), '') is null then
    raise exception using errcode = 'P0001', message = 'selection_evidence_invalid';
  end if;

  select * into v_session
  from public.v2_practice_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'session_not_found';
  end if;
  if v_session.state not in ('active', 'paused') then
    raise exception using errcode = 'P0001', message = 'session_not_active';
  end if;

  if v_session.current_question_id is not null then
    select q.* into v_question
    from public.v2_questions q
    where q.id = v_session.current_question_id
      and q.current_version_id = v_session.current_question_version_id
      and q.status = 'published'
      and q.rights_status = 'verified';
    if found then
      select * into v_version
      from public.v2_question_versions
      where id = v_session.current_question_version_id;
    end if;
  end if;

  if v_question.id is null then
    select q.* into v_question
    from public.v2_questions q
    left join public.v2_question_metrics qm on qm.question_id = q.id
    where q.id = p_question_id
      and q.status = 'published'
      and q.rights_status = 'verified'
      and q.current_version_id is not null
      and qm.quarantine_reason is null
      and not exists (
        select 1 from public.v2_attempts a
        where a.session_id = p_session_id and a.question_id = q.id
      );

    if v_question.id is null then
      raise exception using errcode = 'P0001', message = 'question_unavailable';
    end if;

    select * into v_version
    from public.v2_question_versions
    where id = v_question.current_version_id;

    update public.v2_practice_sessions
    set current_question_id = v_question.id,
        current_question_version_id = v_version.id,
        current_question_presented_at = now(),
        current_selection_reason = p_selection_reason,
        current_selection_evidence = p_selection_evidence,
        current_selection_algorithm_version = p_algorithm_version,
        state = 'active',
        last_activity_at = now()
    where id = v_session.id
    returning * into v_session;
  end if;

  v_reason := coalesce(v_session.current_selection_reason, p_selection_reason);

  return jsonb_build_object(
    'sessionId', v_session.id,
    'microSetNumber', v_session.current_micro_set,
    'question', jsonb_build_object(
      'questionId', v_question.id,
      'versionId', v_version.id,
      'section', v_question.section,
      'domainKey', v_question.domain_key,
      'subskillKey', v_question.subskill_key,
      'responseType', v_question.response_type,
      'stimulus', v_version.stimulus,
      'stem', v_version.stem,
      'choices', v_version.choices,
      'responseConfig', v_version.response_config - 'acceptedAnswers',
      'visualAssets', v_version.visual_assets,
      'accessibilityText', v_version.accessibility_text,
      'expectedSeconds', v_question.expected_seconds,
      'whySelected', v_reason
    )
  );
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
    new.selection_algorithm_version := coalesce(
      v_session.current_selection_algorithm_version,
      'practice-random.v0'
    );
  end if;

  return new;
end;
$$;

create trigger v2_attempts_capture_adaptive_selection
before insert on public.v2_attempts
for each row execute function saturnpath_private.v2_capture_adaptive_attempt();

create or replace function saturnpath_private.v2_update_skill_state_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question public.v2_questions%rowtype;
  v_observation numeric;
  v_speed numeric;
begin
  select * into v_question from public.v2_questions where id = new.question_id;
  v_observation := case when new.is_correct then 1 else 0 end;
  v_speed := case
    when new.expected_seconds > 0 then new.server_response_seconds::numeric / new.expected_seconds
    else 1
  end;

  insert into public.v2_user_skill_state (
    user_id, section, domain_key, subskill_key, mastery_estimate, confidence,
    lifetime_accuracy, recent_accuracy, speed_ratio, lifetime_attempts,
    effective_sample_size, retention_strength, last_practiced_at, due_at,
    algorithm_version
  ) values (
    new.user_id, v_question.section, v_question.domain_key, v_question.subskill_key,
    0.4 * 0.72 + v_observation * 0.28,
    0.18,
    v_observation,
    v_observation,
    v_speed,
    1,
    1,
    case when new.is_correct then 1 else 0 end,
    new.submitted_at,
    new.submitted_at + case when new.is_correct then interval '7 days' else interval '1 day' end,
    'adaptive-mastery.v1'
  )
  on conflict (user_id, section, subskill_key) do update set
    domain_key = excluded.domain_key,
    mastery_estimate = greatest(0, least(1,
      public.v2_user_skill_state.mastery_estimate
        + (excluded.lifetime_accuracy - public.v2_user_skill_state.mastery_estimate)
          * greatest(0.08, 0.24 * (1 - public.v2_user_skill_state.confidence))
    )),
    confidence = least(0.95, public.v2_user_skill_state.confidence + 0.1),
    lifetime_accuracy = (
      coalesce(public.v2_user_skill_state.lifetime_accuracy, 0)
        * public.v2_user_skill_state.lifetime_attempts
      + excluded.lifetime_accuracy
    ) / (public.v2_user_skill_state.lifetime_attempts + 1),
    recent_accuracy = coalesce(public.v2_user_skill_state.recent_accuracy, excluded.recent_accuracy) * 0.7
      + excluded.recent_accuracy * 0.3,
    speed_ratio = coalesce(public.v2_user_skill_state.speed_ratio, excluded.speed_ratio) * 0.7
      + excluded.speed_ratio * 0.3,
    lifetime_attempts = public.v2_user_skill_state.lifetime_attempts + 1,
    effective_sample_size = public.v2_user_skill_state.effective_sample_size * 0.92 + 1,
    retention_strength = greatest(0,
      public.v2_user_skill_state.retention_strength
        + case when new.is_correct then 0.35 else -0.25 end
    ),
    last_practiced_at = excluded.last_practiced_at,
    due_at = excluded.due_at,
    algorithm_version = excluded.algorithm_version;

  return new;
end;
$$;

create trigger v2_attempts_update_skill_state
after insert on public.v2_attempts
for each row execute function saturnpath_private.v2_update_skill_state_from_attempt();

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
  end if;
  return new;
end;
$$;

create trigger v2_practice_sessions_clear_current_selection
before update of current_question_id on public.v2_practice_sessions
for each row execute function saturnpath_private.v2_clear_current_selection();

revoke all on function public.v2_get_adaptive_selection_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.v2_reserve_adaptive_question(uuid, uuid, uuid, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function saturnpath_private.v2_capture_adaptive_attempt() from public, anon, authenticated;
revoke all on function saturnpath_private.v2_update_skill_state_from_attempt() from public, anon, authenticated;
revoke all on function saturnpath_private.v2_clear_current_selection() from public, anon, authenticated;

grant execute on function public.v2_get_adaptive_selection_context(uuid, uuid) to service_role;
grant execute on function public.v2_reserve_adaptive_question(uuid, uuid, uuid, jsonb, jsonb, text) to service_role;
grant execute on function saturnpath_private.v2_capture_adaptive_attempt() to service_role;
grant execute on function saturnpath_private.v2_update_skill_state_from_attempt() to service_role;
grant execute on function saturnpath_private.v2_clear_current_selection() to service_role;
