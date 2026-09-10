# Native calculator fallback

**Status:** Native scientific calculator and official SAT graphing handoff complete; embedded third-party calculator intentionally disabled pending licensing

**Completed locally:** September 10, 2026

## Outcome

The question-safe scratchpad now includes a native Calculator mode. It supports:

- addition, subtraction, multiplication, division, parentheses, and right-associative powers
- square, square root, pi, and reuse of the previous answer
- sine, cosine, and tangent in selectable degree or radian mode
- base-ten and natural logarithms
- concise, non-technical errors for invalid expressions, division by zero, and function-domain failures
- clear and delete controls, a readable expression/result display, and a 120-entry input limit

Calculator inputs, the last successful answer, result visibility, and angle mode use the same protected, attempt-scoped recovery record as the drawing and notes scratchpad. They survive sheet dismissal and app relaunch, then clear after submission, explicit exit, or movement to another question. Recovery files created before calculator support continue to decode without migration.

## Graphing and licensing boundary

SaturnPath does not embed, copy, scrape, or impersonate the Desmos calculator. The current [Desmos API terms](https://www.desmos.com/api-terms) require commercial terms or a written addendum for production end-user API use, so embedded Desmos remains disabled until SaturnPath has explicit permission.

Students who need graphing practice can open the [official SAT graphing calculator](https://www.desmos.com/testing/collegeboard/graphing) in an in-app Safari view. The interface labels this as the official external experience and keeps the native scientific calculator available without network access.

## Accessibility and interaction

The calculator uses a five-column grid with no horizontal scrolling. Every key and option has a minimum 44-point target, visible operator styling, a VoiceOver label, and a stable automation identifier. The result and expression provide spoken summaries, the angle selector does not rely on color alone, and the official graphing action explains that it opens an in-app browser.

The visual pass follows the existing SaturnPath rounded-card language, high-contrast ink palette, and restrained indigo/coral state colors. The calculator scrolls vertically within the question-safe sheet when needed, while the complete question remains visible above it.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug and Staging simulator builds passed under Swift 6 strict concurrency.
- Fifty-six native unit-test cases passed, including precedence, parentheses, powers, trigonometric angle modes, logarithms, roots, previous-answer reuse, invalid domains, recovery round trips, and cleanup.
- Nine native UI tests passed on an iPhone 17 Pro simulator.
- The calculator UI journey evaluates `7 × 8`, verifies `56`, dismisses and reopens the sheet, and verifies the restored result.
- The calculator screenshot was visually inspected for question visibility, full key reachability, 44-point targets, contrast, labels, and lack of horizontal scrolling.
- The unsigned Release device build passed store validation; signed physical-device validation remains externally blocked.

## Remaining I9 work

The next unblocked I9 item is on-device non-content scratch signals and supported Apple Vision preprocessing. Privacy-approved structured uploads and confidence-aware server signals remain separate work. Embedded Desmos can replace or complement the fallback only after explicit production licensing is documented.
