# Authentication and onboarding foundation

**Status:** Native presentation and routing complete; live Apple, Supabase, profile, and deletion wiring remain blocked

**Completed locally:** September 8, 2026

**Backend mode:** Deterministic mock repositories

## Outcome

SaturnPath now has a native root flow that routes bootstrap states to sign-in, onboarding, or the main tab shell:

- Signed-out students see an accessible sign-in screen with Apple and email entry points, local email validation, progress feedback, and clear inline errors.
- Authenticated students who have not completed onboarding enter a three-step flow for current and target scores, SAT date, timing accommodation, and optional scratchwork analysis.
- Returning students with completed onboarding continue directly to Home.
- Offline and bootstrap failures receive a recoverable root-level state rather than a blank screen.
- The root, authentication, and onboarding state machines depend on repository protocols so live implementations can replace mocks without changing their SwiftUI views.

The onboarding flow uses progressive disclosure, semantic system typography, native steppers, a graphical date picker, a segmented accommodation picker, and a fixed primary action area. Scratchwork analysis defaults off and explains the privacy boundary before consent.

## Contract and signing boundary

`docs/coordination/WEB_TO_IOS_HANDOFFS.md` does not mark bootstrap, profile, or account operations `READY`, and the Apple Developer membership/signing milestone is still blocked. Therefore this slice does not:

- exchange a real Sign in with Apple credential;
- add or configure the Supabase Swift package;
- persist onboarding through `PATCH /profile`;
- implement magic-link deep-link completion;
- implement account linking, sign-out, recovery, or deletion;
- mark any I4 production-auth checklist item complete.

The Apple and email controls use mock repository outcomes only. The `SATURNPATH_MOCK_ROOT_STATE` launch variable exists solely for deterministic UI testing and local visual review.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug simulator build passed with Swift 6 strict concurrency.
- Staging simulator build passed.
- Unsigned Release device build passed.
- Twenty-three native unit-test cases passed, including signed-out, onboarding-required, returning-user, expired-session, email-validation, and onboarding-completion paths.
- Both native UI tests passed on an iPhone 17 Pro simulator, covering mock sign-in → three-step onboarding → Home plus the existing Home and tab-navigation flow.
- Sign-in and first-step onboarding screens were launched and visually inspected on the iPhone 17 Pro simulator.

## Resume condition

After Apple membership is active and the relevant web handoff is `READY`, add the official Sign in with Apple authorization flow, Supabase session exchange and deep-link handling, contract-backed bootstrap/profile repositories, and deletion confirmation. Retain the mock repositories for previews and deterministic tests.
