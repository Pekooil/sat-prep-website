# Question-safe scratchpad foundation

**Status:** Native drawing, typed notes, and attempt-scoped persistence complete; calculator and scratch-signal work remain open

**Completed locally:** September 9, 2026

## Outcome

SaturnPath now provides a native scratchpad from every active practice question:

- The entry control sits immediately after the complete question and before its answer controls.
- The app measures the question’s bottom edge and presents a single-height bottom sheet in the remaining viewport space.
- The sheet may cover answer choices, but the complete prompt remains visible when it opens.
- Draw mode uses PencilKit and accepts Apple Pencil or finger input.
- Pen, vector eraser, four named ink colors, undo, redo, and a destructive Clear action are available without horizontal scrolling.
- Clear requires confirmation and explains that the current drawing cannot be recovered.
- Notes mode provides a labeled, automatically focused text editor, plain-text math-symbol guidance, and a 2,000-character limit with a visible count.
- Dismissing and reopening the sheet restores both modes for the current attempt.

## Recovery and privacy boundary

PencilKit drawing data and typed notes are stored in the existing protected, atomic practice-recovery file alongside the active public question snapshot. They survive backgrounding, sheet dismissal, and app termination, then clear after successful submission, explicit practice exit, or movement to another question. Recovery files created before drawing support decode with an empty drawing, preserving existing in-progress attempts.

The UI states that scratchwork stays on the device for the active attempt. This milestone does not upload raw drawings, recognized text, typed notes, or derived signals, and it does not add or modify a shared API contract.

## Accessibility and interaction

Controls use visible text or accessibility labels rather than color alone. The active tool and ink expose selected state, all interactive targets use 44-point layouts, Clear is protected by a confirmation dialog, and typed notes receive keyboard focus after the student selects Notes. The bottom-sheet geometry has a UI assertion requiring an eight-point gap between the complete prompt and the scratchpad title.

The final visual pass retained SaturnPath’s existing native visual language and split drawing controls into two compact rows so pen, eraser, undo, redo, clear, and every color are visible on an iPhone-width screen.

## Verification

Verified with Xcode 26.6 and the iOS 26.5 SDK:

- Debug and Staging simulator builds passed under Swift 6 strict concurrency.
- Fifty native unit-test cases passed, including active-attempt restoration, successful-submission cleanup, note-length constraints, drawing-data round trips, and recovery-file backward compatibility.
- Eight native UI tests passed on an iPhone 17 Pro simulator.
- The scratchpad UI journey verifies question-safe geometry, drawing-surface availability, typed-note entry, sheet dismissal, and note restoration.
- Drawing and typed-note screenshots from the test runner were visually inspected for prompt visibility, control reachability, layout, contrast, and keyboard behavior.
- The unsigned Release device build passed store validation; signed physical-device validation remains externally blocked.

## Remaining I9 work

The next unblocked I9 item is the defined native calculator or licensed integration. On-device non-content signals, supported Apple Vision preprocessing, privacy-approved structured uploads, and confidence-aware server signals remain separate work. Apple Pencil, external/software keyboard, memory-pressure, and backgrounding validation on signed physical hardware remains tracked by I11.
