# Review and error-resolution foundation

**Status:** Native mock-backed presentation complete; live contract integration and end-to-end review lifecycle remain blocked

**Completed locally:** September 9, 2026

## Outcome

SaturnPath now has a native Review experience and a compact post-mistake classification flow:

- Incorrect feedback renders ordered classification choices supplied by the repository.
- Concept, careless, pacing, and strategy choices save with one tap.
- Something Else reveals a labeled, automatically focused note field with an 80-character limit, inline guidance, validation, progress, success, and retry states.
- The next feedback action stays disabled until a required classification is confirmed by the repository.
- Classification writes carry idempotency keys, and an ambiguous retry reuses the pending key.
- Review presents Due, Learning, Retesting, Resolved, and Saved collections with counts, schedule context, lapse counts, summaries, and semantic state labels.
- Cards render only the actions returned by the repository, including Practice Now, Resume, Save, and Later.
- Loading, empty, offline, expired-session, full-page failure, and inline action-failure states are included.

The repository owns filtering, mutations, lifecycle states, and available actions. Swift does not infer a transition after Save, Later, Practice Now, or Resume; it reloads the selected collection and renders the returned state.

## Accessibility and interaction

State is communicated with text and symbols in addition to color. Filter and card actions meet the 44-point target minimum, layouts use Dynamic Type and scroll rather than clipping, and the Other field has a visible label, character count, input guidance, and programmatic focus. Loading and saved states expose descriptive accessibility labels.

## Contract boundaries

OpenAPI 0.1.0 defines the four review lifecycle states and review actions, but does not identify or query Saved items. Its classification request accepts the enum only, with no presentation metadata or constrained Other detail. Both additive needs are recorded in `docs/coordination/IOS_TO_WEB_REQUESTS.md`. The native foundation uses repository-shaped mocks and does not modify the shared contract.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug and Staging simulator builds passed under Swift 6 strict concurrency.
- Forty-seven native unit-test cases passed, covering Review loading, collection selection, repository reloads after actions, error mapping, classification gating, one-tap classification, constrained Other text, and idempotent classification/action retry.
- Seven native UI tests passed on an iPhone 17 Pro simulator.
- Simulator journeys cover Review collections and an incorrect answer through stored classification to the next repository-selected question.
- Test-runner screenshots of Review and classification were visually inspected for wrapping, contrast, action reachability, semantic hierarchy, and misleading state labels.
- The unsigned Release device build passed store validation; signed-device validation remains externally blocked.

## Resume condition

When the relevant OpenAPI milestones and the two iOS-to-web requests are marked `READY`, add live repositories for classification and Review without changing these views. Verify correction, similar confirmation, delayed retest, resolution, Saved filtering, retries, and failure recovery against the shared engine on a signed physical iPhone before completing the remaining I8 items.
