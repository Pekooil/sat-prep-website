-- Immutable, ordered, service-role-only two-pass question review workflow.

drop trigger if exists v2_question_reviews_immutable on public.v2_question_reviews;
create trigger v2_question_reviews_immutable
before update or delete on public.v2_question_reviews
for each row execute function saturnpath_private.v2_reject_immutable_question_record();

create or replace function public.v2_record_question_review(
  p_question_id uuid,
  p_version_id uuid,
  p_reviewer_id uuid,
  p_review_pass text,
  p_decision text,
  p_rubric_results jsonb,
  p_validation_failures jsonb,
  p_notes text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  active_version_id uuid;
begin
  select current_version_id into active_version_id
  from public.v2_questions
  where id = p_question_id
  for update;

  if active_version_id is null then
    raise exception 'Question does not exist or has no current version.' using errcode = 'P0002';
  end if;
  if active_version_id <> p_version_id then
    raise exception 'Reviews must target the current immutable version.' using errcode = '23514';
  end if;
  if p_review_pass = 'proof_rendering' and not exists (
    select 1 from public.v2_question_reviews
    where question_version_id = p_version_id
      and review_pass = 'content_correctness'
      and decision = 'approved'
  ) then
    raise exception 'Content and correctness must be approved before proof and rendering.' using errcode = '23514';
  end if;

  insert into public.v2_question_reviews (
    question_version_id, reviewer_id, review_pass, decision,
    rubric_results, validation_failures, notes
  ) values (
    p_version_id, p_reviewer_id, p_review_pass, p_decision,
    p_rubric_results, p_validation_failures, p_notes
  );

  if p_review_pass = 'proof_rendering' and p_decision = 'approved' then
    update public.v2_questions set status = 'approved' where id = p_question_id;
  end if;
end;
$$;

revoke all on function public.v2_record_question_review(uuid,uuid,uuid,text,text,jsonb,jsonb,text) from public;
revoke all on function public.v2_record_question_review(uuid,uuid,uuid,text,text,jsonb,jsonb,text) from anon;
revoke all on function public.v2_record_question_review(uuid,uuid,uuid,text,text,jsonb,jsonb,text) from authenticated;
grant execute on function public.v2_record_question_review(uuid,uuid,uuid,text,text,jsonb,jsonb,text) to service_role;
