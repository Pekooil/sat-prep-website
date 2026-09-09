# SaturnPath iOS

Native SwiftUI app for SaturnPath V2.

## Open and run

```bash
open apps/ios/SaturnPath.xcodeproj
```

Select the shared `SaturnPath` scheme and an iPhone simulator. The minimum supported version is iOS 18.0.

## Command-line verification

```bash
xcodebuild \
  -project apps/ios/SaturnPath.xcodeproj \
  -scheme SaturnPath \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/saturnpath-ios-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Run the unit and launch UI tests on an available simulator:

```bash
xcodebuild \
  -project apps/ios/SaturnPath.xcodeproj \
  -scheme SaturnPath \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/saturnpath-ios-test-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  test
```

## Build configurations

- `Debug` — local development; compiles with `DEBUG`.
- `Staging` — staging API and physical-device validation; compiles with `STAGING`.
- `Release` — App Store/TestFlight archive; compiles with `PRODUCTION`.

The shared scheme archives with `Release`. The permanent bundle identifier is `app.saturnpath.ios`.

## Native client core

Client foundations live under `SaturnPath/Core` and include:

- typed async networking with authenticated requests and normalized errors
- privacy-safe API diagnostics
- Keychain-backed auth-session storage
- local practice recovery
- feature flags and SwiftUI dependency injection
- mock bootstrap, Home, account, onboarding, and practice repositories

Until `docs/coordination/WEB_TO_IOS_HANDOFFS.md` marks an API milestone `READY`, every build uses mock repositories and live API feature flags remain off. Debug networking defaults to `http://127.0.0.1:3000/api/v2`; override it with `SATURNPATH_API_BASE_URL` when running against another client-safe endpoint.

## Native shell

The app launches into Home, Progress, Review, and Profile tabs. Home is a complete mock-backed presentation of the approved dashboard, including score rings, target and SAT date, daily recommendation, work removed, minutes saved, and explicit loading and failure states. Its primary action opens the mock-backed practice journey. Progress, Review, and Profile remain destination shells until their server milestones are ready.

The design system uses semantic system typography, Dynamic Type, accessible control sizes, VoiceOver summaries, reduced-motion-aware transitions, and safe clearance above the system tab bar. Implementation and verification evidence is recorded in `docs/ios/STEP-09-NATIVE-SHELL-AND-HOME-FOUNDATION.md`.

## Authentication and onboarding foundation

The app root now routes mock bootstrap states to sign-in, onboarding, or the main tabs. The native three-step onboarding flow captures score baseline and target, SAT date, timing accommodation, and optional scratchwork-analysis consent. Set `SATURNPATH_MOCK_ROOT_STATE` to `sign-in` or `onboarding` in a local launch environment to inspect those deterministic states.

These screens are presentation foundations, not live authentication. Sign in with Apple, Supabase session exchange, email deep links, profile persistence, and account deletion remain disabled until Apple signing and the relevant backend handoffs are ready. See `docs/ios/STEP-10-AUTH-AND-ONBOARDING-FOUNDATION.md`.

## Practice presentation foundation

Home now opens a native question → feedback → summary experience backed by a deterministic practice repository. The question model contains no answer key; the view sends the selected response, elapsed time, session and question identifiers, and a fresh idempotency key to the repository, then renders repository-owned correctness and adaptation messaging. Multiple-choice and student-produced response controls, loading and error states, leave confirmation, Dynamic Type, accessible labels, and duplicate-submission protection are included.

The active public question snapshot, response, foreground elapsed time, session identifiers, scratch-note placeholder, and pending idempotency key are stored locally. Background time does not inflate response timing, ambiguous submission retries reuse their original key, relaunch restores the active question, and explicit exit or successful submission clears recovery.

This is not a live adaptive session. The sample question and feedback remain isolated mock data until the practice API handoff is marked `READY`; physical-device validation also remains open. See `docs/ios/STEP-11-PRACTICE-PRESENTATION-FOUNDATION.md`.

## Signing status

Automatic signing is configured, but no development team is committed to the repository. After the individual Apple Developer membership becomes active, select the paid team in Xcode for the `SaturnPath` target, register the explicit App ID, create the App Store Connect record, and archive through Product → Archive.

The local scaffold is build- and test-verified. The current TestFlight blocker and exact remaining signing steps are recorded in `docs/ios/STEP-07-SWIFTUI-SHELL-AND-TESTFLIGHT.md`.

Do not commit certificates, provisioning profiles, Apple credentials, database passwords, or Supabase service-role keys.
