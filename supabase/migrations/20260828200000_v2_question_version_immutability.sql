-- Question content and answer keys are immutable once inserted. Revisions must
-- create a new v2_question_versions row and its matching key record.

create or replace function saturnpath_private.v2_reject_immutable_question_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'SaturnPath question versions and answer keys are immutable; create a new version instead.'
    using errcode = '55000';
end;
$$;

drop trigger if exists v2_question_versions_immutable on public.v2_question_versions;
create trigger v2_question_versions_immutable
before update or delete on public.v2_question_versions
for each row execute function saturnpath_private.v2_reject_immutable_question_record();

drop trigger if exists v2_question_keys_immutable on public.v2_question_keys;
create trigger v2_question_keys_immutable
before update or delete on public.v2_question_keys
for each row execute function saturnpath_private.v2_reject_immutable_question_record();

revoke all on function saturnpath_private.v2_reject_immutable_question_record() from public;
revoke all on function saturnpath_private.v2_reject_immutable_question_record() from anon;
revoke all on function saturnpath_private.v2_reject_immutable_question_record() from authenticated;
