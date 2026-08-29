# Step 6 — V2 schema, RLS, and API contract

**Status:** Complete locally; migrations are written but not applied to staging or production  
**Completed:** August 26, 2026

## Outcome

SaturnPath V2 now has an additive database design, explicit row-level security boundaries, and a versioned OpenAPI 3.1 contract for the native iOS app and solo-reviewer admin console.

No production data or schema was changed in this step. The production comparison used read-only catalog metadata and is documented in [`PRODUCTION-SCHEMA-DRIFT-2026-08-26.md`](./PRODUCTION-SCHEMA-DRIFT-2026-08-26.md).

## Migration order

Apply these files in timestamp order to a fresh local database, then staging, and only later to production:

1. [`20260826173000_v2_question_bank.sql`](../../supabase/migrations/20260826173000_v2_question_bank.sql) — question metadata, immutable content versions, server-only answer keys, two-pass reviews, and quality metrics.
2. [`20260826174000_v2_practice_state.sql`](../../supabase/migrations/20260826174000_v2_practice_state.sql) — recommendations, sessions, attempts, events, skill state, review items, adaptation evidence, and structured scratch signals.
3. [`20260826175000_v2_rls_and_grants.sql`](../../supabase/migrations/20260826175000_v2_rls_and_grants.sql) — RLS, grants, policies, and function permissions.
4. [`20260826180000_v2_profiles.sql`](../../supabase/migrations/20260826180000_v2_profiles.sql) — mobile-facing profile state isolated from V1 schema drift, with server-only writes and owner-only reads.

All new public tables use the `v2_` prefix. Helper functions live in the isolated `saturnpath_private` schema. The migrations do not alter, rename, truncate, or drop V1 objects.

## Security boundary

| Data | Signed-in app | Server service role |
|---|---|---|
| Published question metadata and current content | Read | Manage |
| Correct answers, explanations, and validation evidence | No access | Manage |
| Question reviews and aggregate quality metrics | No access | Manage |
| Student profile, recommendations, sessions, attempts, skill state, review state, path changes, and scratch insights | Read own rows only | Manage after API validation |
| Anonymous access | No V2 access | Not applicable |

The app has no direct V2 write grants. Every mutation goes through the authenticated server API, which is responsible for input validation, ownership checks, answer evaluation, idempotency, and transactional adaptation updates. The service-role credential must remain server-only.

Raw scratch drawings and images are deliberately absent from the schema. Only structured interaction counts and confidence-aware diagnostic signals can be persisted.

## API contract

[`contracts/v2/openapi.json`](../../contracts/v2/openapi.json) is the source of truth for the API implementation and future Swift client generation. It defines:

- bootstrap, home, profile, progress, review, and account operations;
- practice-session creation, next-question delivery, answer submission, mistake classification, and session ending;
- admin drafting, inspection, two-pass review, publishing, and quarantine operations;
- bearer-token authentication and an `Idempotency-Key` on every mutation;
- a pre-submission `QuestionPayload` that excludes answers and explanations;
- post-submission feedback that can reveal the evaluated answer and explanation.

The initial contract version is `0.1.0`. Breaking changes must produce a new contract version instead of silently changing an already shipped client expectation.

## Verification

The static contract suite is [`__tests__/v2/schema-and-api-contract.test.ts`](../../__tests__/v2/schema-and-api-contract.test.ts). It verifies that:

- all 14 V2 tables are created and RLS-enabled;
- the migrations contain no destructive V1 table operation;
- answer keys are not granted to signed-in clients;
- signed-in clients receive no V2 insert, update, or delete grants;
- scratch persistence contains structured signals rather than raw drawings;
- the complete initial route set is present;
- every mutation requires an idempotency key;
- every local OpenAPI reference resolves and every operation ID is unique;
- answer keys do not appear in the pre-submission payload;
- admin review and publishing operations remain present.

Results on August 26, 2026:

- Step 6 contract suite: 9 tests passed.
- Step 6 ESLint check: passed with no warnings or errors.
- JSON parsing and OpenAPI local-reference checks: passed.
- `git diff --check`: passed.
- Staging PostgreSQL execution: all four migrations succeeded.
- Staging catalog audit: 14/14 V2 tables have RLS, authenticated has zero write grants, and authenticated cannot select answer keys.

## Operational gate before production

The migrations have now executed successfully on the isolated `saturnpath-v2-staging` Supabase project. The catalog-level security checks passed, but real JWT ownership tests still belong in the authentication vertical slice when synthetic staging users exist.

The local machine still lacks the Docker/PostgreSQL runtime for disposable database resets. Before any production application:

1. authenticate and link the Supabase CLI;
2. mark the four SQL-Editor-applied staging versions as applied in migration history;
3. run authenticated owner/cross-user, anonymous-denial, answer-key-denial, and service-role-write tests;
4. seed only synthetic staging questions and users;
5. preserve the staging output as the production migration approval record.

## Standards used

- Supabase database migrations: <https://supabase.com/docs/guides/deployment/database-migrations>
- Supabase row-level security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- OpenAPI Specification: <https://spec.openapis.org/oas/>
