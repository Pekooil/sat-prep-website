# ADR-001: Native SwiftUI App in the Existing Repository

**Status:** Accepted  
**Decision date:** August 26, 2026  
**Decision owner:** Darcy Wang  
**Applies to:** SaturnPath V2 iOS

## Context

SaturnPath V1 is an operational Next.js and Supabase web planner. SaturnPath V2 is a new mobile-first adaptive practice product intended for publication on the iOS App Store. V2 must share accounts and selected student data with V1 without inheriting the V1 user interface or risking regressions to the planner.

The main architectural choices were:

1. Native SwiftUI or a cross-platform/web-based mobile client.
2. The existing SaturnPath repository or a separate repository.

## Decision

SaturnPath V2 will be built as a **native SwiftUI iOS application in the existing `sat-prep-website` repository**.

The intended source boundary is:

```text
apps/ios/                    Native SaturnPath V2 client
app/api/v2/                  Versioned mobile API routes
app/(admin)/admin/v2/        Question drafting and review console
lib/v2/                      V2 server-side product engines
supabase/migrations/         Additive V2 database migrations
```

Existing V1 routes, components, and services stay in their current locations. They will not be moved as part of the V2 setup.

## Responsibility boundaries

### iOS client owns

- Native presentation and navigation.
- Local interaction state.
- Current-session recovery and safe retry state.
- PencilKit scratchpad and on-device preprocessing.
- Accessibility and device-specific behavior.

### V2 server modules own

- Question selection.
- Answer validation.
- Attempt persistence.
- Mastery and retention updates.
- Error-review scheduling.
- Daily recommendations and stopping decisions.
- Score prediction and path-change calculations.

### Shared platform owns

- Supabase identity.
- Shared user profile, target score, SAT date, and score history.
- Production database and object storage.
- Existing V1 planner data and behavior.

The iOS app must not contain privileged Supabase credentials or receive correct-answer data before an attempt is submitted.

## Dependency direction

```text
iOS feature UI
    ↓
iOS repositories and typed API client
    ↓
/api/v2 contracts
    ↓
lib/v2 product engines
    ↓
V2 tables and explicitly shared profile data

V1 UI ── does not import from ──> iOS code
V2 engines ── do not import from ──> V1 UI components
```

Reusable V1 business logic may be extracted behind a neutral interface only when tests demonstrate unchanged V1 behavior. V2 must not directly depend on old planner components.

## Why SwiftUI

- The first committed platform is iOS, not a simultaneous cross-platform release.
- SwiftUI provides native navigation, accessibility, animation, sheets, PencilKit integration, notifications, and App Store tooling.
- The approved prototype depends on high-quality iPhone interactions more than maximum code sharing with the web interface.
- Product logic remains server-side, so choosing SwiftUI does not duplicate the adaptive engine.

## Why the same repository

- V1 and V2 share authentication, schema, user profile data, deployment knowledge, and backend contracts.
- One repository makes atomic API-contract and iOS-client changes reviewable together.
- It avoids duplicating migrations, environment documentation, and backend release coordination.
- Strong directory and dependency boundaries provide isolation without the overhead of a separate repository.

## Alternatives not selected

### React Native or Expo

Not selected because Android is explicitly deferred and native iOS polish is the immediate goal. This can be reconsidered only if cross-platform delivery becomes a near-term requirement before substantial SwiftUI implementation begins.

### PWA or wrapped web application

Not selected because the production target is an App Store iOS product and the experience relies on native scratchpad, lifecycle recovery, notification, accessibility, and device interactions.

### Separate repository

Not selected because the backend and data model remain shared. A separate repository would add contract/version coordination without creating meaningful data isolation.

## Consequences

### Positive

- Native iOS experience and first-class Apple platform support.
- Shared backend and user identity with V1.
- V1 can continue shipping independently of the iOS client.
- One place for contracts, migrations, tests, and release documentation.
- Server-driven practice logic can support another client later.

### Costs

- Swift becomes a second implementation language alongside TypeScript.
- CI must support both Next.js and Xcode builds.
- Contract generation and compatibility tests become mandatory.
- Android would require a later client implementation.
- Repository permissions and workflows must avoid coupling web deploys to every iOS-only change.

## Guardrails

1. Do not delete, rename, or relocate V1 routes to make room for V2.
2. Use additive database migrations; do not change the meaning of existing V1 columns.
3. Put new adaptive-practice logic in `lib/v2`, never inside V1 UI components.
4. Version mobile endpoints under `/api/v2`.
5. Keep correct answers and privileged decisions on the server.
6. Add contract tests between TypeScript and Swift before the first real practice flow.
7. Maintain separate staging and production configurations.
8. Preserve a green V1 build and smoke suite throughout V2 work.

## Step-one completion criteria

- [x] Native SwiftUI selected.
- [x] Existing repository selected.
- [x] V1 preservation requirement recorded.
- [x] Initial source boundaries recorded.
- [x] Client/server responsibility split recorded.
- [x] Alternatives and tradeoffs recorded.

No Xcode project, production account, database migration, or V2 runtime code is created by this decision step.

## Next planned step

Create or confirm the Apple Developer and App Store Connect records and choose the permanent bundle identifier. That is step 2 and requires the account and naming choices listed in the implementation plan.
