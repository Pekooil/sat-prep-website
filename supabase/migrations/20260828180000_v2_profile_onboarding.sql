-- Extend the isolated V2 profile projection with server-owned onboarding,
-- reminder, and legal-consent state. This remains additive to V1.

alter table public.v2_profiles
  add column timezone text not null default 'UTC' check (
    char_length(btrim(timezone)) between 1 and 100
  ),
  add column reminder_local_time time not null default '18:00',
  add column email_reminders_enabled boolean not null default false,
  add column push_notifications_enabled boolean not null default false,
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column privacy_accepted_at timestamptz,
  add column privacy_version text;

comment on column public.v2_profiles.timezone is
  'IANA timezone used to schedule local reminders.';
comment on column public.v2_profiles.terms_accepted_at is
  'Server-recorded acceptance time; clients cannot supply this timestamp.';
comment on column public.v2_profiles.privacy_accepted_at is
  'Server-recorded acceptance time; clients cannot supply this timestamp.';
