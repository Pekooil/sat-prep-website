-- SaturnPath V2 RLS and grants.
-- All client mutations are denied at the database grant layer. The authenticated
-- app reads only safe published content and rows owned by the signed-in user.
-- The server API performs validated mutations with its server-only secret.

alter table public.v2_questions enable row level security;
alter table public.v2_question_versions enable row level security;
alter table public.v2_question_keys enable row level security;
alter table public.v2_question_reviews enable row level security;
alter table public.v2_question_metrics enable row level security;
alter table public.v2_daily_recommendations enable row level security;
alter table public.v2_practice_sessions enable row level security;
alter table public.v2_attempts enable row level security;
alter table public.v2_attempt_events enable row level security;
alter table public.v2_user_skill_state enable row level security;
alter table public.v2_review_items enable row level security;
alter table public.v2_adaptation_events enable row level security;
alter table public.v2_scratch_insights enable row level security;

revoke all on table public.v2_questions from anon, authenticated;
revoke all on table public.v2_question_versions from anon, authenticated;
revoke all on table public.v2_question_keys from anon, authenticated;
revoke all on table public.v2_question_reviews from anon, authenticated;
revoke all on table public.v2_question_metrics from anon, authenticated;
revoke all on table public.v2_daily_recommendations from anon, authenticated;
revoke all on table public.v2_practice_sessions from anon, authenticated;
revoke all on table public.v2_attempts from anon, authenticated;
revoke all on table public.v2_attempt_events from anon, authenticated;
revoke all on table public.v2_user_skill_state from anon, authenticated;
revoke all on table public.v2_review_items from anon, authenticated;
revoke all on table public.v2_adaptation_events from anon, authenticated;
revoke all on table public.v2_scratch_insights from anon, authenticated;

grant select on table public.v2_questions to authenticated;
grant select on table public.v2_question_versions to authenticated;
grant select on table public.v2_daily_recommendations to authenticated;
grant select on table public.v2_practice_sessions to authenticated;
grant select on table public.v2_attempts to authenticated;
grant select on table public.v2_attempt_events to authenticated;
grant select on table public.v2_user_skill_state to authenticated;
grant select on table public.v2_review_items to authenticated;
grant select on table public.v2_adaptation_events to authenticated;
grant select on table public.v2_scratch_insights to authenticated;

grant select, insert, update, delete on table public.v2_questions to service_role;
grant select, insert, update, delete on table public.v2_question_versions to service_role;
grant select, insert, update, delete on table public.v2_question_keys to service_role;
grant select, insert, update, delete on table public.v2_question_reviews to service_role;
grant select, insert, update, delete on table public.v2_question_metrics to service_role;
grant select, insert, update, delete on table public.v2_daily_recommendations to service_role;
grant select, insert, update, delete on table public.v2_practice_sessions to service_role;
grant select, insert, update, delete on table public.v2_attempts to service_role;
grant select, insert, update, delete on table public.v2_attempt_events to service_role;
grant select, insert, update, delete on table public.v2_user_skill_state to service_role;
grant select, insert, update, delete on table public.v2_review_items to service_role;
grant select, insert, update, delete on table public.v2_adaptation_events to service_role;
grant select, insert, update, delete on table public.v2_scratch_insights to service_role;

create policy "Authenticated users can read published V2 question metadata"
on public.v2_questions
for select
to authenticated
using (
  status = 'published'
  and current_version_id is not null
  and published_at is not null
);

create policy "Authenticated users can read current published V2 question content"
on public.v2_question_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.v2_questions question
    where question.id = v2_question_versions.question_id
      and question.status = 'published'
      and question.current_version_id = v2_question_versions.id
  )
);

create policy "Users can read own V2 daily recommendations"
on public.v2_daily_recommendations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 practice sessions"
on public.v2_practice_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 attempts"
on public.v2_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 attempt events"
on public.v2_attempt_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 skill state"
on public.v2_user_skill_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 review items"
on public.v2_review_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 adaptation events"
on public.v2_adaptation_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own V2 scratch insights"
on public.v2_scratch_insights
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function saturnpath_private.v2_touch_updated_at() from public, anon, authenticated;
revoke all on function saturnpath_private.v2_validate_current_question_version() from public, anon, authenticated;
grant execute on function saturnpath_private.v2_touch_updated_at() to service_role;
grant execute on function saturnpath_private.v2_validate_current_question_version() to service_role;

comment on table public.v2_question_keys is
  'Server-only answer keys and explanations. Never grant anon or authenticated access.';
comment on table public.v2_attempts is
  'Server-validated attempts. Authenticated clients have read-only access to their own rows.';
comment on table public.v2_scratch_insights is
  'Structured scratch interaction signals only. Raw scratch images are not stored here.';
