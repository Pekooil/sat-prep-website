<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Imported Claude Cowork project instructions

I'm building an SAT prep planner website that allows the users to input their scores and weak areas, then the planner would generate customized study plan, apply questions to do everyday on the calendar, connect the mistakes to the error log, and display scores data.

## SaturnPath V2 dual-session routing (mandatory)

SaturnPath V2 is developed by two concurrent coding sessions in this same repository. The authoritative routing and ownership rules are in `SATURNPATH_V2_SESSION_ROUTER.md`.

### Trigger: `Run the web app plan.`

When the user says this phrase, the session is the **web/shared-backend owner**. Before acting, read these files completely:

1. `SATURNPATH_V2_SESSION_ROUTER.md`
2. `SATURNPATH_V2_WEB_IMPLEMENTATION_PLAN.md`
3. `contracts/v2/openapi.json`
4. The step-specific documents linked by the web plan

Continue the first incomplete, unblocked item in the web checklist. This session owns the V2 Next.js web product, `/api/v2`, shared TypeScript engines, Supabase migrations, the admin question pipeline, the shared question bank, and backend/web tests. It must not edit `apps/ios/**` or implement native iOS features.

### Trigger: `Continue working on the iOS app.`

When the user says this phrase, the session is the **native-iOS owner**. Before acting, read these files completely:

1. `SATURNPATH_V2_SESSION_ROUTER.md`
2. `SATURNPATH_V2_IOS_IMPLEMENTATION_PLAN.md`
3. `docs/ios/STEP-07-SWIFTUI-SHELL-AND-TESTFLIGHT.md`
4. `docs/coordination/WEB_TO_IOS_HANDOFFS.md`

Continue the first incomplete, unblocked item in the iOS checklist. This session owns `apps/ios/**`, native tests, Apple signing, TestFlight, and App Store work. Treat `/api/v2`, `lib/v2`, `contracts/v2`, `supabase/migrations`, the admin console, and the question bank as web-session-owned. Do not recreate shared business logic in Swift. Record backend needs in `docs/coordination/IOS_TO_WEB_REQUESTS.md` instead of changing web-owned files.

### Concurrency rules

- The web session is the single writer for shared backend contracts and migrations.
- The iOS session consumes versioned contracts and server responses.
- Do not let both sessions edit the same plan or source file.
- Prefer separate Git branches/worktrees for simultaneous sessions.
- Never overwrite or discard the other session's uncommitted work.
- If the user's wording does not identify a track and the requested work could belong to either one, read the router and ask which track should own it before making cross-boundary changes.
