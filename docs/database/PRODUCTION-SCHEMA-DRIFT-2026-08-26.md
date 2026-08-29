# Production schema drift report — August 26, 2026

**Status:** Reviewed and accepted as a non-blocking V1 baseline difference  
**Method:** Read-only PostgreSQL catalog queries in the signed-in Supabase SQL Editor  
**Production writes:** None  
**Row data accessed:** None

## Result

Production has 19 public tables and all 19 have row-level security enabled. The repository V1 baseline contains 16 public tables.

The production-only tables are:

- `question_inventory_with_active`
- `user`
- `user_achievements`

The production `users` table also has four columns not represented in the repository baseline:

- `current_streak`
- `longest_streak`
- `last_activity_date`
- `inventory_mode`

The live `on_auth_user_created` trigger exists on `auth.users`. The live `handle_new_user` function is `SECURITY DEFINER`, but its pinned configuration is `search_path=public`; the repository reference uses `public, pg_temp`.

Production also contains duplicate historical self-access policies on `users` and several live-only indexes associated with the extra tables. Conversely, some performance indexes declared near the end of `supabase/schema.sql` are not present in production. These are existing V1 differences, not Step 6 changes.

## Step 6 decision

The V2 migration will not rename, drop, rewrite, or reconcile any V1 object. It will:

- create only new `v2_*` tables, indexes, triggers, grants, and policies;
- reference `auth.users(id)` for identity and account-deletion cascades instead of depending on a possibly drifted V1 profile table;
- continue reading shared V1 profile and score data through the server API;
- keep every correct answer and explanation in a private table with no `anon` or `authenticated` grants;
- be tested on a fresh local Supabase database before any later staging or production application.

This isolates V2 from the observed drift while preserving shared authentication. V1 cleanup, if ever desired, must be a separate audited project and is not part of the iOS launch path.

## Sanitized evidence

The compact result is stored in [`supabase/baselines/production-2026-08-26.schema-summary.json`](../../supabase/baselines/production-2026-08-26.schema-summary.json). It contains object names and security metadata only—no rows, IDs, emails, answers, credentials, connection strings, or secrets.
