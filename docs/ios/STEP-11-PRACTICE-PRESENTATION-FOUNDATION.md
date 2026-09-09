# Practice presentation foundation

**Status:** Native mock-backed presentation and lifecycle recovery complete; live practice transport and physical-device validation remain blocked

**Completed locally:** September 9, 2026

**Backend mode:** Deterministic mock repository

## Outcome

SaturnPath now has a complete native practice presentation path from Home:

- `Start Practicing` opens a focused full-screen practice experience.
- The question screen renders multiple-choice or student-produced responses, an elapsed timer, question progress, and server-shaped “Why this question” metrics.
- Submission is disabled until a response exists and remains guarded while a request is in flight.
- Every submission carries a fresh idempotency key plus the session ID, question ID, selected response, and elapsed seconds.
- Feedback renders correctness, a concise explanation, pacing, path delta, and the server-directed next action.
- The next step can display another question or a session summary before returning Home.
- Loading, offline, expired-session, server-error, and leave-confirmation states are explicit.
- The answer-free question snapshot, selection, elapsed foreground time, session identifiers, scratch-note placeholder, and pending submission key persist in the protected local recovery store.
- Moving to the background pauses response timing; returning to the foreground resumes it without charging inactive time.
- Relaunch restores the active question immediately, ambiguous network retries reuse the original idempotency key, and explicit exit or successful submission clears recovery.

The presentation uses semantic Dynamic Type styles, high-contrast labels in addition to color, VoiceOver descriptions, and controls that meet or exceed the 44-point target size.

## Trust and contract boundary

The practice API milestone is not marked `READY` in `docs/coordination/WEB_TO_IOS_HANDOFFS.md`. This slice therefore uses a deterministic mock repository and does not mark the I6 production checklist complete.

The question presentation model deliberately contains no correct-answer field. Swift sends the student response to the repository and displays the returned result; it does not validate answers, calculate mastery, choose questions, alter routes, or compute savings. The sample question and response are isolated inside `MockPracticeRepository` and are not represented as live content.

This slice does not yet:

- call live `/api/v2` practice endpoints;
- queue submissions through a network interruption;
- validate the journey on a signed physical iPhone;
- claim that mock pacing or path-delta values came from the adaptive engine.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug simulator build passed with Swift 6 strict concurrency.
- Staging simulator build passed.
- Unsigned Release device build passed.
- Thirty-two native unit-test cases passed, including practice start, response requirement, elapsed timing, background suspension, termination restoration, one-request submission guarding, idempotency-key creation and retry reuse, server-owned feedback/summary transitions, and normalized error states.
- Four native UI tests passed on an iPhone 17 Pro simulator, including Home → Start → question → feedback → summary → Home and selection → termination → relaunch → restored question/selection/timer → explicit discard.
- The practice feedback screen was captured and visually inspected on the iPhone 17 Pro simulator for layout, contrast, wrapping, and action visibility.

## Resume condition

When the practice OpenAPI milestone is `READY`, generate or implement the versioned Swift transport models, add the live repository, map the public answer-free question and server feedback payloads into these presentation types, and add response fixtures. Then exercise network-loss replay against the real idempotent endpoint and verify the full path on a signed physical iPhone before checking the remaining I6 items complete.
