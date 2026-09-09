# Adaptive presentation foundation

**Status:** Native mock-backed adaptive presentation complete; live practice transport and physical-device validation remain blocked

**Completed locally:** September 9, 2026

## Outcome

SaturnPath now presents the adaptive engine’s decisions without reproducing that engine in Swift:

- The question view displays the repository-provided selection title and two compact visual metrics.
- Every feedback state includes a structured before/after route tile with a semantic impact label and a visual kind supplied by the repository.
- Meaningful micro-set changes can add a larger adaptation card while ordinary answer updates remain visually subtle.
- Contract-aligned next actions distinguish continue, micro-set summary, recommended stop, and session complete.
- A recommended stop opens a dedicated “You’re good for today” view with accessible Finish and Keep Practicing actions.
- Finish sends the recommended-stop reason and an idempotency key, then renders the repository-owned session summary.
- Keep Practicing asks the repository for the next selected question; it never chooses a skill, difficulty, or question locally.

All adaptive presentation data is answer-safe and repository-owned. The iOS layer does not calculate or override mastery, routes, selection priority, work removed, time saved, or the recommendation to stop.

## Accessibility and layout

The route tile communicates change through before/after labels, an arrow, an impact label, and a combined VoiceOver description rather than color alone. Adaptive cards use Dynamic Type, the narrow-width route stacks vertically through `ViewThatFits`, every action is at least 44 points tall, and the existing reduced-motion setting continues to govern phase transitions.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug simulator build passed with Swift 6 strict concurrency.
- Thirty-six native unit-test cases passed, including server-directed stop presentation, Finish, Keep Practicing, duplicate-action guards, and contract wire values.
- Five native UI tests passed on an iPhone 17 Pro simulator.
- The UI journeys verify question feedback, route change, micro-set adaptation, recommended stop, both Finish and Keep Practicing, server summary, and return Home.
- Test-runner screenshots of the route feedback and stop recommendation were visually inspected for wrapping, contrast, action reachability, semantic hierarchy, and misleading state labels.

## Resume condition

When the practice OpenAPI milestone is `READY`, map the live selection reason, path change, next action, and end-session summary into these presentation types. Exercise both stop actions against the real endpoints and verify the complete adaptive journey on a signed physical iPhone before checking the first three I7 items complete.
