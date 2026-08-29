# Step 4 — V1 smoke tests and schema baseline

**Status:** Complete; production drift reviewed before Step 6  
**Captured:** August 26, 2026

## What is frozen

The V1 database contract is represented by [`supabase/schema.sql`](../../supabase/schema.sql) and fingerprinted in [`supabase/baselines/v1-2026-08-26.schema.json`](../../supabase/baselines/v1-2026-08-26.schema.json).

The baseline records:

- the SHA-256 fingerprint of the checked-in DDL;
- all 16 public tables;
- the tables expected to have row-level security enabled;
- the signup function and trigger required by V1;
- an explicit statement that no production rows or secrets are included.

This is a sanitized **schema-only** baseline. The development-only `question_inventory` seed statements already present in `schema.sql` contain catalog counts, not student or production data.

## V1 smoke-test boundary

The automated V1 suite now protects these existing behaviors:

1. The schema file still matches the frozen fingerprint.
2. Every baseline table remains declared and RLS-enabled.
3. The baseline contains no recognizable credentials, JWTs, connection strings, or email addresses.
4. The study planner still ranks all eight SAT domains and prioritizes a deliberately weak domain.
5. A normal study day still contains both Math and Reading and Writing work.
6. A generated schedule still includes the final test day and the mandatory practice test two days before it.
7. Onboarding recommendations and generated study plans retain the data shape consumed by V1.

## Change rule from this point forward

- Do not edit or delete V1 tables to implement V2.
- Put V2 database changes in timestamped, additive files under `supabase/migrations/`.
- If an intentional V1 schema change is unavoidable, create a new baseline instead of silently replacing this one.
- Do not update the stored fingerprint just to make a failing test pass; review the DDL difference first.

## Production drift gate

The gate was completed on August 26, 2026 using read-only PostgreSQL catalog queries in the signed-in Supabase SQL Editor. No production rows, credentials, or secrets were accessed, and no production write was made.

The observed V1 differences and the additive V2 decision are documented in [`PRODUCTION-SCHEMA-DRIFT-2026-08-26.md`](./PRODUCTION-SCHEMA-DRIFT-2026-08-26.md). The sanitized object-name summary is stored in [`supabase/baselines/production-2026-08-26.schema-summary.json`](../../supabase/baselines/production-2026-08-26.schema-summary.json).

## Verification

Run:

```bash
npm test
npm run lint
npm run build
```

The targeted Step 4 suite is:

```bash
npx vitest run __tests__/v1
```

### Results on August 26, 2026

- Step 4 suite: 8 tests passed across 2 files.
- Full repository suite: 52 tests passed across 4 files.
- Step 4 ESLint check: passed with no warnings or errors.
- Next.js production build: passed after allowing access to download the configured Google Fonts.
- Repository-wide ESLint: not green because of 45 errors and 24 warnings that predate Step 4 and are outside the files changed here. Step 4 did not modify or suppress them.
