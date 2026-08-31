-- SaturnPath V2 secure practice vertical slice.
-- All mutations execute as one transaction through service-role-only functions.

alter table public.v2_practice_sessions
  add column current_question_id uuid references public.v2_questions(id) on delete set null,
  add column current_question_version_id uuid references public.v2_question_versions(id) on delete set null,
  add column current_question_presented_at timestamptz,
  add column end_idempotency_key text;

alter table public.v2_attempts
  add column classification_idempotency_key text;

create unique index v2_practice_sessions_end_idempotency_unique
  on public.v2_practice_sessions(user_id, end_idempotency_key)
  where end_idempotency_key is not null;

create unique index v2_attempts_classification_idempotency_unique
  on public.v2_attempts(user_id, classification_idempotency_key)
  where classification_idempotency_key is not null;

create or replace function saturnpath_private.v2_normalize_spr_answer(p_answer text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(regexp_replace(trim(p_answer), '[,[:space:]]+', '', 'g'));
$$;

create or replace function public.v2_start_or_resume_session(
  p_user_id uuid,
  p_daily_recommendation_id uuid,
  p_resume_if_available boolean,
  p_client_version text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recommendation public.v2_daily_recommendations%rowtype;
  v_session public.v2_practice_sessions%rowtype;
begin
  select * into v_session
  from public.v2_practice_sessions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    return to_jsonb(v_session);
  end if;

  if p_resume_if_available then
    select * into v_session
    from public.v2_practice_sessions
    where user_id = p_user_id and state in ('active', 'paused')
    order by last_activity_at desc
    limit 1
    for update;

    if found then
      update public.v2_practice_sessions
      set state = 'active', last_activity_at = now()
      where id = v_session.id
      returning * into v_session;
      return to_jsonb(v_session);
    end if;
  end if;

  if p_daily_recommendation_id is not null then
    select * into v_recommendation
    from public.v2_daily_recommendations
    where id = p_daily_recommendation_id and user_id = p_user_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'recommendation_not_found';
    end if;
  end if;

  insert into public.v2_practice_sessions (
    user_id,
    daily_recommendation_id,
    recommended_minutes,
    new_minutes_planned,
    review_minutes_planned,
    planned_value,
    client_version,
    idempotency_key
  ) values (
    p_user_id,
    p_daily_recommendation_id,
    coalesce(v_recommendation.total_minutes, 10),
    coalesce(v_recommendation.new_minutes, 10),
    coalesce(v_recommendation.review_minutes, 0),
    coalesce(v_recommendation.total_minutes, 10),
    p_client_version,
    p_idempotency_key
  )
  returning * into v_session;

  return to_jsonb(v_session);
end;
$$;

create or replace function public.v2_get_next_question(
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
  v_question public.v2_questions%rowtype;
  v_version public.v2_question_versions%rowtype;
begin
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
    join public.v2_question_versions v on v.id = q.current_version_id
    where q.id = v_session.current_question_id
      and v.id = v_session.current_question_version_id
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
    join public.v2_question_versions v on v.id = q.current_version_id
    where q.status = 'published'
      and q.rights_status = 'verified'
      and not exists (
        select 1 from public.v2_attempts a
        where a.session_id = v_session.id and a.question_id = q.id
      )
    order by md5(q.id::text || v_session.id::text)
    limit 1;

    if v_question.id is null then
      raise exception using errcode = 'P0001', message = 'question_pool_empty';
    end if;

    select * into v_version
    from public.v2_question_versions
    where id = v_question.current_version_id;

    update public.v2_practice_sessions
    set current_question_id = v_question.id,
        current_question_version_id = v_version.id,
        current_question_presented_at = now(),
        state = 'active',
        last_activity_at = now()
    where id = v_session.id
    returning * into v_session;
  end if;

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
      -- acceptedAnswers is evaluation metadata and must never cross the
      -- pre-submission boundary. UI-safe response hints may remain.
      'responseConfig', v_version.response_config - 'acceptedAnswers',
      'visualAssets', v_version.visual_assets,
      'accessibilityText', v_version.accessibility_text,
      'expectedSeconds', v_question.expected_seconds,
      'whySelected', jsonb_build_object(
        'primaryLabel', 'A focused next step',
        'metrics', jsonb_build_array(
          jsonb_build_object('label', 'Skill', 'value', replace(v_question.subskill_key, '_', ' ')),
          jsonb_build_object('label', 'Level', 'value', initcap(v_question.authoring_difficulty))
        )
      )
    )
  );
end;
$$;

create or replace function public.v2_submit_attempt(
  p_user_id uuid,
  p_session_id uuid,
  p_question_id uuid,
  p_version_id uuid,
  p_selected_answer jsonb,
  p_client_response_seconds integer,
  p_answer_change_count integer,
  p_hint_used boolean,
  p_events jsonb,
  p_scratch_summary jsonb,
  p_idempotency_key text
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
  v_key public.v2_question_keys%rowtype;
  v_attempt public.v2_attempts%rowtype;
  v_correct boolean;
  v_count integer;
  v_correct_count integer;
  v_server_seconds integer;
  v_path_delta jsonb;
begin
  select * into v_attempt
  from public.v2_attempts
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    select * into v_key from public.v2_question_keys where question_version_id = v_attempt.question_version_id;
    select count(*), count(*) filter (where is_correct)
      into v_count, v_correct_count
    from public.v2_attempts where session_id = v_attempt.session_id;
    return jsonb_build_object(
      'attempt', to_jsonb(v_attempt),
      'correctAnswer', v_key.correct_answer,
      'explanation', v_key.explanation,
      'attemptCount', v_count,
      'correctCount', v_correct_count,
      'nextAction', case when v_count >= 5 then 'recommended_stop' else 'continue' end
    );
  end if;

  select * into v_session
  from public.v2_practice_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'session_not_found';
  end if;
  if v_session.state <> 'active' then
    raise exception using errcode = 'P0001', message = 'session_not_active';
  end if;
  if v_session.current_question_id is distinct from p_question_id
     or v_session.current_question_version_id is distinct from p_version_id then
    raise exception using errcode = 'P0001', message = 'question_not_assigned';
  end if;

  select q.* into v_question
  from public.v2_questions q
  join public.v2_question_versions v on v.id = p_version_id and v.question_id = q.id
  join public.v2_question_keys k on k.question_version_id = v.id
  where q.id = p_question_id
    and q.current_version_id = v.id
    and q.status = 'published'
    and q.rights_status = 'verified';

  if v_question.id is null then
    raise exception using errcode = 'P0001', message = 'question_unavailable';
  end if;

  select * into v_version
  from public.v2_question_versions
  where id = p_version_id;
  select * into v_key
  from public.v2_question_keys
  where question_version_id = p_version_id;

  if jsonb_typeof(p_selected_answer) <> 'string' then
    raise exception using errcode = 'P0001', message = 'answer_invalid';
  end if;

  if v_question.response_type = 'mcq' then
    v_correct := lower(trim(p_selected_answer #>> '{}')) = lower(trim(v_key.correct_answer #>> '{}'));
  else
    v_correct := exists (
      select 1
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(v_version.response_config->'acceptedAnswers') = 'array'
            then v_version.response_config->'acceptedAnswers'
          else jsonb_build_array(v_key.correct_answer #>> '{}')
        end
      ) accepted(answer)
      where saturnpath_private.v2_normalize_spr_answer(accepted.answer)
        = saturnpath_private.v2_normalize_spr_answer(p_selected_answer #>> '{}')
    );
  end if;

  v_server_seconds := greatest(0, floor(extract(epoch from (now() - v_session.current_question_presented_at)))::integer);
  v_path_delta := jsonb_build_object(
    'beforeLabel', 'Current route',
    'afterLabel', case when v_correct then 'Route confirmed' else 'Review signal saved' end,
    'impactMinutes', 0,
    'impactQuestions', 0,
    'impactDirection', 'unchanged',
    'visualKind', 'no_change'
  );

  insert into public.v2_attempts (
    user_id, session_id, question_id, question_version_id, micro_set_number,
    selected_answer, is_correct, server_response_seconds, client_response_seconds,
    expected_seconds, answer_change_count, hint_used, selection_reason_snapshot,
    path_delta_snapshot, idempotency_key
  ) values (
    p_user_id, p_session_id, p_question_id, p_version_id, v_session.current_micro_set,
    p_selected_answer, v_correct, v_server_seconds, p_client_response_seconds,
    v_question.expected_seconds, p_answer_change_count, coalesce(p_hint_used, false),
    jsonb_build_object(
      'primaryLabel', 'A focused next step',
      'metrics', jsonb_build_array(
        jsonb_build_object('label', 'Skill', 'value', replace(v_question.subskill_key, '_', ' ')),
        jsonb_build_object('label', 'Level', 'value', initcap(v_question.authoring_difficulty))
      )
    ),
    v_path_delta,
    p_idempotency_key
  ) returning * into v_attempt;

  insert into public.v2_attempt_events (
    user_id, session_id, attempt_id, event_type, sequence_number, choice_id,
    scratch_tool, calculator_mode, client_elapsed_ms, occurred_at
  )
  select
    p_user_id,
    p_session_id,
    v_attempt.id,
    event->>'type',
    (event->>'sequenceNumber')::integer,
    event->>'choiceId',
    event->>'scratchTool',
    event->>'calculatorMode',
    (event->>'clientElapsedMs')::integer,
    (event->>'occurredAt')::timestamptz
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) event;

  if p_scratch_summary is not null then
    insert into public.v2_scratch_insights (
      user_id, attempt_id, scratch_used, stroke_count, text_block_count,
      erase_action_count, calculator_open_count, graph_open_count
    ) values (
      p_user_id,
      v_attempt.id,
      coalesce((p_scratch_summary->>'scratchUsed')::boolean, false),
      coalesce((p_scratch_summary->>'strokeCount')::integer, 0),
      coalesce((p_scratch_summary->>'textBlockCount')::integer, 0),
      coalesce((p_scratch_summary->>'eraseActionCount')::integer, 0),
      coalesce((p_scratch_summary->>'calculatorOpenCount')::integer, 0),
      coalesce((p_scratch_summary->>'graphOpenCount')::integer, 0)
    );
  end if;

  update public.v2_practice_sessions
  set current_question_id = null,
      current_question_version_id = null,
      current_question_presented_at = null,
      actual_minutes = least(1440, greatest(actual_minutes, ceil(extract(epoch from (now() - started_at)) / 60.0)::integer)),
      completed_value = completed_value + 1,
      last_activity_at = now()
  where id = p_session_id;

  select count(*), count(*) filter (where is_correct)
    into v_count, v_correct_count
  from public.v2_attempts where session_id = p_session_id;

  return jsonb_build_object(
    'attempt', to_jsonb(v_attempt),
    'correctAnswer', v_key.correct_answer,
    'explanation', v_key.explanation,
    'attemptCount', v_count,
    'correctCount', v_correct_count,
    'nextAction', case when v_count >= 5 then 'recommended_stop' else 'continue' end
  );
end;
$$;

create or replace function public.v2_classify_attempt(
  p_user_id uuid,
  p_attempt_id uuid,
  p_classification text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.v2_attempts%rowtype;
begin
  select * into v_attempt
  from public.v2_attempts
  where id = p_attempt_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'attempt_not_found';
  end if;
  if v_attempt.classification_idempotency_key is not null then
    if v_attempt.classification_idempotency_key = p_idempotency_key
       and v_attempt.mistake_classification = p_classification then
      return to_jsonb(v_attempt);
    end if;
    raise exception using errcode = 'P0001', message = 'classification_conflict';
  end if;

  update public.v2_attempts
  set mistake_classification = p_classification,
      classified_at = now(),
      classification_idempotency_key = p_idempotency_key
  where id = p_attempt_id
  returning * into v_attempt;

  return to_jsonb(v_attempt);
end;
$$;

create or replace function public.v2_end_session(
  p_user_id uuid,
  p_session_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
  v_count integer;
  v_correct integer;
  v_minutes_saved integer;
begin
  select * into v_session
  from public.v2_practice_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'session_not_found';
  end if;

  if v_session.ended_at is null then
    update public.v2_practice_sessions
    set state = case when p_reason in ('interrupted', 'user_stop', 'time_limit') then 'abandoned' else 'completed' end,
        ending_reason = p_reason,
        end_idempotency_key = p_idempotency_key,
        ended_at = now(),
        actual_minutes = least(1440, greatest(actual_minutes, ceil(extract(epoch from (now() - started_at)) / 60.0)::integer)),
        current_question_id = null,
        current_question_version_id = null,
        current_question_presented_at = null,
        last_activity_at = now()
    where id = p_session_id
    returning * into v_session;
  elsif v_session.end_idempotency_key is distinct from p_idempotency_key then
    raise exception using errcode = 'P0001', message = 'session_already_ended';
  end if;

  select count(*), count(*) filter (where is_correct)
    into v_count, v_correct
  from public.v2_attempts where session_id = p_session_id;
  v_minutes_saved := greatest(v_session.recommended_minutes - v_session.actual_minutes, 0);

  return jsonb_build_object(
    'sessionId', v_session.id,
    'questionsAttempted', v_count,
    'questionsCorrect', v_correct,
    'minutesPracticed', v_session.actual_minutes,
    'minutesSaved', v_minutes_saved,
    'workRemoved', '[]'::jsonb,
    'rings', jsonb_build_array(
      jsonb_build_object('id', 'score_growth', 'label', 'Score growth', 'completedValue', v_correct, 'targetValue', greatest(v_count, 1), 'progress', case when v_count = 0 then 0 else v_correct::numeric / v_count end, 'unit', 'correct'),
      jsonb_build_object('id', 'weakness_removed', 'label', 'Weakness removed', 'completedValue', 0, 'targetValue', 1, 'progress', 0, 'unit', 'skill'),
      jsonb_build_object('id', 'time_saved', 'label', 'Time saved', 'completedValue', v_minutes_saved, 'targetValue', greatest(v_session.recommended_minutes, 1), 'progress', least(1, v_minutes_saved::numeric / greatest(v_session.recommended_minutes, 1)), 'unit', 'min')
    )
  );
end;
$$;

revoke all on function saturnpath_private.v2_normalize_spr_answer(text) from public, anon, authenticated;
revoke all on function public.v2_start_or_resume_session(uuid, uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.v2_get_next_question(uuid, uuid) from public, anon, authenticated;
revoke all on function public.v2_submit_attempt(uuid, uuid, uuid, uuid, jsonb, integer, integer, boolean, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.v2_classify_attempt(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.v2_end_session(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function saturnpath_private.v2_normalize_spr_answer(text) to service_role;
grant execute on function public.v2_start_or_resume_session(uuid, uuid, boolean, text, text) to service_role;
grant execute on function public.v2_get_next_question(uuid, uuid) to service_role;
grant execute on function public.v2_submit_attempt(uuid, uuid, uuid, uuid, jsonb, integer, integer, boolean, jsonb, jsonb, text) to service_role;
grant execute on function public.v2_classify_attempt(uuid, uuid, text, text) to service_role;
grant execute on function public.v2_end_session(uuid, uuid, text, text) to service_role;
