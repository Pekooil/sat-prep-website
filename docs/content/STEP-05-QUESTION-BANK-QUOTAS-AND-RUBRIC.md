# Step 5 — Question-bank quotas and approval rubric

**Status:** Approved  
**Approved by:** Darcy Wang  
**Approved:** August 26, 2026  
**Launch target:** 200 publishable original questions — 100 Reading and Writing and 100 Math

## 1. Binding decisions

1. Domain quotas follow the approximate operational SAT distribution rather than equal domain coverage.
2. Every official SAT skill is represented; convenient-to-generate skills may not borrow quota from another cell.
3. The launch count includes only questions whose current version has passed both Darcy review passes and is `approved` or `published`.
4. Draft, rejected, quarantined, retired, superseded, and AI-only reviewed questions do not count toward 200.
5. All Reading and Writing questions are four-option multiple choice.
6. Math contains 75 four-option multiple-choice questions and 25 student-produced response questions.
7. Each section begins with an authoring mix of 30 easy, 45 medium, and 25 hard questions. These labels are provisional until real response data supports empirical difficulty.
8. Thirty Math questions must be set in a meaningful science, social studies, or real-world context. Cosmetic stories do not count.

The machine-enforceable source of truth is [`content/v2/question-bank-quota.v1.json`](../../content/v2/question-bank-quota.v1.json).

## 2. Reading and Writing quota — 100

| Domain | Official weight | Skill / subskill | Total | Easy | Medium | Hard |
|---|---:|---|---:|---:|---:|---:|
| Information and Ideas | 26% | Central Ideas and Details | 7 | 2 | 3 | 2 |
|  |  | Command of Evidence — Textual | 7 | 2 | 3 | 2 |
|  |  | Command of Evidence — Quantitative | 5 | 1 | 3 | 1 |
|  |  | Inferences | 7 | 2 | 3 | 2 |
| **Information and Ideas subtotal** | **26%** |  | **26** | **7** | **12** | **7** |
| Craft and Structure | 28% | Words in Context | 10 | 3 | 5 | 2 |
|  |  | Text Structure and Purpose | 10 | 3 | 4 | 3 |
|  |  | Cross-Text Connections | 8 | 2 | 4 | 2 |
| **Craft and Structure subtotal** | **28%** |  | **28** | **8** | **13** | **7** |
| Expression of Ideas | 20% | Rhetorical Synthesis | 10 | 3 | 5 | 2 |
|  |  | Transitions | 10 | 4 | 4 | 2 |
| **Expression of Ideas subtotal** | **20%** |  | **20** | **7** | **9** | **4** |
| Standard English Conventions | 26% | Boundaries | 13 | 4 | 6 | 3 |
|  |  | Form, Structure, and Sense | 13 | 4 | 5 | 4 |
| **Standard English Conventions subtotal** | **26%** |  | **26** | **8** | **11** | **7** |
| **Reading and Writing total** | **100%** |  | **100** | **30** | **45** | **25** |

Additional composition rules:

- Every Command of Evidence — Quantitative item includes an accessible table or graph and useful alternative text.
- Every Cross-Text Connections item uses two short, topically related texts.
- Reading stimuli must collectively cover literature, history/social studies, humanities, and science. No single subject area may exceed 35% of passage-based Reading and Writing questions.
- Passages and factual claims must be original, public-domain, or licensed and must record provenance.

## 3. Math quota — 100

| Domain | Official weight | Skill / subskill | Total | Easy | Medium | Hard | MCQ | SPR | Context |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| Algebra | 35% | Linear Equations in One Variable | 7 | 3 | 3 | 1 | 5 | 2 | 1 |
|  |  | Linear Equations in Two Variables | 7 | 2 | 3 | 2 | 5 | 2 | 1 |
|  |  | Linear Functions | 8 | 2 | 4 | 2 | 6 | 2 | 3 |
|  |  | Systems of Two Linear Equations in Two Variables | 7 | 2 | 3 | 2 | 5 | 2 | 1 |
|  |  | Linear Inequalities in One or Two Variables | 6 | 2 | 3 | 1 | 5 | 1 | 1 |
| **Algebra subtotal** | **35%** |  | **35** | **11** | **16** | **8** | **26** | **9** | **7** |
| Advanced Math | 35% | Equivalent Expressions | 9 | 2 | 4 | 3 | 7 | 2 | 1 |
|  |  | Nonlinear Equations in One Variable | 9 | 2 | 4 | 3 | 6 | 3 | 2 |
|  |  | Systems of Equations in Two Variables | 8 | 2 | 4 | 2 | 6 | 2 | 2 |
|  |  | Nonlinear Functions | 9 | 2 | 4 | 3 | 7 | 2 | 2 |
| **Advanced Math subtotal** | **35%** |  | **35** | **8** | **16** | **11** | **26** | **9** | **7** |
| Problem-Solving and Data Analysis | 15% | Ratios, Rates, Proportions, and Units | 3 | 1 | 1 | 1 | 2 | 1 | 3 |
|  |  | Percentages | 2 | 1 | 1 | 0 | 2 | 0 | 2 |
|  |  | One-Variable Data | 2 | 1 | 1 | 0 | 2 | 0 | 1 |
|  |  | Two-Variable Data | 2 | 1 | 1 | 0 | 1 | 1 | 2 |
|  |  | Probability and Conditional Probability | 2 | 0 | 1 | 1 | 2 | 0 | 2 |
|  |  | Inference and Margin of Error | 2 | 1 | 1 | 0 | 1 | 1 | 1 |
|  |  | Evaluating Statistical Claims | 2 | 1 | 0 | 1 | 2 | 0 | 1 |
| **Problem-Solving and Data Analysis subtotal** | **15%** |  | **15** | **6** | **6** | **3** | **12** | **3** | **12** |
| Geometry and Trigonometry | 15% | Area and Volume | 4 | 2 | 1 | 1 | 3 | 1 | 1 |
|  |  | Lines, Angles, and Triangles | 4 | 1 | 2 | 1 | 3 | 1 | 1 |
|  |  | Right Triangles and Trigonometry | 4 | 1 | 2 | 1 | 3 | 1 | 1 |
|  |  | Circles | 3 | 1 | 2 | 0 | 2 | 1 | 1 |
| **Geometry and Trigonometry subtotal** | **15%** |  | **15** | **5** | **7** | **3** | **11** | **4** | **4** |
| **Math total** | **100%** |  | **100** | **30** | **45** | **25** | **75** | **25** | **30** |

Math rules:

- An SPR may accept multiple equivalent correct representations, but the validation set must be explicit and tested.
- At least one independent solution method must verify every hard item and every SPR.
- Contextual questions must test the target mathematics rather than reading complexity or obscure outside knowledge.
- All diagrams must be generated from owned source files, include accessibility descriptions, and state whether they are drawn to scale.

## 4. Difficulty and expected-time calibration

Authoring difficulty is a routing hypothesis, not a permanent fact.

- **Easy:** direct application with low setup burden and limited distractor complexity.
- **Medium:** two or more linked reasoning steps, a meaningful representation choice, or plausible misconception-based distractors.
- **Hard:** non-obvious modeling, multi-constraint reasoning, abstraction, or distractors that expose deeper misconceptions without using tricks.

Every draft records an expected completion time. Initial targets are calibrated around the official section averages, then replaced with median response time by accommodation cohort once enough valid attempts exist. Difficulty may be relabeled after pilot evidence; domain and skill classification may not be changed without a new reviewed version.

## 5. Two-pass human approval rubric

Darcy is the sole human approver. AI may draft, validate, and critique, but it cannot approve or publish.

### Pass 1 — content and correctness

Every item must receive `pass`, `revise`, or `reject` for each criterion:

| ID | Criterion | Passing standard | Hard blocker? |
|---|---|---|---|
| C1 | Originality and rights | Original/public-domain/licensed content; provenance stored; no copied College Board wording or assets | Yes |
| C2 | Taxonomy | Exactly one correct section, domain, skill/subskill, response type, and quota cell | Yes |
| C3 | Stem and stimulus | Complete, concise, self-contained, age-appropriate, and free of unintended clues | Yes |
| C4 | Answer verification | Answer independently recomputed; one unambiguously best MCQ answer or explicit valid SPR set | Yes |
| C5 | Distractors | Three distinct, plausible misconception-based choices; no duplicates or accidental alternatives | Yes for MCQ |
| C6 | Explanation | Shows the shortest sound method and why the selected answer is correct without circular reasoning | Yes |
| C7 | Difficulty and timing | Label and expected seconds match actual reasoning burden; difficulty does not come from confusing prose | No |
| C8 | Factual and numeric integrity | Claims, units, labels, calculations, citations, and data display agree | Yes |
| C9 | Fairness and accessibility | No stereotype, needless cultural dependency, inaccessible wording, or color-only meaning | Yes |
| C10 | Adaptive usefulness | The item diagnoses a specific misconception and has tags that can explain why it was selected | No |

Pass 1 succeeds only when all hard blockers pass, all other criteria pass, and no unresolved reviewer note remains. A revision creates a new immutable question version and requires the affected checks to be repeated.

### Pass 2 — proof and rendering

Pass 2 uses the exact candidate version that would be published:

| ID | Criterion | Passing standard | Hard blocker? |
|---|---|---|---|
| P1 | Copy proof | No grammar, punctuation, capitalization, or consistency error | Yes |
| P2 | Math and symbol rendering | Expressions, fractions, exponents, radicals, tables, and symbols render correctly | Yes |
| P3 | Mobile layout | Stem, passage, choices, and explanation work at smallest supported iPhone width and large Dynamic Type | Yes |
| P4 | Visual accessibility | Chart/diagram alternative text is useful; contrast and meaning do not depend on color alone | Yes |
| P5 | Interaction | MCQ/SPR input, keyboard, scrolling, selection, and submission behave correctly | Yes |
| P6 | Student payload | No answer, explanation, reviewer note, private source detail, or validation rule leaks before submission | Yes |
| P7 | Metadata proof | Quota cell, expected seconds, tags, rights record, generator metadata, and version reason are complete | Yes |
| P8 | Final decision | Darcy explicitly approves this immutable version for publication | Yes |

An item counts toward launch quota only after all P1–P8 pass. Publishing is a separate deliberate action; approval does not automatically make the item student-visible.

## 6. AI-assisted drafting workflow

1. Select an unfilled quota cell from the machine-readable quota file.
2. Generate a candidate using the exact taxonomy, format, difficulty, context, and rights constraints.
3. Run deterministic checks: totals/answer consistency, duplicate choices, SPR equivalence, required fields, prohibited content, and asset metadata.
4. Run an independent AI critique with a different prompt and store its findings as advisory evidence.
5. Run similarity checks against the internal bank and block near-duplicates.
6. Place the candidate in `needs_review`; AI cannot advance it further.
7. Darcy completes Pass 1. Revisions produce a new immutable version.
8. Preview that version on supported iPhone sizes and complete Pass 2.
9. Mark it `approved`; publish only through a separate confirmation.
10. Monitor response time, answer distribution, issue reports, and discrimination proxy. Automatically quarantine suspicious items for Darcy to inspect.

## 7. Bank-level release gate

The 200-question bank is release-ready only when:

- every machine-readable quota cell is exactly filled;
- both sections match their difficulty and response-format totals;
- both review passes are recorded for every current version;
- all passages, facts, data, and assets have a rights/provenance record;
- no unresolved validation, similarity, accessibility, or reviewer warning remains;
- every item has been rendered in the native question UI;
- pilot metrics exist where feasible, and suspicious items are quarantined rather than counted;
- 100 publishable Reading and Writing and 100 publishable Math questions remain after quarantine.

Draft additional reserve candidates throughout development, but never count reserve inventory toward the launch 200 until it independently passes both reviews.

## 8. Official references

- [College Board content domains](https://satsuite.collegeboard.org/higher-ed-professionals/sat-validity/content-domains)
- [College Board Reading and Writing specifications](https://satsuite.collegeboard.org/k12-educators/about/alignment/reading)
- [College Board Math overview](https://satsuite.collegeboard.org/sat/whats-on-the-test/math/overview)
- [College Board student-produced responses](https://satsuite.collegeboard.org/sat/whats-on-the-test/math/student-produced)
- [Assessment Framework for the Digital SAT Suite](https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf)

SaturnPath uses the official taxonomy and approximate distribution only. It does not copy College Board questions, passages, explanations, or visual assets and is not affiliated with or endorsed by College Board.

## 9. Verification

Verified on August 26, 2026:

- machine quota contract: 5 tests passed;
- full repository suite: 57 tests passed across 5 files;
- TypeScript: passed with no errors;
- Step 5 ESLint check: passed with no warnings or errors.
