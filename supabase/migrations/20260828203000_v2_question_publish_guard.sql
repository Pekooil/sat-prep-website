-- Publishing is a distinct, service-role-only action after both immutable
-- human approvals. The final proof reviewer must perform the publish action.

create or replace function public.v2_publish_question(
  p_question_id uuid,
  p_version_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  question_record public.v2_questions%rowtype;
begin
  select * into question_record
  from public.v2_questions
  where id = p_question_id
  for update;

  if question_record.id is null then
    raise exception 'Question does not exist.' using errcode = 'P0002';
  end if;
  if question_record.current_version_id <> p_version_id then
    raise exception 'Only the current immutable version can be published.' using errcode = '23514';
  end if;
  if question_record.status <> 'approved' or question_record.rights_status <> 'verified' then
    raise exception 'Question is not approved with verified rights.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.v2_question_reviews
    where question_version_id = p_version_id
      and review_pass = 'content_correctness'
      and decision = 'approved'
  ) then
    raise exception 'Content and correctness approval is missing.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.v2_question_reviews
    where question_version_id = p_version_id
      and review_pass = 'proof_rendering'
      and decision = 'approved'
      and reviewer_id = p_actor_id
  ) then
    raise exception 'The final proof approver must explicitly publish.' using errcode = '42501';
  end if;

  update public.v2_questions
  set status = 'published', published_at = now()
  where id = p_question_id;
end;
$$;

revoke all on function public.v2_publish_question(uuid,uuid,uuid) from public;
revoke all on function public.v2_publish_question(uuid,uuid,uuid) from anon;
revoke all on function public.v2_publish_question(uuid,uuid,uuid) from authenticated;
grant execute on function public.v2_publish_question(uuid,uuid,uuid) to service_role;
