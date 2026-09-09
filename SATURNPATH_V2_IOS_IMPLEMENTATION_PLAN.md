# SaturnPath V2 — iOS App Implementation Plan

> **Session trigger:** `Continue working on the iOS app.`  
> When this phrase is used, read `SATURNPATH_V2_SESSION_ROUTER.md` and `docs/coordination/WEB_TO_IOS_HANDOFFS.md`, then execute the first incomplete, unblocked item in the iOS-only checklist in Section 22. Do not implement or modify the shared backend.

**Status:** Active — I1 complete; I3 client infrastructure, I4 auth/onboarding presentation foundation, and I5 native shell/UI-state foundation complete; signed TestFlight build I2 blocked by Apple membership; live contract-backed features blocked on web handoffs

**Prepared:** August 25, 2026  
**Initial release:** Public iOS App Store release  
**Question-bank target:** 200 approved original questions — 100 Math and 100 Reading and Writing  
**Question reviewer:** Darcy Wang (sole approver)

### iOS-session scope

This plan now governs only the native SwiftUI client and Apple distribution track. The separate web/shared-backend session owns `/api/v2`, `lib/v2`, Supabase migrations, OpenAPI changes, the admin console, adaptive engines, and the shared question bank under `SATURNPATH_V2_WEB_IMPLEMENTATION_PLAN.md`.

The iOS session consumes implemented contract milestones and renders their output. It must not duplicate answer validation, question selection, mastery, review scheduling, recommendation, or minutes-saved calculations in Swift. Backend needs are recorded in `docs/coordination/IOS_TO_WEB_REQUESTS.md`.

Sections 1–21 retain the full product architecture and delivery rationale for reference. They are not permission for the iOS session to implement web-owned work. Section 22 is the authoritative executable checklist for the iOS session.

## 1. Executive decision summary

SaturnPath V2 should be built as a **native SwiftUI iOS app in the existing SaturnPath repository**, with a strong code boundary from V1.

- Keep SaturnPath V1 and its existing Next.js planner operational.
- Add the native app under `apps/ios/`.
- Keep the existing Next.js application as the web product, admin console, and authenticated V2 API layer.
- Reuse the existing Supabase project for production identity and shared user data, but add V2-specific tables through non-destructive migrations.
- Create a separate staging Supabase project before V2 development begins.
- Keep question selection, answer validation, mastery updates, and schedule adaptation on the server. The iOS client must never receive an answer key before submission.
- Build the 200-question bank progressively while the product is being developed.
- Use AI only to draft and validate question candidates. No question can become visible to students until Darcy explicitly approves and publishes it.

This structure preserves V1, allows one shared account across both products, and gives the iOS experience native interaction quality without duplicating business rules in Swift.

## 2. Product definition

The core loop is:

> Open SaturnPath → tap Start Practicing → receive the highest-value question → answer → see pacing and path changes → continue through adaptive micro-sets → review unresolved mistakes → stop when further work has low value.

### Non-negotiable product rules

1. A returning student can reach a useful question with one primary tap.
2. The student does not choose subject, skill, difficulty, set length, or review timing during normal practice.
3. Every incorrect attempt enters the error-review system automatically.
4. Every answer produces a subtle visual path delta; larger adaptation notifications appear only after meaningful micro-set changes.
5. The product optimizes expected score improvement per minute, not time spent in the app.
6. Scratchwork can inform diagnosis, but students can always practice without sharing scratchwork.
7. Score predictions are conservative, include a range, and do not jump after every answer.
8. V1 remains deployable and usable throughout V2 development.

## 3. Version-one scope

### Included in the first App Store version

- Native iPhone app using SwiftUI.
- Sign in with Apple, shared SaturnPath account, and optional email sign-in.
- Onboarding for target score, test date, current/official score, accommodations, and notification preference.
- Home screen matching the approved mobile mockup.
- One-tap adaptive practice.
- 100 approved Math questions and 100 approved Reading and Writing questions.
- Multiple-choice questions and Math student-produced responses where the content set supports them.
- Per-attempt telemetry, pacing, concise explanations, visual path updates, and “why selected” signals.
- Three-to-five-question adaptive micro-sets.
- Persistent skill mastery and review scheduling.
- Automatic error logging, classification, similar-question confirmation, spaced retesting, and resolution states.
- Daily recommendation, progress rings, unnecessary-work-removed metric, and minutes-saved metric.
- Scratchpad with drawing, typed notes, calculator access, and limited scratchwork analysis.
- Progress, Review, and Profile tabs.
- Session resume after interruption or app termination.
- Contextual notification opt-in and daily practice reminders.
- Internal admin web console for AI drafting, validation, review, publishing, versioning, and retirement of questions.
- TestFlight testing followed by App Store submission.

### Explicitly deferred

- Android.
- iPad-specific layout beyond safe compatibility.
- Full-length simulated SAT exams.
- A general-purpose tutoring chatbot.
- Community, leaderboards, social features, or user-generated public content.
- Subscriptions or in-app purchases unless a business model is chosen before submission.
- Sophisticated IRT/BKT models; V1 uses transparent rules and stores enough telemetry to upgrade later.
- Fully offline adaptive practice.
- Automatic publication of AI-generated questions.
- Rebuilding the V1 planner in SwiftUI.

## 4. Repository and system architecture

### Recommended repository layout

```text
sat-prep-website/
├── app/                              # Existing Next.js V1; preserve
│   ├── api/v2/                       # Authenticated V2 mobile APIs
│   └── (admin)/admin/v2/questions/   # Solo reviewer question console
├── lib/
│   ├── adaptive-replanner/           # Existing V1 logic; preserve
│   └── v2/
│       ├── practice-engine/
│       ├── question-bank/
│       ├── mastery-engine/
│       ├── review-engine/
│       ├── recommendation-engine/
│       ├── score-model/
│       ├── scratch-analysis/
│       └── contracts/
├── apps/
│   └── ios/
│       ├── SaturnPath.xcodeproj
│       ├── SaturnPath/
│       │   ├── App/
│       │   ├── Core/
│       │   ├── DesignSystem/
│       │   ├── Features/
│       │   │   ├── Auth/
│       │   │   ├── Onboarding/
│       │   │   ├── Home/
│       │   │   ├── Practice/
│       │   │   ├── Scratchpad/
│       │   │   ├── Progress/
│       │   │   ├── Review/
│       │   │   └── Profile/
│       │   └── Resources/
│       ├── SaturnPathTests/
│       └── SaturnPathUITests/
├── supabase/
│   ├── schema.sql                    # Existing reference schema
│   └── migrations/                   # New timestamped V2 migrations
└── prototypes/saturnpath-v2-mobile/  # Approved interaction reference
```

Do not reorganize the existing V1 application into a monorepo before V2 work. That creates risk without improving the first iOS release.

### Runtime ownership

```text
SwiftUI iOS app
    │
    ├── Supabase Auth: session and identity
    │
    └── HTTPS /api/v2
          │
          ├── Practice engine: chooses next action
          ├── Answer service: validates answers server-side
          ├── Mastery engine: updates skill state
          ├── Review engine: schedules and resolves errors
          ├── Recommendation engine: computes daily work and rings
          └── Supabase Postgres: durable product state

Next.js admin console
    │
    ├── AI drafting service: creates candidates only
    ├── Automated validators
    └── Darcy review → approve → publish
```

### iOS implementation choices

- **UI:** SwiftUI with feature-based modules.
- **Concurrency:** Swift structured concurrency (`async`/`await`).
- **State:** Swift Observation for feature state; avoid a large global state container.
- **Networking:** typed `URLSession` client against versioned JSON contracts.
- **Authentication:** Supabase Swift, with tokens in Keychain-backed storage.
- **Local recovery:** SwiftData or a small SQLite-backed cache for current session, unsent events, and scratchpad state.
- **Drawing:** PencilKit.
- **Math rendering:** locally bundled KaTeX in a controlled `WKWebView`, with accessible plain-text/VoiceOver equivalents.
- **Charts:** Swift Charts where native charts are sufficient.
- **Dependencies:** keep third-party Swift packages minimal and pin exact versions.

Supabase officially supports Swift auth and SwiftUI deep-link handling, so the existing backend can be reused without putting privileged keys in the app: [Supabase Swift auth documentation](https://supabase.com/docs/reference/swift/auth-api).

## 5. Environments, accounts, and release infrastructure

Complete these before feature development:

- Enroll or confirm enrollment in the Apple Developer Program.
- Reserve the bundle identifier, recommended as `com.saturnpath.app` or another permanent identifier.
- Create the app record in App Store Connect.
- Decide the public app name, subtitle, support email, support URL, and privacy-policy URL.
- Create separate Supabase projects for local/staging and production.
- Create separate Vercel preview/staging and production configurations.
- Define build configurations: Debug → staging; Release → production.
- Store all server secrets only in Vercel/Supabase secret stores.
- Store only the Supabase URL and publishable key in the iOS configuration.
- Set up Xcode Cloud for signed builds and TestFlight delivery, or use Fastlane only if Xcode Cloud cannot support the workflow.
- Keep existing TypeScript CI and add migration, contract, and V2 engine tests.
- Add automatic build-number incrementing, symbol upload, and release notes.
- Add production kill switches for question delivery, scratch analysis, and individual question IDs.

## 6. Authentication and account lifecycle

### Required flows

- Sign in with Apple.
- Email magic-link or one-time-code sign-in.
- Existing web-account sign-in and cross-device synchronization.
- Identity-linking tests for users who previously used Google on the web and later use Apple private relay.
- Sign out.
- Passwordless recovery flow where applicable.
- In-app account deletion with a confirmation step and server-side cascade/deletion job.
- A seeded App Review account or complete demo mode with stable sample data.

If Google Sign-In is added to iOS, keep Sign in with Apple as an equivalent option. Apple’s current review rules require an equivalent privacy-preserving login option for apps using third-party social login, and apps that create accounts must provide in-app account deletion: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

### Onboarding data

- Target total score.
- Latest total, Math, and Reading and Writing scores.
- Score source: official, Bluebook practice, or estimate.
- SAT date.
- Testing accommodations that affect expected timing.
- Preferred reminder time and timezone.
- Birth year only, using the existing data-minimization approach.
- Terms and privacy acceptance timestamp.
- Scratchwork-analysis choice with a plain-language explanation.

After onboarding, the app precomputes the first daily recommendation so the next launch has a one-tap start.

## 7. V2 database design

Create additive migrations; do not repurpose V1 rows in ways that change their meaning.

### Question content

1. `v2_questions`
   - stable question ID
   - section, domain, skill, subskill
   - response type
   - difficulty estimate
   - empirical difficulty
   - expected seconds, with accommodation multiplier applied at runtime
   - status: `draft`, `needs_review`, `approved`, `published`, `quarantined`, `retired`
   - source type, rights status, generator provider/model, prompt version
   - quality score and publication timestamps

2. `v2_question_versions`
   - immutable content snapshot
   - stem/passage, choices, correct-answer representation, explanations
   - visual assets and accessibility text
   - change reason and version number

3. `v2_question_reviews`
   - reviewer ID
   - rubric results
   - validation failures
   - approval/rejection decision and notes

4. `v2_question_metrics`
   - attempt count
   - accuracy, median time, skip rate, answer-choice distribution
   - discrimination proxy, issue reports, and quarantine reason

### Student practice state

5. `v2_practice_sessions`
   - start/end timestamps, state, recommended minutes, actual minutes
   - new/review allocation
   - planned and completed value
   - ending reason and client version

6. `v2_attempts`
   - user, session, question/version, micro-set, and review-item IDs
   - selected answer and correctness
   - server-measured and client-measured response time
   - expected time
   - answer-change count, hint/explanation usage
   - selection-reason snapshot
   - path-delta snapshot
   - idempotency key and timestamps

7. `v2_attempt_events`
   - append-only telemetry such as answer selected, answer changed, scratch opened, calculator opened, submitted, and explanation viewed
   - use a constrained event schema rather than arbitrary analytics payloads

8. `v2_user_skill_state`
   - one row per user/subskill
   - mastery estimate and confidence
   - lifetime/recent accuracy
   - speed ratio
   - easy/medium/hard performance
   - attempts and effective sample size
   - retention strength, last practiced, and due date
   - common mistake tags
   - algorithm version

9. `v2_review_items`
   - source incorrect attempt
   - state: `due`, `learning`, `retesting`, `resolved`
   - original-corrected timestamp
   - similar-question confirmation
   - next due date, interval, lapse count, and resolution evidence

10. `v2_daily_recommendations`
    - date, total/new/review minutes
    - Math and Reading and Writing allocation
    - completed values for each ring
    - skipped low-value questions and calculated minutes saved
    - input snapshot and algorithm version

11. `v2_adaptation_events`
    - before/after route
    - trigger and evidence
    - user-facing short label
    - minutes/questions added or removed
    - whether the event was displayed

12. `v2_scratch_insights`
    - attempt ID
    - scratch-used flag and non-content interaction signals
    - short structured diagnostic
    - analysis confidence and model/version
    - never store raw images indefinitely

### Shared data

Continue using `users`, `score_history`, and `score_predictions` where their meaning remains compatible. Derive V1-compatible domain summaries from V2 skill state instead of making V1 read raw V2 attempts.

### Data safeguards

- Enable RLS on every student-owned table.
- Students can read only published question content.
- The correct answer is not exposed through direct Supabase reads.
- Answer validation occurs through a server endpoint using a privileged server client.
- Drafts and review records are admin-only.
- Every mutation endpoint uses auth, schema validation, rate limiting, and idempotency.
- Add indexes around user/date, session/order, review due date, question status, and skill lookup.
- Add a data-retention and account-deletion procedure covering attempts, scratch insights, and uploaded assets.

## 8. V2 API contract

Version all endpoints under `/api/v2` and generate matching TypeScript and Swift models from one JSON/OpenAPI contract.

### Student endpoints

| Endpoint | Purpose |
|---|---|
| `GET /bootstrap` | Profile, onboarding state, feature flags, current recommendation |
| `GET /home` | Score estimate, target, SAT date, rings, time saved |
| `POST /sessions` | Start or resume today’s adaptive session |
| `GET /sessions/{id}/next` | Return the next question without its answer key |
| `POST /sessions/{id}/attempts` | Validate submission and atomically update all attempt state |
| `POST /attempts/{id}/classification` | Record one-tap mistake classification |
| `POST /sessions/{id}/end` | End manually or accept the recommended stop |
| `GET /progress` | Score, mastery, pacing, improvement, history |
| `GET /review` | Due, learning, retesting, resolved, and saved items |
| `POST /review/{id}/action` | Resume, save, defer, or manually practice an item |
| `PATCH /profile` | Target, date, scores, accommodations, preferences |
| `DELETE /account` | Initiate complete account deletion |

### Attempt response contract

The submission response should directly power the approved visual feedback:

```json
{
  "outcome": "incorrect",
  "correctChoiceId": "C",
  "explanation": "Short explanation",
  "pacing": {
    "actualSeconds": 88,
    "targetSeconds": 60,
    "status": "slower"
  },
  "pathChange": {
    "before": "Switch skill",
    "after": "+3 min review",
    "impactMinutes": 3,
    "impactDirection": "added"
  },
  "scratchSignal": {
    "label": "Likely sign slip",
    "confidence": 0.72
  },
  "nextAction": "continue"
}
```

This lets the app communicate with pacing bars and route tiles instead of reconstructing explanations from raw engine state.

## 9. Question-bank production plan

### Final 200-question allocation

Use the official SAT domains and approximate operational distribution as the initial quota, while ensuring every tested subskill has enough coverage. College Board’s current domain definitions should be the taxonomy source, not its copyrighted question content: [official content domains](https://satsuite.collegeboard.org/higher-ed-professionals/sat-validity/content-domains), [assessment framework](https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf).

#### Math — 100 questions

| Domain | Total | Easy | Medium | Hard |
|---|---:|---:|---:|---:|
| Algebra | 35 | 11 | 16 | 8 |
| Advanced Math | 35 | 8 | 16 | 11 |
| Problem-Solving and Data Analysis | 15 | 6 | 6 | 3 |
| Geometry and Trigonometry | 15 | 5 | 7 | 3 |
| **Total** | **100** | **30** | **45** | **25** |

#### Reading and Writing — 100 questions

| Domain | Total | Easy | Medium | Hard |
|---|---:|---:|---:|---:|
| Information and Ideas | 26 | 7 | 12 | 7 |
| Craft and Structure | 28 | 8 | 13 | 7 |
| Expression of Ideas | 20 | 7 | 9 | 4 |
| Standard English Conventions | 26 | 8 | 11 | 7 |
| **Total** | **100** | **30** | **45** | **25** |

Before drafting begins, convert each domain quota into a subskill quota. Do not allow a convenient-to-generate subskill such as transitions or linear equations to crowd out the rest of the bank.

### AI-assisted drafting workflow

1. Select a quota cell: section → domain → skill → subskill → difficulty.
2. Create a structured generation brief with objective, constraints, expected time, answer format, and prohibited patterns.
3. Generate one candidate plus distractor rationales and a provenance record.
4. Run deterministic validation:
   - required fields and length limits
   - answer-choice uniqueness
   - exactly one correct answer
   - mathematical solution verification where possible
   - grammar and punctuation checks
   - duplicate and near-duplicate detection
   - banned trademark/copyright phrasing scan
5. Run an independent AI critique using a different prompt, not an automatic approval.
6. Put the candidate in Darcy’s review queue.
7. Darcy completes the content rubric and either rejects, requests revision, or approves.
8. Run a separate final proof pass and preview the question on real iPhone sizes.
9. Publish an immutable version.
10. Monitor empirical data; quarantine questionable items immediately without shipping a new app build.

### Solo-review rubric

Every item requires explicit checks for:

- original or properly licensed/public-domain passage and assets
- correct domain, skill, subskill, and intended difficulty
- one defensible correct answer
- plausible distractors tied to recognizable mistakes
- concise, complete explanation
- correct Math notation and units
- no accidental ambiguity or hidden assumptions
- expected response time
- bias, sensitive content, and accessibility
- no close paraphrase of an official or third-party question
- usable rendering in light mode, Dynamic Type, and VoiceOver

Because one person is reviewing, split approval into two recorded passes: **content/correctness** and **proof/rendering**. Both may be performed by Darcy, but the system should prevent one-click generation-to-publication.

### Content milestones

- 20 approved questions: vertical-slice development.
- 50 approved questions: engine and internal-device testing.
- 100 approved questions: adaptive/review beta testing.
- 200 approved questions: App Store release candidate.

Do not wait for all 200 before building the app.

## 10. Adaptive engine version one

### Cold start

Use the student’s latest Math/RW scores, target, SAT date, stated weak areas, and any V1 history. Start mastery confidence low and deliberately explore several domains before specializing.

### Candidate scoring

For every eligible question or review item, compute a transparent priority score based on:

```text
expected score leverage
× skill need
× retention urgency
× information gain
× difficulty fit
× pacing need
÷ expected minutes
− recent repetition penalty
− exposure/exhaustion penalty
```

Add constraints so the top mathematical score does not create a repetitive session:

- no immediate repeat of the same question
- cap consecutive items from one subskill
- reserve review capacity for due errors
- mix sections when their expected values are close
- avoid hard questions before prerequisite evidence exists
- guarantee exploration when confidence is low

### Per-answer update

After each answer, atomically:

1. Save the attempt and interaction telemetry.
2. Create/update an error-review item if incorrect.
3. Update subskill accuracy, speed, difficulty evidence, mastery, and confidence.
4. Re-score the remainder of the active micro-set only when necessary.
5. Calculate a compact before/after path change.
6. Return the visual feedback contract.

### Micro-set adaptation

After 3–5 questions, decide whether to:

- continue the skill
- raise or lower difficulty
- switch skill or section
- insert a due review
- add a Quick Fix micro-lesson
- focus on pacing
- stop because marginal expected value is below the daily threshold

Display a subtle path tile after every answer, as in the prototype. Display a larger adaptation toast only when the micro-set decision meaningfully changes the route.

### “Why this question” output

Return one short title plus two visual metrics, selected from:

- expected point leverage
- mastery confidence
- seconds over target
- review due state
- difficulty unlocked
- retention interval
- repeated mistake signal

Never return a paragraph when two metrics can explain the choice.

## 11. Error-review engine

Implement the state machine:

```text
Incorrect → Due → Learning → Retesting → Resolved
                 ↘ failed similar/retest ↗
```

Rules:

- Incorrect attempts automatically create a review item.
- A correction on the original question moves the item to Learning, not Resolved.
- A correct new similar question moves it to Retesting.
- A delayed successful retest resolves it.
- Any failure lowers retention strength and shortens the next interval.
- Classification uses one-tap, question-specific options plus a short Other field.
- Quick Fix appears after repeated misses or strong evidence of a conceptual gap.
- Original questions are not overused; similar questions are preferred after the first correction.

Start with explicit spacing intervals such as 1, 3, 7, and 14 days, modified by confidence, lateness, and performance. Store the algorithm version so intervals can be recalculated safely later.

## 12. Daily recommendation, rings, and time-saved logic

### Daily workload

Calculate the recommendation once per day and refresh after meaningful new evidence. Inputs include:

- days until SAT
- target gap and uncertainty
- recent study load
- due review burden
- unresolved high-leverage errors
- mastery confidence
- section balance
- user accommodations
- missed recent sessions

Output total minutes plus new-practice/review allocation.

### Ring definitions

- **Overall:** completed high-value practice divided by today’s recommended high-value practice.
- **Math:** completed Math value divided by today’s Math allocation.
- **Reading and Writing:** completed R&W value divided by today’s R&W allocation.

The units should be normalized practice value, not merely question count, so a hard confirmation or due review can be worth more than an easy repeat.

### Unnecessary work removed and minutes saved

These claims must be auditable rather than decorative:

- `questions_removed` counts candidate tasks/questions explicitly removed after mastery or retention evidence made them low-value.
- `minutes_saved` is the sum of expected time for removed work minus any replacement work added.
- Store the calculation inputs with the adaptation event.
- Never display a positive savings claim when no actual plan delta exists.

## 13. Score prediction

For the first release:

- Anchor the prediction to the most recent official or Bluebook section scores.
- Use V2 mastery and calibrated question evidence only for conservative adjustments.
- Update the visible prediction after a session or substantial evidence threshold, not after every question.
- Show a confidence range such as `1430 ± 50`.
- Widen the range for low attempt counts, weak question calibration, or old baseline scores.
- Preserve a prediction history and algorithm version.
- Add a disclaimer that the estimate is not an official College Board score.

Before launch, back-test the model against known practice-test outcomes. Do not market point gains until the prediction model has meaningful validation data.

## 14. Native iOS feature build

### App shell and design system

- Recreate the approved prototype in SwiftUI; do not import V1 visual styles.
- Define semantic color, spacing, radius, glass, shadow, typography, and motion tokens.
- Support light appearance first, then verify system behavior if dark mode is not intentionally supported.
- Build reusable rings, metric chips, route tiles, pacing bar, question card, answer choice, and primary action components.
- Use native tab navigation for Home, Progress, Review, and Profile.
- Add loading, empty, offline, expired-session, and server-error states.

### Practice flow

- Pre-fetch only answer-free question payloads.
- Start the response timer after the question is fully rendered.
- Preserve current question, selection, elapsed time, and scratchpad state when backgrounded.
- Submit with an idempotency key.
- Disable duplicate submissions while awaiting the server.
- Render correctness, short explanation, pacing bar, route delta, and scratch signal.
- Auto-scroll only enough to reveal feedback; never disorient the student.
- Respect the student’s manual End Session action.
- Support server-directed “You’re good for today” with Finish and Keep Practicing.

### Scratchpad

- Present as a bottom sheet whose top edge is below the complete question card.
- Allow it to cover answers but never the question.
- Drawing tab: PencilKit pen colors, eraser, undo/redo, and clear.
- Notes tab: typed text with Math-friendly keyboard behavior.
- Calculator tab: SAT-style scientific/graphing experience.
- Persist scratch state until the attempt is submitted or discarded.

For the production calculator, first obtain permission and commercial terms for embedding the Desmos API. Desmos currently treats production API use as a commercial tier and offers a College Board testing calculator: [Desmos API terms](https://www.desmos.com/api-terms), [SAT testing calculator](https://www.desmos.com/testing/collegeboard/graphing). If licensing is not complete by release freeze, ship a native scientific calculator plus an in-app browser link to the official SAT Desmos experience; do not scrape or impersonate it.

### Scratchwork analysis

Version one should be useful but constrained:

1. Always capture non-content signals locally: used/not used, time open, stroke count, erasures, calculator use, and typed-note length.
2. For supported Math skills, use Apple Vision OCR on-device to extract candidate equations from writing.
3. Send only the minimum supported representation to the server when scratch analysis is enabled.
4. Return a short structured signal such as `Likely sign slip` or `Setup verified`.
5. Do not present low-confidence diagnoses as facts.
6. Do not retain raw scratch images after processing unless the user explicitly saves them.
7. Let the user disable scratch analysis without disabling the scratchpad.
8. Feature-flag unsupported skills and fall back to `Scratchwork captured` rather than inventing a diagnosis.

### Progress and Review

- Progress: score range, target trajectory, eight domain mastery summaries, pacing, accuracy, recent improvement, and study history.
- Review: Due, Learning, Retesting, Resolved, and Saved filters.
- Keep review secondary; the daily practice engine should automatically include the highest-value due items.

### Profile

- Target score, SAT date, score history, accommodations, reminders, scratch-analysis preference, privacy, terms, support, sign out, and account deletion.

## 15. Notifications

- Ask for notification permission only after the student chooses a reminder time or completes a useful session.
- Start with local reminders for consistent daily scheduling.
- Add APNs-backed remote notifications only when server-side changes need delivery.
- Deep-link reminders to Start Practicing or the relevant due review.
- Respect timezone, quiet hours, and current authorization status.
- Never use guilt-based or streak-threatening language.

Apple recommends requesting notification permission in context rather than automatically on first launch: [notification permission guidance](https://developer.apple.com/documentation/UserNotifications/asking-permission-to-use-notifications).

## 16. Analytics, reliability, and observability

### Product events

Track only events needed to improve the product:

- onboarding completed
- practice started/resumed/ended
- question rendered/submitted
- explanation opened
- scratchpad/calculator used
- adaptation shown
- review classified/resolved
- recommendation completed
- account deletion requested

Never put question text, scratch text, access tokens, email addresses, or free-form error notes into analytics properties.

### Operational monitoring

- API error rate and p50/p95 latency.
- Session-start and next-question failures.
- Submission idempotency conflicts.
- Crash-free sessions and app hangs.
- Question quarantine alerts.
- AI drafting failures and review queue age.
- Migration and background-job failures.

### Performance budgets

- Warm launch to usable Home: target under 2 seconds on supported devices.
- Start Practicing to rendered question: target p95 under 1 second on a healthy connection.
- Attempt submit to feedback: target p95 under 800 ms.
- No dropped drawing strokes during normal PencilKit use.
- App package and cached assets remain intentionally bounded.

## 17. Testing strategy

### Backend and engine tests

- Unit tests for candidate scoring, mastery updates, pacing, review intervals, daily allocation, stopping, and savings calculations.
- Golden tests for fixed student histories so engine decisions do not change accidentally.
- Property tests for score/range bounds, no negative minutes, and valid state transitions.
- Contract tests ensuring the Swift and TypeScript schemas match.
- Integration tests covering session start → next → submit → mastery/error update → next.
- RLS and authorization tests for every V2 table.
- Answer-leakage tests against APIs, logs, direct database access, and cached payloads.
- Migration tests against a sanitized V1 schema snapshot.

### iOS tests

- View-model and repository unit tests.
- UI tests for onboarding, one-tap start, correct/incorrect feedback, classification, end session, resume, and account deletion.
- Snapshot tests for supported iPhone widths and large Dynamic Type.
- VoiceOver labels and focus-order tests.
- Network loss, timeout, duplicate tap, background/foreground, and expired-auth tests.
- Physical-device tests for PencilKit, keyboard, memory pressure, and notification deep links.

### Question QA

- Automated correctness checks where solvable.
- Render snapshots for all 200 questions.
- Search for duplicates and answer-pattern imbalance.
- Track pilot accuracy and timing by difficulty.
- Quarantine items with extreme performance, concentrated complaints, or ambiguous answer patterns.

### Release quality gates

- All 200 questions approved and published.
- No known answer leakage.
- No open P0/P1 defects.
- Crash-free TestFlight sessions at or above 99.5%.
- Session completion and resume tested on the minimum supported iOS version.
- RLS/security test suite passing.
- Account deletion verified end to end.
- Privacy disclosures match actual SDK and server behavior.
- App Review demo account and review notes verified.

## 18. Accessibility, privacy, and App Store compliance

- Support Dynamic Type, VoiceOver, Reduce Motion, sufficient contrast, and 44-point minimum touch targets.
- Never rely on color alone for correctness, pacing, or ring state.
- Provide accessible Math text and chart descriptions.
- Complete App Store age-rating questions; do not select the Kids category without deliberately accepting its permanent additional requirements.
- Review the treatment of teenage users, consent, retention, and scratchwork with qualified counsel before launch.
- Update the existing privacy policy and terms for proprietary question content, attempt telemetry, scratch analysis, AI processing, notifications, and account deletion.
- Create an App Privacy data map covering both SaturnPath and every third-party SDK.
- Include the required privacy manifest and SDK signatures where applicable.
- Avoid advertising SDKs and cross-app tracking in version one.
- Keep a content-rights record for every passage, image, chart, and question.
- State clearly that SaturnPath is not affiliated with or endorsed by College Board.

Apple requires App Store privacy disclosures, including data collected by integrated third parties, and a privacy policy URL: [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [App Store Connect privacy guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/). An App Store age rating is also required: [age-rating guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).

## 19. Delivery roadmap

Estimates assume one primary developer assisted by Codex and one solo question reviewer. Content work runs in parallel with engineering. Treat these as planning ranges, not promises.

### Phase 0 — Decisions and foundations (1–2 weeks)

- Confirm SwiftUI and same-repository architecture.
- Choose minimum supported iOS version based on target users and current App Store tooling.
- Create Apple, bundle ID, App Store Connect, staging, and signing configuration.
- Freeze V1 behavioral baselines and add smoke tests.
- Define API contracts, schema plan, feature flags, and privacy data map.
- Finalize the subskill question quota and review rubric.

**Exit gate:** Empty signed SwiftUI app reaches TestFlight; V1 build remains green.

### Phase 1 — Backend and iOS skeleton (2–3 weeks)

- Add V2 migrations and RLS.
- Scaffold `/api/v2`, shared contracts, and the iOS feature structure.
- Implement auth, onboarding, app shell, navigation, design tokens, and environment switching.
- Build the admin reviewer gate using the existing admin allowlist pattern.

**Exit gate:** A staging user can authenticate on iPhone, complete onboarding, and see a server-backed empty Home.

### Phase 2 — Question pipeline and 20-question vertical slice (3–4 weeks)

- Build AI candidate generation, validation, review, versioning, preview, and publishing.
- Approve the first 10 Math and 10 R&W questions.
- Build question delivery, secure answer submission, telemetry, and pacing.
- Implement the native question, answer, feedback, and path-change screens.

**Exit gate:** Real iPhone completes Home → Start → question → feedback → next → summary with no hard-coded question data.

### Phase 3 — Adaptive micro-sets and 50 questions (3–4 weeks)

- Implement skill state, candidate priority, cold start, difficulty fit, and selection reasons.
- Implement micro-set adaptation and visual adaptation pings.
- Add deterministic engine golden tests and audit logs.
- Reach 25 approved Math and 25 approved R&W questions.

**Exit gate:** Fixed student histories produce stable, explainable routes; every question shows why it was selected.

### Phase 4 — Error review and 100 questions (3–4 weeks)

- Implement automatic error creation, classifications, review state machine, similar-question linking, spacing, and Quick Fix.
- Add Review tab and daily review allocation.
- Reach 50 approved Math and 50 approved R&W questions.

**Exit gate:** A missed concept can move through incorrect → corrected → similar confirmation → delayed retest → resolved.

### Phase 5 — Daily optimization, rings, and scratchpad (3–4 weeks)

- Implement daily recommendation, ring values, stop rule, path deltas, and auditable time-saved calculations.
- Build PencilKit scratchpad, notes, calculator integration/fallback, and session persistence.
- Add limited, privacy-controlled scratchwork signals.
- Build Progress and Profile features.

**Exit gate:** The native experience matches the approved interaction model and restores an interrupted session safely.

### Phase 6 — Complete 200 questions and calibrate (4–8 weeks, overlapping)

- Reach all domain/subskill quotas.
- Run final two-pass review on every item.
- Pilot the bank, inspect answer distributions and response times, and quarantine weak items.
- Validate the mastery and score models with pilot histories.

**Exit gate:** 100 approved Math and 100 approved R&W questions are publishable, balanced, rendered, and monitored.

### Phase 7 — TestFlight hardening (2–3 weeks)

- Conduct internal TestFlight, then a small external tester group.
- Fix crashes, hangs, session-loss, authentication, accessibility, and confusing adaptation.
- Verify analytics/privacy behavior and deletion.
- Complete App Store screenshots, description, keywords, support page, privacy answers, age rating, and review notes.

Apple uses TestFlight for beta distribution and feedback before App Store submission: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

**Exit gate:** Release candidate meets every quality gate and passes final App Store submission rehearsal.

### Phase 8 — App Store launch and stabilization (1–2 weeks plus review)

- Submit the final TestFlight build to App Review.
- Keep production backend and reviewer demo account available to Apple.
- Respond to review questions or rejections with documented fixes.
- Release manually at first so launch timing is controlled.
- Monitor crashes, API failures, question reports, and support requests daily for the first two weeks.
- Use server feature flags and question quarantine rather than emergency app releases when possible.

Apple recommends providing a working demo account and detailed review notes for account-based apps: [App Review guidance](https://developer.apple.com/app-store/review/).

### Realistic total

With content production running in parallel, a credible first App Store version is approximately **20–28 weeks** for one primary developer and one solo reviewer. The 200-question correctness and review workload is the largest schedule variable.

## 20. Launch acceptance criteria

The first version is complete only when:

- V1 remains operational and its existing smoke tests pass.
- A returning iOS user reaches a useful question with one main tap.
- No answer key is exposed before submission.
- All attempts are idempotently stored with pacing and selection evidence.
- Every answer returns a concise pacing visualization and path change.
- The engine adapts over micro-sets and can explain each selection.
- Incorrect answers enter the review system automatically.
- Review items resolve only after correction, a similar problem, and a delayed retest.
- Daily rings and savings numbers are calculated from stored data.
- The scratchpad never covers the question and survives interruptions.
- Scratch analysis is optional, confidence-aware, and privacy documented.
- Exactly 100 Math and 100 R&W questions have passed both approval passes.
- Account deletion, privacy disclosures, accessibility, monitoring, and App Review materials are complete.
- The production app is approved and available on the iOS App Store.

## 21. Primary risks and mitigations

| Risk | Mitigation |
|---|---|
| Solo review becomes the launch bottleneck | Generate to fixed quotas, use two short review passes, batch by subskill, and expose queue throughput |
| AI creates plausible but invalid questions | Deterministic validation, independent critique, human approval, immutable versions, empirical quarantine |
| Copyright or passage-rights issue | Original/public-domain/licensed content only, provenance fields, rights checklist, no College Board question storage |
| Correct answers leak to the app | Separate public payloads, server validation, RLS, contract and penetration tests |
| Adaptive engine feels random | Store reason snapshots, use deterministic golden tests, show two visual selection metrics |
| Cold-start personalization is weak | Use score/test-date inputs and deliberate domain exploration with low confidence |
| “Minutes saved” feels fabricated | Calculate from actual removed/replacement work and persist the audit trail |
| Scratch analysis creates privacy risk | On-device preprocessing, minimum upload, optional feature, ephemeral raw data, explicit disclosure |
| Desmos cannot be embedded legally by launch | Resolve commercial API terms early; ship native calculator plus official link as fallback |
| Score estimate harms trust | Conservative range, session-level updates, baseline anchoring, back-testing |
| V2 changes break V1 | Additive schema, separate modules, V1 smoke suite, feature flags, no destructive rewrite |
| App Review is blocked by account/privacy issues | Sign in with Apple, deletion, review account, accurate privacy label, complete review notes |

## 22. Native iOS implementation checklist

Execute only this checklist in the iOS session. A backend-dependent item is unblocked only when `docs/coordination/WEB_TO_IOS_HANDOFFS.md` marks the required milestone `READY`.

### I1. Native foundation

- [x] Confirm native SwiftUI and same-repository structure. Recorded in [`docs/architecture/ADR-001-NATIVE-SWIFTUI-SAME-REPOSITORY.md`](docs/architecture/ADR-001-NATIVE-SWIFTUI-SAME-REPOSITORY.md).
- [x] Create the local SwiftUI project, V2 visual foundation, app icon, privacy manifest, Debug/Staging/Release configurations, unit tests, and launch UI test.
- [x] Verify Debug, Staging, and unsigned Release builds plus simulator launch and accessibility smoke coverage.

### I2. Apple identity, signing, and foundation TestFlight build

- [ ] Activate the individual Apple Developer Program membership.
- [ ] Create the permanent App ID and App Store Connect record using the approved identifiers in [`docs/apple/STEP-02-APP-STORE-SETUP.md`](docs/apple/STEP-02-APP-STORE-SETUP.md).
- [ ] Select the paid development team, create a signed Release archive, upload build 1, and confirm it processes in TestFlight.

The local portion is complete; the signed archive is externally blocked. Evidence is in [`docs/ios/STEP-07-SWIFTUI-SHELL-AND-TESTFLIGHT.md`](docs/ios/STEP-07-SWIFTUI-SHELL-AND-TESTFLIGHT.md).

### I3. Native client core and generated contracts

- [x] Add the typed `URLSession` client, environment configuration, authenticated request pipeline, normalized errors, and safe logging. Evidence: [`docs/ios/STEP-08-NATIVE-CLIENT-CORE.md`](docs/ios/STEP-08-NATIVE-CLIENT-CORE.md).
- [ ] Generate or implement Swift request/response models from a `READY` OpenAPI milestone without modifying the shared contract.
- [x] Add Keychain-backed session handling, dependency injection, feature flags, and local recovery foundations.
- [x] Add mock repositories so native UI work can proceed when a live endpoint milestone is not ready.

### I4. Native authentication, onboarding, and account lifecycle

- [ ] Implement Sign in with Apple, Supabase Swift authentication, deep links, sign-out, and recovery behavior.
- [ ] Implement native onboarding using the shared bootstrap/profile behavior.
- [ ] Implement account-linking presentation and native account-deletion confirmation against the shared endpoint.
- [ ] Verify auth expiry, cancellation, private relay, relaunch, and deletion on simulator and physical device.

The mock-backed root router, sign-in presentation, three-step onboarding flow, validation, error presentation, and end-to-end simulator path are complete. Apple authorization, Supabase session exchange, deep links, profile persistence, sign-out, recovery, and deletion remain unchecked until signing and backend milestones are ready. Evidence: [`docs/ios/STEP-10-AUTH-AND-ONBOARDING-FOUNDATION.md`](docs/ios/STEP-10-AUTH-AND-ONBOARDING-FOUNDATION.md).

### I5. Native shell, navigation, and Home

- [x] Expand the V2 design system with semantic spacing, glass, typography, motion, controls, and accessibility behavior without using V1 styles. Evidence: [`docs/ios/STEP-09-NATIVE-SHELL-AND-HOME-FOUNDATION.md`](docs/ios/STEP-09-NATIVE-SHELL-AND-HOME-FOUNDATION.md).
- [x] Implement native Home, Progress, Review, and Profile tab navigation.
- [ ] Implement server-backed Home with recommendation, thick rings, score range, target, SAT date, work removed, and minutes saved.
- [x] Add loading, empty, offline, expired-session, and server-error states.

The approved Home presentation is implemented against deterministic mock repository data. The server-backed checkbox remains open until the Home API milestone is marked `READY`; Progress, Review, and Profile currently provide native destination shells rather than claiming their later feature work is complete.

### I6. Native practice vertical slice

- [ ] Implement Start Practicing, answer-free question rendering, response timing, choices/student-produced responses, and idempotent submission.
- [ ] Render correctness, concise explanation, visual pacing, path delta, and next action from server responses.
- [ ] Preserve question, selection, timer, and session state across background/foreground and termination.
- [ ] Verify Home → Start → question → feedback → next → summary on a physical iPhone with no hard-coded question data.

### I7. Native adaptive and selection presentation

- [ ] Present server-provided “Why this question” title and two visual metrics.
- [ ] Present subtle per-answer route deltas and larger micro-set adaptation changes.
- [ ] Implement server-directed stopping with Finish and Keep Practicing.
- [ ] Do not calculate or override mastery, routes, selection priority, or savings in Swift.

### I8. Native Review and error-resolution experience

- [ ] Implement one-tap mistake classification and constrained Other entry.
- [ ] Implement Due, Learning, Retesting, Resolved, and Saved native views.
- [ ] Render server-owned review states and actions without reproducing the state machine locally.
- [ ] Verify correction, similar confirmation, delayed retest, resolution, and failure paths.

### I9. Native scratchpad, calculator, and scratch signals

- [ ] Implement the bottom sheet below the complete question so it may cover answers but never the question.
- [ ] Add PencilKit drawing, typed notes, colors, eraser, undo/redo, clear, and attempt-scoped persistence.
- [ ] Implement the licensed calculator integration or defined native/fallback experience.
- [ ] Add on-device non-content signals and supported Apple Vision preprocessing.
- [ ] Send only privacy-approved structured data and present confidence-aware server signals.

### I10. Complete native Progress, Profile, notifications, and recovery

- [ ] Complete native progress/mastery/pacing/history presentation.
- [ ] Complete target, SAT date, scores, accommodations, reminders, privacy, terms, support, sign-out, and deletion settings.
- [ ] Add contextual local notifications and deep links; add APNs only if shared server behavior requires it.
- [ ] Complete session, scratchpad, queued-event, network-loss, and auth recovery.

### I11. Native quality and App Store compliance

- [ ] Add view-model/repository, UI, snapshot, accessibility, network, lifecycle, and duplicate-action tests.
- [ ] Verify supported iPhone widths, iOS 18 minimum, large Dynamic Type, VoiceOver, Reduce Motion, contrast, and 44-point targets.
- [ ] Test PencilKit, keyboards, memory pressure, notifications, and backgrounding on physical devices.
- [ ] Finalize the native privacy manifest, App Privacy answers, age rating, screenshots, metadata, support URL, and review notes.
- [ ] Verify account deletion and the App Review account end to end against production-like backend data.

### I12. TestFlight, App Store release, and stabilization

- [ ] Conduct internal and then external TestFlight rounds.
- [ ] Meet crash-free, performance, accessibility, privacy, session-resume, and P0/P1 quality gates.
- [ ] Submit the release candidate to App Review and respond to review findings.
- [ ] Release manually, monitor native crashes/API failures, and stabilize the App Store version.

### Web-owned dependencies removed from this checklist

The iOS session does not build the admin console, generate or approve the shared 200-question bank, implement TypeScript adaptive/review/recommendation engines, create V2 migrations, implement `/api/v2`, deploy Vercel, or launch the web product. Those tasks are governed by `SATURNPATH_V2_WEB_IMPLEMENTATION_PLAN.md`.

## 23. Decisions still required before implementation

These do not block this planning document, but they must be resolved in Phase 0:

- Activation of the individual Apple Developer Program membership; the product name and bundle identifier are approved.
- Minimum supported version is iOS 18.0 (decided in Step 7).
- Whether version one is completely free; this plan assumes no purchases or subscriptions.
- AI provider for admin-only question drafting; the implementation should remain provider-agnostic.
- Whether commercial Desmos API terms are acceptable; fallback is already defined.
- Initial TestFlight tester count and recruitment method.
- Countries/regions included in the first release.
- Final support and privacy contact addresses.

## 24. Source-of-truth references

- Product behavior: `prototypes/saturnpath-v2-mobile/index.html`
- V2 brief: the pasted SaturnPath V2 Implementation Brief supplied with the prototype task
- Existing backend schema: `supabase/schema.sql`
- Existing V1 adaptive logic: `lib/adaptive-replanner/`
- Existing score model: `lib/adaptive-replanner/score-prediction.service.ts`
- Official SAT taxonomy: [College Board content domains](https://satsuite.collegeboard.org/higher-ed-professionals/sat-validity/content-domains)
- Apple distribution: [Distributing apps for testing and release](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases/)
- Apple review: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
