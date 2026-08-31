-- SaturnPath V2 adaptive 3–5 question micro-sets and auditable route changes.

alter table public.v2_practice_sessions
  add column current_micro_set_target integer not null default 3
    check (current_micro_set_target between 3 and 5),
  add column micro_sets_completed integer not null default 0
    check (micro_sets_completed >= 0),
  add column current_route jsonb not null default jsonb_build_object(
    'label', 'Baseline route',
    'targetDifficulty', 'medium',
    'focusSubskill', null,
    'targetQuestions', 3
  ) check (jsonb_typeof(current_route) = 'object');

alter table public.v2_attempts
  add column next_action_snapshot text not null default 'continue'
    check (next_action_snapshot in ('continue', 'micro_set_summary', 'recommended_stop'));

create or replace function public.v2_get_current_adaptive_route(
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

  return jsonb_build_object(
    'difficulty', v_session.current_route->>'targetDifficulty',
    'focusSubskill', v_session.current_route->>'focusSubskill',
    'label', v_session.current_route->>'label',
    'microSetNumber', v_session.current_micro_set,
    'targetQuestions', v_session.current_micro_set_target
  );
end;
$$;

create or replace function saturnpath_private.v2_adapt_micro_set_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.v2_practice_sessions%rowtype;
  v_question public.v2_questions%rowtype;
  v_attempt_count integer;
  v_correct_count integer;
  v_accuracy numeric;
  v_pacing_ratio numeric;
  v_average_expected numeric;
  v_before_route jsonb;
  v_after_route jsonb;
  v_before_label text;
  v_after_label text;
  v_next_target integer;
  v_next_difficulty text;
  v_questions_delta integer;
  v_minutes_delta integer;
  v_completed integer;
  v_next_action text;
  v_path_delta jsonb;
  v_trigger text;
begin
  select * into v_session
  from public.v2_practice_sessions
  where id = new.session_id and user_id = new.user_id;
  select * into v_question
  from public.v2_questions
  where id = new.question_id;

  select
    count(*),
    count(*) filter (where is_correct),
    coalesce(avg(server_response_seconds::numeric / nullif(expected_seconds, 0)), 1),
    coalesce(avg(expected_seconds), new.expected_seconds)
  into v_attempt_count, v_correct_count, v_pacing_ratio, v_average_expected
  from public.v2_attempts
  where session_id = new.session_id
    and micro_set_number = new.micro_set_number;

  v_before_route := v_session.current_route;
  v_before_label := coalesce(v_before_route->>'label', 'Current route');

  if v_attempt_count < v_session.current_micro_set_target then
    v_path_delta := jsonb_build_object(
      'beforeLabel', v_before_label,
      'afterLabel', v_before_label,
      'impactMinutes', 0,
      'impactQuestions', 0,
      'impactDirection', 'unchanged',
      'visualKind', 'no_change'
    );
    update public.v2_attempts
    set path_delta_snapshot = v_path_delta,
        next_action_snapshot = 'continue'
    where id = new.id;
    return new;
  end if;

  v_accuracy := v_correct_count::numeric / greatest(v_attempt_count, 1);
  if v_accuracy < 0.5 or v_pacing_ratio > 1.25 then
    v_next_target := 3;
    v_next_difficulty := 'easy';
    v_after_label := 'Foundation reset';
    v_trigger := case when v_pacing_ratio > 1.25 then 'pacing' else 'correctness' end;
  elsif v_accuracy >= 0.8 and v_pacing_ratio <= 1.1 then
    v_next_target := 5;
    v_next_difficulty := 'hard';
    v_after_label := 'Stretch route';
    v_trigger := 'mastery';
  else
    v_next_target := 4;
    v_next_difficulty := 'medium';
    v_after_label := 'Reinforcement route';
    v_trigger := 'correctness';
  end if;

  v_after_route := jsonb_build_object(
    'label', v_after_label,
    'targetDifficulty', v_next_difficulty,
    'focusSubskill', v_question.subskill_key,
    'targetQuestions', v_next_target
  );
  v_questions_delta := v_next_target - v_session.current_micro_set_target;
  v_minutes_delta := round(v_questions_delta * v_average_expected / 60.0)::integer;
  v_completed := v_session.micro_sets_completed + 1;
  v_next_action := case when v_completed >= 2 then 'recommended_stop' else 'micro_set_summary' end;
  v_path_delta := jsonb_build_object(
    'beforeLabel', v_before_label,
    'afterLabel', v_after_label,
    'impactMinutes', v_minutes_delta,
    'impactQuestions', v_questions_delta,
    'impactDirection', case
      when v_questions_delta > 0 then 'added'
      when v_questions_delta < 0 then 'removed'
      else 'reordered'
    end,
    'visualKind', 'route_swap'
  );

  update public.v2_attempts
  set path_delta_snapshot = v_path_delta,
      next_action_snapshot = v_next_action
  where id = new.id;

  update public.v2_practice_sessions
  set current_micro_set = current_micro_set + 1,
      current_micro_set_target = v_next_target,
      micro_sets_completed = v_completed,
      current_route = v_after_route
  where id = new.session_id;

  insert into public.v2_adaptation_events (
    user_id, session_id, attempt_id, before_route, after_route, trigger_type,
    evidence, user_facing_label, minutes_delta, questions_delta, displayed
  ) values (
    new.user_id,
    new.session_id,
    new.id,
    v_before_route,
    v_after_route,
    v_trigger,
    jsonb_build_object(
      'accuracy', round(v_accuracy, 4),
      'correctCount', v_correct_count,
      'pacingRatio', round(v_pacing_ratio, 4),
      'previousTarget', v_session.current_micro_set_target,
      'attemptCount', v_attempt_count,
      'nextTarget', v_next_target,
      'microSetCompleted', v_session.current_micro_set,
      'algorithmVersion', 'adaptive-micro-set.v1'
    ),
    v_after_label,
    v_minutes_delta,
    v_questions_delta,
    false
  );

  return new;
end;
$$;

create trigger v2_attempts_adapt_micro_set
after insert on public.v2_attempts
for each row execute function saturnpath_private.v2_adapt_micro_set_after_attempt();

revoke all on function public.v2_get_current_adaptive_route(uuid, uuid) from public, anon, authenticated;
revoke all on function saturnpath_private.v2_adapt_micro_set_after_attempt() from public, anon, authenticated;
grant execute on function public.v2_get_current_adaptive_route(uuid, uuid) to service_role;
grant execute on function saturnpath_private.v2_adapt_micro_set_after_attempt() to service_role;
