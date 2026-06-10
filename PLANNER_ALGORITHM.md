# Study Planner Algorithm

## Purpose

Generate a personalized SAT study schedule based on:

- Current score and target score
- Test date
- Available study time
- Per-domain topic performance (question_sessions)

---

## System Architecture

Two separate engines handle planning and replanning:

```
Initial generation:    lib/study-plan-engine/     → StudyPlanEngine.generate()
Ongoing adaptation:    lib/adaptive-replanner/    → runAdaptiveReplanner()
```

Both engines share the same scoring primitives from `lib/study-plan-engine/scoring.service.ts`.

---

## Initial Plan Generation

### Inputs

**Student Profile:**
- `currentScore` — composite SAT score (400–1600)
- `targetScore` — goal score (must exceed currentScore)
- `testDate` — ISO date string
- `dailyStudyMinutes` — per session (15–300)
- `topicPerformance[]` — per-domain accuracy from question_sessions

**8 SAT Domains:**

Reading & Writing:
- Information and Ideas (12 questions, 11.1 pts/q)
- Craft and Structure (18 questions, 11.1 pts/q)
- Expression of Ideas (12 questions, 11.1 pts/q)
- Standard English Conventions (12 questions, 11.1 pts/q)

Math:
- Algebra (13 questions, 13.6 pts/q)
- Advanced Math (13 questions, 13.6 pts/q)
- Problem-Solving & Data Analysis (7 questions, 13.6 pts/q)
- Geometry & Trigonometry (5 questions, 13.6 pts/q)

### Step 1 — Domain Ranking (scoring.service.ts)

For each domain:
```
targetAccuracy = clamp((targetScore/2 - 200) / 600 × 100, 55, 95)
currentAccuracy = from question_sessions (default 50% if no data)
gap = max(0, targetAccuracy - currentAccuracy)
leverage = questionCount × pointsPerQuestion
rawPriorityScore = gap × leverage
potentialPoints = round(gap / 100 × leverage)
replanningWeight = rawPriorityScore / maxRawPriorityScore   (0–1)
```

Domains are sorted descending by `rawPriorityScore`. Weak, high-leverage domains surface first.

**DB storage:** `priority_score` stored as normalized **1–100**:
```
priority_score = max(1, round(rawPriorityScore / maxRawPriorityScore × 100))
```
Practice tests use a fixed `priority_score` of **100**.

**`mastery_target`** is stored as **90** for all study and review tasks, regardless of target score. This is the accuracy percentage displayed to students as their session goal. It does not vary per student or per domain. Practice tests store 0 (N/A). The internal `targetAccuracy` variable still drives difficulty selection in the algorithm — only the stored DB field is fixed at 90.

### Step 2 — Day Classification (scheduler.service.ts)

```
Mon–Fri  → study day   (one domain per session)
Saturday → review day  OR practice test (every N weeks)
Sunday   → rest
```

Practice test scheduling:
- < 3 weeks: none
- 3–6 weeks: weeks 2 and (total - 1)
- 7–16 weeks: every 3rd week
- > 16 weeks: every 4th week + every 2nd week in the final quarter

### Step 3 — Phase Assignment (difficulty.service.ts)

Plan progress = weekNum / totalWeeks

| Progress | Phase | Dominant Difficulty |
|---|---|---|
| 0–25% | Foundation | Easy |
| 25–65% | Skill | Medium |
| 65–88% | Advanced | Hard |
| 88–100% | Strategy | Hard (timed) |

Difficulty is further gated by current accuracy:
- accuracy < 55%: stay Easy regardless of phase
- accuracy 55–70%: unlock Medium in Skill+
- accuracy > 70%: unlock Hard in Advanced+

### Step 4 — Domain Rotation (scheduler.service.ts)

Each study day produces **two blocks** — one R&W and one Math — so students practice both subjects every day. The domains within each subject follow independent 7-slot priority pools:

```
R&W pool (4 domains):   [rwRank0, rwRank1, rwRank2, rwRank3, rwRank0, rwRank0, rwRank1]
Math pool (4 domains):  [mRank0,  mRank1,  mRank2,  mRank3,  mRank0,  mRank0,  mRank1]
```

The weakest domain within each subject gets the most weekly exposure. Each pool shifts every 4-week macro-cycle so all 8 domains (4 R&W + 4 Math) rotate in. The two pools advance independently via separate global index counters.

### Step 5 — Question Count

Daily minutes are split evenly between the two blocks. Each block's question target is computed at 90% efficiency (≥90% of the block's time goes to answering questions):

```
halfMinutes   = floor(dailyStudyMinutes / 2)
halfBase      = clamp(floor(halfMinutes × 0.90 / 1.25), 10, 80)
ramp          = 0.80 + (weekNum / totalWeeks) × 0.40   → 80% in week 1, 120% in final week
questionCount = round(halfBase × ramp)   per block
```

For a 60-minute day: `halfMinutes = 30`, `halfBase = 21`, giving each block ≈ 17–25 questions depending on the week.

### Step 6 — Persistence (plan-store.service.ts)

1. Deactivate all existing active plans for the user
2. Insert one `study_plans` row
3. Batch-insert `calendar_tasks` rows (one per block, rest days skipped)
4. Each task carries: `priority_score` (1–100), `mastery_target` (90), `estimated_score_impact`, `replanning_weight`, `replan_locked: false`

**Review day task shape:**
Review days produce **one** `calendar_tasks` row (not one per domain):
- `category: 'Review Session'`
- `subject: 'both'`
- `title: 'Review Session'`
- `college_board_filters: null` (no QB filter — this session is error-log based)
- `priority_score: 50`, `mastery_target: 0`, `replanning_weight: 0.5`
- `duration_minutes`: total review duration for the day

The Adaptive Replanner skips `'Review Session'` tasks (no matching domain in `rankedByLabel`).

---

## Adaptive Replanner

### Trigger Events

| Event | Trigger Type |
|---|---|
| Student logs a question session (completes a calendar task) | `question_session` |
| Student adds an error log entry | `error_log` |
| Student completes onboarding (diagnostic data) | `question_session` |
| Student submits a practice/official/full-length test score | `practice_test_score` |

### Algorithm

**Entry:** `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`

**Returns:** `ReplannerResult` including:
- `tasksUpdated` — number of rows modified
- `taskChanges: DomainChange[]` — per-domain diff (difficulty change, question count delta, new priority score, current accuracy)
- `predictedScore` — `min(1600, currentScore + sum(all domain potentialPoints))` — upper bound if plan is fully completed
- `auditLogId` — UUID of the written audit log row

**Steps:**

1. **Load profile** — `current_score`, `target_score`, `test_date`, `daily_study_minutes` from `users`
2. **Recompute topic performance** — aggregate all `question_sessions` → per-domain accuracy
3. **Re-rank domains** — `rankDomains(topicPerformance, targetScore)` → fresh priority order + normalized scores
4. **Fetch future unlocked tasks** — `WHERE replan_locked = FALSE AND task_date > today AND study_plan_id = activePlanId`
5. **For each task:**
   - **Practice tests** (`category = 'Full Practice Test'`): update `priority_score: 100`, `replanningWeight: 0.9` only — never touch title, description, or duration
   - **Study/review tasks**: look up domain from `task.category` → get fresh `RankedDomain`
     - Derive `phase` from proportion of remaining time: `weeksToTask / totalWeeksToTest`
     - Compute `difficulty = difficultyForSession(phase, rd.currentAccuracy)`
     - Compute `questionCount = clamp(floor(duration × 0.80 × rampFactor / 1.25), 10, 80)`
     - Compare old difficulty (from `college_board_filters.difficulty`) and old question count (parsed from title) → record change for `DomainChange`
     - Rebuild `title`, `description`, `college_board_filters.difficulty`
     - Set `priority_score` (1–100), `mastery_target: 90`, `estimated_score_impact`, `replanning_weight`, `last_replanned_at`
6. **Batch update** — parallel updates in chunks of 100
7. **Compute `predictedScore`** — `min(1600, currentScore + Σ potentialPoints across all 8 domains)`
8. **Aggregate `DomainChange[]`** — group by domain, record difficulty transitions and net question count deltas
9. **Write audit log** — one `replan_audit_logs` row per run

### Safeguards

| Rule | Implementation |
|---|---|
| Never modify completed tasks | `WHERE replan_locked = FALSE` filter |
| Never delete tasks | Only UPDATE operations — no DELETEs |
| Never remove practice tests | Category check skips content updates |
| Never exceed block study time | Question count ceiling: `floor(duration × 0.90 / 1.25)` |
| Only touch active plan | `WHERE study_plan_id = activePlanId` |

### replanning_weight Usage

`replanningWeight` (0–1) encodes how aggressively a task is reprioritized relative to the highest-ranked domain. A task with `replanningWeight = 1.0` is the top priority; `0.2` is low priority. Practice tests are fixed at 0.9. The weight is recomputed on every replanning run.

### Audit Log

Every replanning run produces one `replan_audit_logs` row:
- `triggered_by` — event type
- `trigger_id` — UUID of the triggering record
- `tasks_updated` — count of modified tasks
- `domains_reprioritized` — top-5 domains with normalized priority scores and accuracy
- `changes_summary` — human-readable description

---

## Session Timing Rules (SessionWorkflowDialog)

The calendar session workflow provides a reference timer while students practice on the College Board Question Bank:

| Subject | Seconds per question |
|---|---|
| Reading & Writing | 71 |
| Math | 95 |

**Total allocated time** = `Math.ceil(questionCount × secsPerQuestion / 60) × 60` — rounded up to the nearest full minute.

When the timer reaches zero: a "Time's up" notification fires, the display flips to red `+MM:SS overtime`, and input continues uninterrupted. The final time delta (time left or overtime) is shown on the results screen alongside the per-question score breakdown.

---

## Copyright Compliance

The planner may:
- Recommend topics
- Recommend difficulty levels
- Recommend question quantities
- Recommend College Board Question Bank filters (domain, skill, difficulty)

The planner may NOT:
- Display SAT questions
- Store SAT questions
- Reproduce SAT passages or answer choices

Students obtain all questions directly from the College Board Question Bank. The per-question answer entries in `SessionWorkflowDialog` (A/B/C/D) are the student's own choices — not SAT content. See `COPYRIGHT_COMPLIANCE.md` for the full compliance checklist.
