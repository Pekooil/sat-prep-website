-- SaturnPath V2 automatic review intake from incorrect attempts.

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
  if new.is_correct then
    return new;
  end if;

  select * into v_question
  from public.v2_questions
  where id = new.question_id;

  insert into public.v2_review_items (
    user_id,
    source_attempt_id,
    question_id,
    subskill_key,
    state,
    next_due_at,
    interval_days,
    lapse_count,
    resolution_evidence
  ) values (
    new.user_id,
    new.id,
    new.question_id,
    v_question.subskill_key,
    'due',
    new.submitted_at,
    0,
    0,
    jsonb_build_object(
      'createdBy', 'incorrect_attempt',
      'sourceAttemptId', new.id,
      'algorithmVersion', 'review-intake.v1'
    )
  )
  on conflict (source_attempt_id) do update set
    source_attempt_id = excluded.source_attempt_id
  returning * into v_review;

  update public.v2_attempts
  set review_item_id = v_review.id
  where id = new.id;

  return new;
end;
$$;

create trigger v2_attempts_create_review_item
after insert on public.v2_attempts
for each row execute function saturnpath_private.v2_create_review_item_from_attempt();

revoke all on function saturnpath_private.v2_create_review_item_from_attempt()
  from public, anon, authenticated;
grant execute on function saturnpath_private.v2_create_review_item_from_attempt()
  to service_role;
