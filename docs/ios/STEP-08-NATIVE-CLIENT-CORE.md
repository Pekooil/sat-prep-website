# Native client core

**Status:** Local core complete; generated live API models remain blocked on a `READY` backend handoff

**Completed locally:** September 8, 2026

**Backend mode:** Mock repositories only

## Outcome

The native app now has the client infrastructure needed for feature work without inventing shared backend behavior:

- An async, typed `URLSession` client with bearer-token injection, request timeouts, query and JSON request support, normalized failures, and decoding.
- Privacy-safe API diagnostics that record only a stable operation name, status code, and error category. URLs, headers, tokens, bodies, and server messages are not logged.
- Keychain-backed auth-session persistence using this-device-only data protection, plus an in-memory implementation for tests and previews.
- Local practice recovery storage for session ID, question ID, response selection, elapsed time, and attempt-scoped notes.
- Central dependency injection through the SwiftUI environment.
- Explicit native feature flags that keep live API usage, scratch analysis, and remote notifications disabled.
- Mock bootstrap and Home repositories so native screens can be built while the shared API is unavailable.

Debug builds default to `http://127.0.0.1:3000/api/v2`. A client-safe URL can be supplied through `SATURNPATH_API_BASE_URL` in the process environment or app information dictionary. Staging and Release remain unconfigured until the web handoff supplies the real staging and production base URLs.

## Contract boundary

`docs/coordination/WEB_TO_IOS_HANDOFFS.md` still marks the foundation contract as specified but not implemented. For that reason, this step does not generate Swift API request/response models and does not create live repositories. The mock repository values are presentation models, not copies of server business rules.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug simulator build passed with Swift 6 strict concurrency.
- Staging simulator build passed.
- Unsigned Release device build passed.
- Eleven Swift unit tests passed, covering environment selection, authenticated request construction, normalized errors, expired sessions, mock dependency selection, and recovery round trips.
- The existing launch UI test passed on an iPhone 17 Pro simulator.

## Resume condition

When a backend milestone becomes `READY`, generate or implement the matching Swift transport models from `contracts/v2/openapi.json`, add contract-backed repositories, set the client-safe base URL supplied by the handoff, and keep mocks available for previews and deterministic tests.
