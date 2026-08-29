# SaturnPath V2 — Coding Session Router

**Status:** Active  
**Purpose:** Make two concurrent coding sessions independently understandable and non-overlapping  
**Architecture:** One shared backend and question bank; separate Next.js web and native SwiftUI clients

## Exact session commands

### `Run the web app plan.`

This command assigns the session to the **web application and shared backend track**.

The session must:

1. Read `SATURNPATH_V2_WEB_IMPLEMENTATION_PLAN.md` completely.
2. Inspect the current checklist and repository state rather than restarting completed work.
3. Continue the first incomplete, unblocked web item.
4. Own all server business logic and keep it client-independent.
5. Update the web plan and `docs/coordination/WEB_TO_IOS_HANDOFFS.md` after completing a contract milestone.

The session must not edit native Swift files, the Xcode project, signing settings, or iOS assets.

### `Continue working on the iOS app.`

This command assigns the session to the **native iOS client and Apple distribution track**.

The session must:

1. Read `SATURNPATH_V2_IOS_IMPLEMENTATION_PLAN.md` completely.
2. Read `docs/coordination/WEB_TO_IOS_HANDOFFS.md` for available backend milestones.
3. Inspect the current iOS checklist and Xcode state rather than restarting completed work.
4. Continue the first incomplete, unblocked native item.
5. Consume the shared API instead of recreating answer validation, adaptation, mastery, review, or recommendation logic in Swift.

The session must not change the shared API, migrations, TypeScript engines, admin console, or question bank. If native work needs a backend change, record it in `docs/coordination/IOS_TO_WEB_REQUESTS.md`.

## Shared system boundary

```text
Next.js web client ──┐
                     ├── /api/v2 → lib/v2 engines → Supabase V2 tables
Native iOS client ───┘                         └── shared published question bank

Admin web console → draft → validate → Darcy approves → publish
```

There is one backend for both products. Do not create separate web and mobile databases, question banks, adaptive engines, or user identities.

## Ownership matrix

| Area | Web/shared-backend session | iOS session |
|---|---|---|
| Student web UI | Owns | Does not edit |
| Native SwiftUI UI | Does not edit | Owns |
| `/api/v2` route handlers | Owns | Consumes |
| Adaptive/mastery/review/recommendation engines | Owns in TypeScript | Displays returned decisions |
| Answer validation and answer keys | Owns server-side | Never receives before submission |
| Supabase schema, migrations, RLS, background jobs | Owns | Does not edit |
| OpenAPI contract | Single writer | Read-only consumer |
| Admin drafting/review console | Owns | Does not edit |
| Question generation pipeline and bank | Owns tooling; Darcy approves | Consumes published content |
| Browser scratchpad/calculator | Owns | Does not edit |
| PencilKit/Vision/native calculator | Does not edit | Owns |
| Web deployment and monitoring | Owns | Does not edit |
| Apple signing, TestFlight, App Store | Does not edit | Owns |
| Shared product behavior | Implements on server | Implements native presentation |

## File ownership

### Web/shared-backend session writes

- `app/api/v2/**`
- V2 student web routes and components under `app/**`
- `app/(admin)/admin/v2/questions/**`
- `lib/v2/**`
- `contracts/v2/**`
- `supabase/migrations/**`
- `content/v2/**`
- backend and web V2 tests under `__tests__/v2/**`
- `SATURNPATH_V2_WEB_IMPLEMENTATION_PLAN.md`
- `docs/coordination/WEB_TO_IOS_HANDOFFS.md`

### Native iOS session writes

- `apps/ios/**`
- native iOS tests and snapshots
- `docs/ios/**`
- `SATURNPATH_V2_IOS_IMPLEMENTATION_PLAN.md`
- `docs/coordination/IOS_TO_WEB_REQUESTS.md`

### Files requiring deliberate coordination

- `AGENTS.md`
- `SATURNPATH_V2_SESSION_ROUTER.md`
- root package configuration
- shared privacy/legal documents

Only one session should edit a coordination file at a time. Neither session may discard unrelated changes.

## API handoff rules

1. `contracts/v2/openapi.json` is the authoritative client contract.
2. The web session is its single writer.
3. Business rules live in `lib/v2/**`; route handlers remain thin.
4. Web-only Server Actions must not become the only interface to shared product behavior.
5. Every mutation uses authentication, validation, rate limiting where appropriate, and idempotency.
6. Pre-submission payloads never contain answers or explanations.
7. A contract milestone is usable by iOS only after its implementation and contract/integration tests pass.
8. The web session records usable milestones in `WEB_TO_IOS_HANDOFFS.md`.
9. The iOS session records missing fields or behavior in `IOS_TO_WEB_REQUESTS.md` rather than silently inventing client behavior.

## Concurrency workflow

Use separate Git worktrees or branches when both sessions run at once. Recommended branch roles:

- `codex/v2-web-backend`
- `codex/v2-ios`

The web app may launch first. The iOS app may continue against stable staging endpoints and can enter TestFlight/App Review later without rebuilding the backend or question bank.

## Current handoff state

- Shared architecture, V1 baseline, question quotas, V2 migrations/RLS, and OpenAPI contract are written.
- The isolated staging Supabase project has the V2 migrations applied and catalog security audited.
- Vercel staging remains incomplete and belongs to the web track.
- The local SwiftUI shell builds and tests successfully.
- Signed archive/TestFlight remains blocked by activation of the individual Apple Developer membership.
