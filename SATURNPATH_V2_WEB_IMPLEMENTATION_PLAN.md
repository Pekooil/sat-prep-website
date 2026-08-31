# SaturnPath V2 — Web App and Shared Backend Implementation Plan

> **Session trigger:** `Run the web app plan.`  
> When this phrase is used, read `SATURNPATH_V2_SESSION_ROUTER.md`, then execute the first incomplete, unblocked checklist item below. Do not perform native iOS work.

**Status:** In progress — V2 API safety foundation scaffolded; staging and live product operations pending
**Primary release order:** Functioning web product first; native iOS client consumes the same backend afterward  
**Backend consumers:** SaturnPath V2 web app and SaturnPath native iOS app  
**Question-bank target:** 200 Darcy-approved original questions — 100 Math and 100 Reading and Writing

## 1. Mission

Build the complete SaturnPath V2 web product and the single shared backend used by both web and iOS. The web release should become usable without waiting for Apple Developer enrollment, TestFlight, or App Review.

The web session owns:

- the student-facing V2 web experience;
- authenticated `/api/v2` endpoints;
- shared TypeScript business engines;
- V2 Supabase migrations, RLS, jobs, and server data access;
- the AI-assisted question drafting and solo-review console;
- the shared published question bank;
- backend, contract, security, content, and web tests;
- Vercel staging/production delivery and web monitoring.

It does not own SwiftUI, Xcode, Apple signing, TestFlight, native notifications, PencilKit, or App Store submission.

## 2. Non-negotiable architecture

```text
Web client ─────┐
                ├── versioned /api/v2 ── shared lib/v2 engines ── Supabase
iOS client ─────┘

Admin web console ── AI draft/validators ── Darcy review ── shared question bank
```

Rules:

1. There is one backend, one user identity system, and one question bank for both clients.
2. Business rules belong in `lib/v2/**`, not React components and not Swift.
3. Route handlers under `app/api/v2/**` remain thin and implement `contracts/v2/openapi.json`.
4. Web-only Server Actions must not be the only interface to behavior required by iOS.
5. Answer keys and validation stay server-side. No pre-submission response, browser bundle, direct Supabase grant, cache, or log may expose them.
6. Student mutations use authenticated server endpoints with validation and idempotency.
7. V1 remains operational; V2 database changes are additive and V2 UI must not inherit the disliked V1 visual design.
8. AI may draft and critique questions but may never approve or publish them. Darcy is the sole approver.
9. Every displayed minutes-saved or unnecessary-work-removed claim must have a stored, auditable plan delta.
10. The OpenAPI contract is versioned and is the native-client handoff boundary.

## 3. Existing completed foundation

- [x] Same-repository, native-iOS/shared-Next.js architecture decision.
- [x] V1 smoke tests and sanitized production schema baseline.
- [x] Domain-weighted 200-question quota and two-pass review rubric.
- [x] Additive V2 schema migrations, RLS policies, and initial OpenAPI 3.1 contract.
- [x] Isolated `saturnpath-v2-staging` Supabase project provisioned and migrated.
- [x] Staging catalog audit: all 14 V2 tables have RLS, authenticated users have no V2 writes, and answer keys are not client-readable.
- [x] Local native shell exists, establishing that the shared contract has a future iOS consumer.

Read these source documents before modifying their areas:

- `docs/architecture/ADR-001-NATIVE-SWIFTUI-SAME-REPOSITORY.md`
- `docs/infrastructure/STEP-03-STAGING-ENVIRONMENTS.md`
- `docs/database/STEP-04-V1-BASELINE.md`
- `docs/content/STEP-05-QUESTION-BANK-QUOTAS-AND-RUBRIC.md`
- `docs/database/STEP-06-V2-SCHEMA-RLS-API.md`
- `contracts/v2/openapi.json`

## 4. Web/shared-backend execution checklist

Execute in order. Do not mark an item complete until its exit gate passes.

### W1. Establish safe concurrency and finish staging infrastructure

- [x] Confirm the web session is using a branch/worktree that will not overwrite concurrent iOS work.
- [ ] Finish the Vercel staging project/configuration from Step 3.
- [ ] Configure only server-safe environment variables in Vercel and local development.
- [x] Link/authenticate the Supabase CLI and reconcile the SQL-Editor-applied staging migration history.
- [ ] Add synthetic staging users and run real JWT owner/cross-user/anonymous/answer-key/service-role tests.
- [ ] Record the staging API base URL and validation evidence without committing secrets.

**Exit gate:** V1 remains green; a staging deployment can reach the isolated V2 database; authenticated RLS tests pass.

### W2. Implement the shared V2 server foundation

- [x] Read the relevant Next.js 16.2.7 guides from `node_modules/next/dist/docs/` before writing routes or server code.
- [x] Create feature-based `lib/v2/**` modules and shared request/auth/error/idempotency utilities.
- [x] Scaffold thin `/api/v2` route handlers from the OpenAPI contract with safe placeholders.
- [ ] Generate or verify TypeScript contract models from the single contract source.
- [ ] Add schema validation, normalized errors, structured safe logging, and rate limiting where appropriate.
- [ ] Add feature flags and production kill switches for question delivery, scratch analysis, and question IDs.

#### Web-track progress — August 29, 2026

- The web-owned branch is `codex/saturnpath-v2-web-design`; the worktree was clean before this turn and no `apps/ios/**` files were changed.
- `lib/v2/api/**` now centralizes bearer authentication, UUID and header validation, JSON-body limits, admin allowlisting, rate limiting, request IDs, no-store responses, normalized errors, and safe unknown-error logging.
- Explicit route handlers now exist for every student and admin operation in `contracts/v2/openapi.json`. They authenticate and validate before returning a `NOT_IMPLEMENTED` response, so unfinished operations cannot accidentally expose student data or answer keys.
- Server-only rollout flags are disabled by default. `GET /bootstrap` now reads the authenticated user’s V2 profile, today’s recommendation, and active/paused session metadata through the server-only client; it returns no answer-bearing fields.
- On August 30, the Supabase CLI was authenticated and linked to `saturnpath-v2-staging`. Migration history already contained the four SQL-Editor-applied versions, so no repair was run. Fourteen newer migration files were synchronized byte-for-byte from the clean `codex/v2-web-backend` worktree; `supabase migration list --linked` now shows all 18 local and remote versions aligned. Vercel staging access/configuration remains pending.

**Exit gate:** Contract tests prove every implemented operation matches OpenAPI, and placeholder responses contain no hard-coded student content or answer leakage.

### W3. Build shared authentication, onboarding, profile, and deletion

- [ ] Preserve existing Supabase identities and support a shared account across V1, V2 web, and future iOS.
- [ ] Implement `/bootstrap`, profile mutation, onboarding persistence, and server-backed Home prerequisites.
- [ ] Implement web onboarding for scores, target, SAT date, accommodations, timezone/reminders, terms/privacy, and scratch-analysis preference.
- [ ] Implement complete account deletion with confirmation, idempotency, audit-safe execution, and coverage of all V2 student data.
- [ ] Add identity-linking tests covering existing web users and future Apple private-relay identities.

**Exit gate:** A staging web user can authenticate, onboard, reload, and delete the account end to end.

### W4. Build the admin drafting and review console

- [ ] Reuse the existing server-side admin allowlist pattern.
- [ ] Implement provider-agnostic AI drafting and independent critique interfaces.
- [ ] Implement deterministic validators, duplicate checks, provenance, rights status, immutable versions, and preview rendering.
- [ ] Implement separate content/correctness and proof/rendering review passes.
- [ ] Require Darcy's explicit recorded approval before publishing.
- [ ] Implement quarantine, retirement, version history, and audit logging.

**Exit gate:** A candidate can move through draft → validation → two Darcy review passes → publish, with no generation-to-publication shortcut.

### W5. Produce and approve the first 20 questions

- [ ] Draft 10 Math and 10 Reading and Writing questions according to quota cells.
- [ ] Run automated checks and independent critique.
- [ ] Present every candidate to Darcy for both required approval passes.
- [ ] Seed only approved immutable versions into staging.
- [ ] Verify responsive rendering, accessible text, provenance, and rights status.

**Exit gate:** Staging has 20 approved/published original questions and no unreviewed question can be delivered to students.

### W6. Deliver the secure web practice vertical slice

- [ ] Implement session start/resume, next-question delivery, server-side submission, classification, and session ending.
- [ ] Guarantee question payloads exclude answer keys and explanations before submission.
- [ ] Persist attempts and constrained interaction telemetry atomically and idempotently.
- [ ] Build the V2 web flow: Home → Start Practicing → question → submit → visual feedback/path delta → next → summary.
- [ ] Support multiple choice and defined Math student-produced responses.
- [ ] Add interruption, expired-auth, duplicate-submit, network, loading, empty, and server-error states.

**Exit gate:** A real staging web user completes the entire loop with no hard-coded question data, and integration tests confirm stored results.

### W7. Add mastery, adaptive micro-sets, and selection explanations

- [ ] Implement cold start, skill state, candidate priority, difficulty fit, exposure controls, and review capacity.
- [ ] Implement 3–5-question micro-set adaptation and auditable before/after path changes.
- [ ] Return one short selection title plus two visual metrics for “Why this question.”
- [ ] Build web visualizations for selection reasons, pacing, and adaptation without excessive explanatory text.
- [ ] Add deterministic golden histories, property tests, and algorithm-version storage.

**Exit gate:** Fixed histories produce stable explainable routes, and every delivered question records and displays why it was selected.

### W8. Add automatic error review and resolution

- [ ] Automatically create review items from incorrect attempts.
- [ ] Implement Due → Learning → Retesting → Resolved transitions, similar-question linking, spacing, lapses, and Quick Fix triggers.
- [ ] Implement one-tap classification and a constrained Other field.
- [ ] Build the web Review experience and automatically include high-value due reviews in normal practice.
- [ ] Add transition, spacing, authorization, and end-to-end tests.

**Exit gate:** An error can complete the full correction → similar confirmation → delayed retest → resolved lifecycle.

### W9. Add daily optimization, rings, savings, path deltas, and stopping

- [ ] Implement daily workload and new/review allocation.
- [ ] Compute rings from normalized high-value practice, not raw question counts.
- [ ] Implement meaningful per-answer path deltas and micro-set adaptation notices.
- [ ] Implement the marginal-value stop rule with Finish and Keep Practicing outcomes.
- [ ] Persist the audit trail for removed work, replacement work, questions removed, and net minutes saved.
- [ ] Build the web Home and post-answer visual presentation.

**Exit gate:** Every savings claim can be reconstructed from stored inputs, and the web experience makes the recommended next action visually obvious.

### W10. Add browser scratchpad, calculator, and constrained analysis

- [ ] Build a bottom-sheet browser scratchpad that never covers the complete question.
- [ ] Add drawing, typed notes, undo/redo/clear, and the agreed calculator integration or fallback.
- [ ] Persist scratch state through browser interruptions for the active attempt.
- [ ] Implement privacy-controlled structured scratch signals and confidence-aware diagnostics.
- [ ] Do not persist raw scratch images indefinitely or require analysis to use the scratchpad.
- [ ] Keep the server contract usable by native PencilKit/Vision later.

**Exit gate:** Scratch tools work through submission/recovery, privacy choices are honored, and low-confidence analysis never appears as fact.

### W11. Complete the web product surfaces

- [ ] Complete Home, Progress, Review, Profile, score range, target trajectory, pacing, accuracy, mastery, and history.
- [ ] Complete preferences, reminders where applicable, privacy/terms/support, sign-out, and deletion access.
- [ ] Add server and browser session recovery.
- [ ] Verify responsive mobile-first web behavior without copying the V1 design system.
- [ ] Add accessible keyboard, focus, contrast, reduced-motion, screen-reader, and Math alternatives.

**Exit gate:** The V2 web product is functionally complete on supported mobile and desktop browsers.

### W12. Grow and calibrate the shared bank to 200 questions

- [ ] Reach and validate milestones of 50, 100, then 200 approved questions.
- [ ] Preserve the exact domain/subskill/difficulty quotas.
- [ ] Complete both Darcy review passes on every question.
- [ ] Run duplicate, correctness, accessibility, answer-pattern, and rendering QA.
- [ ] Monitor timing/accuracy and quarantine weak or ambiguous items without a client release.

**Exit gate:** Exactly 100 Math and 100 Reading and Writing questions are approved, balanced, publishable, and monitored.

### W13. Complete shared security, reliability, privacy, and observability gates

- [ ] Run migration, RLS, authorization, contract, integration, answer-leakage, idempotency, and rate-limit tests.
- [ ] Verify account deletion and data retention end to end.
- [ ] Add operational monitoring for API latency/errors, session failures, question quarantine, drafting failures, and job failures.
- [ ] Meet API performance budgets and verify V1 regression tests.
- [ ] Update privacy/terms/data maps to match actual web, backend, AI, question, telemetry, and scratch behavior.
- [ ] Record stable backend milestones for iOS in `docs/coordination/WEB_TO_IOS_HANDOFFS.md`.

**Exit gate:** No answer leakage or open P0/P1 defects; V1 and V2 test gates pass; documentation matches production behavior.

### W14. Launch and stabilize the web product

- [ ] Run staging acceptance with production-like synthetic data.
- [ ] Configure production environment variables, domains, feature flags, monitoring, and rollback controls.
- [ ] Apply migrations to production only after the recorded approval checks pass.
- [ ] Deploy the web product, verify the complete browser → API → database → response flow, and monitor launch.
- [ ] Keep published questions and risky features remotely quarantinable/disableable.

**Exit gate:** The web product is publicly usable and stable while iOS continues independently against the same production backend.

## 5. Original-plan responsibility mapping

The web session owns the remainder of original Step 3; all of Steps 9, 10, and 17; and the backend/web portions of Steps 8 and 11–18. Apple Step 2, native Step 7, native client portions of Steps 8 and 11–18, and Steps 19–20 remain with the iOS session.

## 6. Required iOS handoffs

Record a `READY` entry in `docs/coordination/WEB_TO_IOS_HANDOFFS.md` after each of these becomes implemented and tested:

1. Auth/bootstrap/profile/onboarding/account deletion.
2. Home and daily recommendation.
3. Sessions/next/attempt/classification/end vertical slice.
4. Adaptive reasons and micro-set/path-delta behavior.
5. Review lifecycle and progress endpoints.
6. Scratch-signal contract.
7. Production base URL, minimum client version, and release feature flags.

Do not tell the iOS session to consume a route merely because it exists in the specification.

## 7. Decisions that still require Darcy

- AI provider credentials/provider choice when live drafting is connected; keep the implementation provider-agnostic until then.
- Final V2 public web URL/path if it has not already been decided in the web-design session.
- Every question's two approval decisions.
- Commercial Desmos terms versus the defined fallback.
- Production migration approval.
- Final privacy/support contacts and public release timing.
