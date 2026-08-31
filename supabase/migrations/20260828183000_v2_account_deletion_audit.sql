-- Durable, non-personal audit trail for V2 account deletion dispatch.
-- Raw auth user IDs, emails, tokens, and idempotency keys are never stored.

create table public.v2_account_deletion_audits (
  deletion_id uuid primary key,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  request_id text not null check (char_length(request_id) between 1 and 128),
  status text not null default 'pending' check (
    status in ('pending', 'dispatched', 'completed', 'failed')
  ),
  requested_at timestamptz not null,
  dispatched_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  constraint v2_account_deletion_idempotency_unique
    unique (subject_hash, idempotency_key_hash)
);

alter table public.v2_account_deletion_audits enable row level security;

revoke all on table public.v2_account_deletion_audits from anon, authenticated;
grant select, insert, update on table public.v2_account_deletion_audits to service_role;

comment on table public.v2_account_deletion_audits is
  'Non-personal deletion execution audit. Contains one-way hashes only and intentionally has no auth.users foreign key.';
