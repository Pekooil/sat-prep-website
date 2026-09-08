# Native shell and Home foundation

**Status:** Local UI foundation complete; live Home data remains blocked on a `READY` backend handoff

**Completed locally:** September 8, 2026

**Backend mode:** Deterministic mock repository

## Outcome

SaturnPath now launches into a real native SwiftUI product shell instead of a foundation splash screen:

- A system `TabView` provides Home, Progress, Review, and Profile destinations with native symbols and selection behavior.
- Home follows the approved orbital visual direction with a native brand header, estimated-score rings, target and SAT-date cards, the daily work allocation, work removed, minutes saved, and a prominent practice action.
- Progress, Review, and Profile have intentional native destination shells so navigation can be exercised without pretending those later milestones are complete.
- The design system now includes semantic spacing, radii, layout clearance, Dynamic Type fonts, glass surfaces, accessible controls, and reduced-motion-aware interaction.
- Home uses a focused Observation view model with explicit loading, empty, content, offline, expired-session, and server-error states.
- The final Home action has enough scroll clearance to remain tappable above the floating system tab bar.

The visual implementation preserves the approved SaturnPath indigo, mint, coral, and sky identity. It does not import or reuse V1 website styling.

## Contract boundary

The shared Home endpoint is not marked `READY` in `docs/coordination/WEB_TO_IOS_HANDOFFS.md`. Home therefore consumes only the existing native mock repository and presentation model. Swift does not calculate mastery, question selection, score prediction, review scheduling, or savings; the displayed sample values are deterministic preview data.

`Start Practicing` currently presents a clear availability notice. It does not fabricate a local practice session or expose hard-coded question content. Live Home and practice wiring remain open until their versioned server contracts are ready.

## Accessibility and interaction

- Text uses semantic system styles so it participates in Dynamic Type.
- The profile control and primary action meet or exceed the 44-point target size.
- The three visual rings expose one concise VoiceOver summary rather than three decorative paths.
- Color is supplemented by labels and percentages.
- Ring and pressed-state animation honors Reduce Motion.
- Compact-width legends can switch from a row to a vertical layout.
- The Home action is verified as hittable after scrolling, above the tab bar.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug simulator build passed with Swift 6 strict concurrency.
- Staging simulator build passed.
- Unsigned Release device build passed.
- Sixteen Swift unit-test cases passed, including Home content, empty, offline, expired-session, and server-error state coverage.
- The launch UI test passed on an iPhone 17 Pro simulator and exercised Home, Progress, Review, Profile, the ring accessibility summary, and the scroll-to-action tab-bar clearance.
- The Home screen was launched and visually inspected on the iPhone 17 Pro simulator.

## Resume condition

When the Home API milestone becomes `READY`, implement its generated or contract-matched transport models, replace the mock Home repository in live configurations, and add response-fixture and network-failure coverage. Keep the current mock path for previews and deterministic tests.
