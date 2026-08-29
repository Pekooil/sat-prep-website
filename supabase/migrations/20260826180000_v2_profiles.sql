-- SaturnPath V2 profile state.
-- V2 owns this mobile-facing projection and may import compatible values from
-- the V1 public.users row through the server API. Identity remains auth.users.

create table public.v2_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (
    full_name is null
    or (char_length(btrim(full_name)) between 1 and 100)
  ),
  current_score integer check (current_score between 400 and 1600),
  target_score integer check (target_score between 400 and 1600),
  test_date date,
  onboarding_complete boolean not null default false,
  scratch_analysis_enabled boolean not null default false,
  timing_accommodation_multiplier numeric(4, 2) not null default 1 check (
    timing_accommodation_multiplier between 1 and 3
  ),
  imported_from_v1_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger v2_profiles_touch_updated_at
before update on public.v2_profiles
for each row execute function saturnpath_private.v2_touch_updated_at();

alter table public.v2_profiles enable row level security;

revoke all on table public.v2_profiles from anon, authenticated;
grant select on table public.v2_profiles to authenticated;
grant select, insert, update, delete on table public.v2_profiles to service_role;

create policy "Users can read own V2 profile"
on public.v2_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.v2_profiles is
  'Mobile-facing V2 profile projection. Server writes only; authenticated users read their own row.';
