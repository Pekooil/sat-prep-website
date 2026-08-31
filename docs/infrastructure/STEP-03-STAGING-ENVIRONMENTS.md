# Step 3 — staging environments

**Status:** Supabase complete and CLI linked; Vercel staging pending
**Updated:** August 30, 2026

## Environment decision

SaturnPath V1 and V2 will share the existing `sat-prep-website` Supabase project in production so one person keeps one SaturnPath account. V2 development uses a separate staging project so schema, authentication, RLS, and migrations can be exercised without risking V1 production data.

## Supabase staging

| Setting | Value |
|---|---|
| Project name | `saturnpath-v2-staging` |
| Project reference | `rzxquectwvwevwqmhmzr` |
| Project URL | `https://rzxquectwvwevwqmhmzr.supabase.co` |
| Region | West US (North California), `us-west-1` |
| Plan | Free |
| Data API | Enabled |
| Automatically expose new tables | Disabled |
| Automatic RLS for new public tables | Enabled |

The project was healthy after provisioning. No production SaturnPath schema or data was changed.

The free account permits two active projects. The existing `calyxa` project was therefore paused with the owner's approval to free the staging slot. It was not deleted and Supabase reported that it can be resumed for up to one year.

## Applied V2 database

The following local migrations were executed against staging in transaction order:

1. `20260826173000_v2_question_bank.sql`
2. `20260826174000_v2_practice_state.sql`
3. `20260826175000_v2_rls_and_grants.sql`
4. `20260826180000_v2_profiles.sql`

The first three files were applied as one transaction and the profile projection as a second transaction. Both returned `Success. No rows returned` from PostgreSQL.

The V1 `supabase/schema.sql` file was deliberately not copied into staging. It contains a duplicate `id` declaration in `score_predictions` and development-only question-inventory seed data. V2 instead owns `v2_profiles`, keyed directly to `auth.users`, and the production server can import compatible V1 profile values by user ID without coupling the mobile schema to V1 drift.

## Live security audit

Read-only PostgreSQL catalog checks returned:

- 14 `v2_*` tables;
- RLS enabled on all 14 tables;
- 11 published-content or owner-read policies;
- zero `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` grants to `authenticated`;
- no authenticated `SELECT` privilege on `v2_question_keys`.

The database contains no seeded students, attempts, questions, answers, or production data.

## Migration-history note

The SQL was originally executed from the Supabase SQL Editor because the local
CLI was not authenticated and a local Docker/PostgreSQL runtime was unavailable.
On August 30, 2026, the CLI was authenticated and linked to project
`rzxquectwvwevwqmhmzr`. `supabase migration list --linked` confirmed that all
four local versions were already recorded remotely, so no migration repair and
no SQL re-execution were needed.

The same check initially found 14 newer remote migration versions, from
`20260828180000` through `20260829223000`. Their exact committed source files
were located in the clean `codex/v2-web-backend` worktree and synchronized into
this checkout. A second `supabase migration list --linked` showed all 18 local
and remote versions aligned. No migration repair, SQL re-execution, or database
push was performed.

## Secrets

The database password was entered directly by the owner in Supabase. It was not read, copied, logged, or stored in this repository. API keys have not been copied into local files.

When Vercel staging is created, add the staging project URL and publishable/anonymous key to the staging environment and keep the service-role secret server-only. Never put the service-role secret in the iOS app or a `NEXT_PUBLIC_*` variable.

## Remaining Step 3 work

- Create or designate a Vercel preview/staging deployment for the existing repository.
- Add staging-only Supabase environment variables in Vercel.
- Configure staging authentication redirect URLs after the iOS callback and web preview URLs are known.
- Run real JWT ownership tests during the authentication vertical slice.

## Web API rollout controls

The V2 server reads these server-side feature switches and defaults each one to
`false` when unset. Keep the service-role key out of all `NEXT_PUBLIC_*` values.

```text
V2_PRACTICE_ENABLED=false
V2_SCRATCH_ANALYSIS_ENABLED=false
V2_PUSH_NOTIFICATIONS_ENABLED=false
```

The web API safety foundation is implemented locally, but staging JWT ownership
tests, Vercel configuration, and the first live data operation are still
required before any V2 handoff is marked `READY`.
