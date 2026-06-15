// ─────────────────────────────────────────────────────────────────────────────
// SchedulerService
// Generates the complete day-by-day study schedule from plan start to test date.
//
// Day classification (repeating 7-day calendar):
//   Mon–Fri  → Study day (one R&W block + one Math block per session)
//   Saturday → Review day (all domains studied that week, short sets)
//              OR Practice Test (every N weeks, see practiceTestWeeks)
//   Sunday   → Rest (no tasks)
//
// Dual-subject study days:
//   Each study day produces TWO blocks — one Reading & Writing domain and one
//   Math domain — each using half the daily study minutes. This guarantees the
//   student practices both subjects every day.
//
// Domain rotation across study days:
//   Two independent 7-slot pools, one for R&W (4 domains) and one for Math
//   (4 domains). Each pool follows the same priority pattern:
//     [rank0, rank1, rank2, rank3, rank0, rank0, rank1]
//   The weakest domain within each subject gets the most weekly exposure.
//   Pools shift every 4-week macro-cycle so all domains rotate in.
//
// Skill advancement:
//   Each domain tracks how many sessions it has had (domainStudyCount).
//   This counter drives skillFocusForSession() to cycle through the skill list.
//
// Question count ramp:
//   Starts at 80 % of the per-block target in week 1, reaches 120 % by the
//   final study week, building stamina progressively. The per-block base is
//   computed from half the daily study minutes at 90 % efficiency.
// ─────────────────────────────────────────────────────────────────────────────

import {
  phaseForWeek,
  PHASE_LABELS,
  difficultyForSession,
  skillFocusForSession,
  REVIEW_QUESTIONS_PER_DOMAIN,
  PRACTICE_TEST_QUESTIONS,
  PRACTICE_TEST_MINUTES,
} from './difficulty.service'
import { primarySkill } from './domain-catalog'
import { dailyQuestionTarget, masteryTargetForDomain } from './scoring.service'
import type {
  DaySchedule,
  DayType,
  Phase,
  PhaseSummary,
  PracticeTestBlock,
  RankedDomain,
  ReviewBlock,
  StudyBlock,
  StudyPlanEngineInput,
  TestDayBlock,
} from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Total calendar days from today to testDate (inclusive, minimum 7). */
function totalCalendarDays(testDate: string): number {
  return Math.max(7, Math.ceil(
    (new Date(testDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  ))
}

/**
 * Determine which calendar weeks (1-indexed) should have a practice test
 * on the last study day of the week (every 2 weeks).
 *
 * One practice test is always scheduled 2 days before the test date (handled
 * separately in buildSchedule) — that mandatory test is NOT included here.
 *
 * Strategy: one test every 2 weeks, starting at week 2, stopping before the
 * final week (week totalWeeks). The final biweekly slot is intentionally
 * skipped because the 2-days-before mandatory test covers that window.
 */
function practiceTestWeekSet(totalWeeks: number): Set<number> {
  const weeks = new Set<number>()
  for (let w = 2; w <= totalWeeks - 1; w += 2) weeks.add(w)
  return weeks
}

/**
 * Return the day-of-week (JS getDay() convention: 0=Sun … 6=Sat) that is the
 * last study day in a week. Used to promote that slot to a practice test in
 * practice-test weeks.
 *
 * Default schedule (Mon–Fri=study, Sat=review, Sun=rest): last study day = Friday (5).
 * Custom schedule: scan Mon→Sun in reverse, return the last day marked 'study'.
 */
function lastStudyDayOfWeek(daySchedule?: Record<number, 'study' | 'review' | 'rest'>): number {
  if (!daySchedule) return 5 // Friday by default
  const weekOrder = [1, 2, 3, 4, 5, 6, 0] // Mon through Sun
  for (let i = weekOrder.length - 1; i >= 0; i--) {
    const dow = weekOrder[i]
    if ((daySchedule[dow] ?? 'rest') === 'study') return dow
  }
  return 5
}

// ─── Day Classification ───────────────────────────────────────────────────────

/**
 * Map a calendar day to its DayType.
 * In practice-test weeks, the last study day of the week is promoted to
 * 'practice_test' instead of keeping its normal 'study' classification.
 */
function classifyDay(
  dayOfWeek: number,
  weekNum: number,
  practiceTestWeeks: Set<number>,
  lastStudyDow: number,
  daySchedule?: Record<number, 'study' | 'review' | 'rest'>,
): DayType {
  const base = daySchedule
    ? (daySchedule[dayOfWeek] ?? 'rest')
    : dayOfWeek === 0 ? 'rest'
    : dayOfWeek === 6 ? 'review'
    : 'study'

  // Promote the last study day to 'practice_test' in practice-test weeks
  if (base === 'study' && dayOfWeek === lastStudyDow && practiceTestWeeks.has(weekNum)) {
    return 'practice_test'
  }
  return base
}

// ─── Domain Pool ─────────────────────────────────────────────────────────────

/**
 * Build the 7-slot weekly rotation pool from the priority ranking.
 *
 * Slot layout for Mon–Fri (5 study days within a week):
 *   [rank0, rank1, rank2, rank3, rank4, rank0, rank1]
 *
 * Every 4-week "macro-cycle" we shift the secondary slots by one position,
 * ensuring all 8 domains enter the rotation over time.
 */
function buildDomainPool(ranked: RankedDomain[], macroCycle: number): RankedDomain[] {
  const n = ranked.length
  const shift = (macroCycle * 2) % n
  return [
    ranked[0 % n],
    ranked[(1 + shift) % n],
    ranked[(2 + shift) % n],
    ranked[(3 + shift) % n],
    ranked[(4 + shift) % n],
    ranked[0 % n],          // Friday repeats the weakest
    ranked[(1 + shift) % n],
  ]
}

// ─── Block Builders ───────────────────────────────────────────────────────────

function buildStudyBlock(
  rd: RankedDomain,
  phase: Phase,
  durationMinutes: number,
  baseQuestions: number,
  weekNum: number,
  totalWeeks: number,
  domainStudyCount: number,
  maxPriorityScore: number,
): StudyBlock {
  // Ramp question count: 80 % in week 1 → 120 % in the final week
  const rampFactor = 0.80 + (weekNum / totalWeeks) * 0.40
  const questionCount = Math.round(baseQuestions * rampFactor)
  const difficulty = difficultyForSession(phase, rd.currentAccuracy)
  const skillFocus = skillFocusForSession(rd.entry, phase, rd.currentAccuracy, domainStudyCount)

  const domainTarget = masteryTargetForDomain(rd.currentAccuracy)

  const descriptions: Record<Phase, string> = {
    foundation: `Practice ${questionCount} Easy ${rd.entry.label} questions on College Board QB. Understand the concept behind every error — log each in your Error Log with the correct approach.`,
    skill:      `Complete ${questionCount} ${difficulty} ${rd.entry.label} questions. Pace yourself at ~1:30/question. Identify recurring error patterns and update your Error Log.`,
    advanced:   `${questionCount} ${difficulty} ${rd.entry.label} questions under timed conditions. Target ${domainTarget}% accuracy on this domain. Review every error immediately after the set.`,
    strategy:   `Timed ${rd.entry.label} set — ${questionCount} Hard questions. Simulate test conditions. Goal: ${domainTarget}% accuracy on this domain. Log and mark mastered errors afterwards.`,
  }

  const replanningWeight = maxPriorityScore > 0
    ? Math.round((rd.priorityScore / maxPriorityScore) * 100) / 100
    : 0

  return {
    subject: rd.entry.subject,
    domainKey: rd.entry.key,
    domainLabel: rd.entry.label,
    skillFocus,
    durationMinutes,
    questionCount,
    difficulty,
    cbFilters: {
      domain: rd.entry.cbDomain,
      skill: skillFocus,
      difficulty,
    },
    description: descriptions[phase],
    priorityScore:        Math.max(1, Math.round((rd.priorityScore / maxPriorityScore) * 100)),
    masteryTarget:        domainTarget,
    estimatedScoreImpact: rd.potentialPoints,
    replanningWeight,
  }
}

function buildReviewBlocks(
  domainsStudiedThisWeek: RankedDomain[],
  phase: Phase,
  durationMinutes: number,
  maxPriorityScore: number,
): ReviewBlock[] {
  const minutesPerDomain = Math.floor(durationMinutes / Math.max(domainsStudiedThisWeek.length, 1))
  return domainsStudiedThisWeek.map(rd => {
    const difficulty = difficultyForSession(phase, rd.currentAccuracy)
    const skill = primarySkill(rd.entry, difficulty)
    const replanningWeight = maxPriorityScore > 0
      ? Math.round((rd.priorityScore / maxPriorityScore) * 100) / 100
      : 0
    const domainTarget = masteryTargetForDomain(rd.currentAccuracy)
    return {
      subject: rd.entry.subject,
      domainKey: rd.entry.key,
      domainLabel: rd.entry.label,
      durationMinutes: minutesPerDomain,
      questionCount: REVIEW_QUESTIONS_PER_DOMAIN,
      difficulty,
      cbFilters: { domain: rd.entry.cbDomain, skill, difficulty },
      description: `Review ${REVIEW_QUESTIONS_PER_DOMAIN} ${difficulty} ${rd.entry.label} questions. Focus on error types from this week's sessions. Target: ${domainTarget}% accuracy. Update mastery status in Error Log.`,
      priorityScore:        Math.max(1, Math.round((rd.priorityScore / maxPriorityScore) * 100)),
      masteryTarget:        domainTarget,
      estimatedScoreImpact: rd.potentialPoints,
      replanningWeight,
    }
  })
}

function buildPracticeTestBlock(testNumber: number): PracticeTestBlock {
  return {
    durationMinutes: PRACTICE_TEST_MINUTES,
    questionCount:   PRACTICE_TEST_QUESTIONS,
    testNumber,
    description:
      `Full-length Digital SAT simulation — ${PRACTICE_TEST_QUESTIONS} questions (44 Math + 54 Reading & Writing) under strict timed conditions. ` +
      `Use an official College Board Bluebook practice test. After finishing, log every error by domain in your Error Log before reviewing explanations.`,
    // Practice tests have fixed high priority — they are diagnostic milestones,
    // not domain-specific, so score impact is sentinel 0 (not additive with domain gains).
    priorityScore:        100,
    masteryTarget:        0,
    estimatedScoreImpact: 0,
    replanningWeight:     0.9,
  }
}

function buildTestDayBlock(): TestDayBlock {
  return {
    durationMinutes: 0,
    description:
      'Your SAT test day. Arrive at the test center early with a valid photo ID and your ' +
      'admission ticket. No additional prep needed — trust the work you have put in.',
    priorityScore: 0,
    masteryTarget: 0,
    estimatedScoreImpact: 0,
    replanningWeight: 0,
  }
}

// ─── Main Schedule Builder ────────────────────────────────────────────────────

export interface ScheduleResult {
  schedule: DaySchedule[]
  phases: PhaseSummary[]
  practiceTestCount: number
}

export function buildSchedule(
  input: StudyPlanEngineInput,
  ranked: RankedDomain[],
): ScheduleResult {
  const totalDays  = totalCalendarDays(input.testDate)
  const totalWeeks = Math.ceil(totalDays / 7)
  const practiceTestWeeks = practiceTestWeekSet(totalWeeks)
  const maxPriorityScore = ranked[0]?.priorityScore ?? 1
  const lastStudyDow = lastStudyDayOfWeek(input.daySchedule)
  // The day 2 calendar days before the test always gets a mandatory practice test
  const prePracticeTestDate = isoDate(addDays(new Date(input.testDate + 'T00:00:00'), -2))

  // Each study day is split evenly between R&W and Math.
  // 90% of each half goes to questions (enforced in dailyQuestionTarget).
  const halfMinutes = Math.floor(input.dailyStudyMinutes / 2)
  const halfBase    = dailyQuestionTarget(halfMinutes)

  // Separate domain pools for R&W and Math subjects
  const rwRanked   = ranked.filter(rd => rd.entry.subject === 'reading_writing')
  const mathRanked = ranked.filter(rd => rd.entry.subject === 'math')

  // Per-domain study count for skill progression (separate per subject)
  const rwDomainStudyCounters   = new Map<string, number>(rwRanked.map(rd => [rd.entry.key, 0]))
  const mathDomainStudyCounters = new Map<string, number>(mathRanked.map(rd => [rd.entry.key, 0]))

  // Track which domains were studied in the current review week
  let weekDomains: RankedDomain[] = []
  let currentWeek = 0
  let practiceTestCount = 0

  // Phase tracking for summary
  const phaseWeekRanges = new Map<Phase, { start: number; end: number }>()

  const schedule: DaySchedule[] = []
  // Independent pool indices for each subject — advances every study day
  let rwStudyDayGlobalIdx   = 0
  let mathStudyDayGlobalIdx = 0

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const date       = isoDate(addDays(new Date(), dayIdx))
    const dateObj    = addDays(new Date(), dayIdx)
    const dayOfWeek  = dateObj.getDay()           // 0=Sun … 6=Sat
    const weekNum    = Math.floor(dayIdx / 7) + 1 // 1-indexed
    const phase      = phaseForWeek(weekNum, totalWeeks)

    // Detect week boundary — reset tracking
    if (weekNum !== currentWeek) {
      currentWeek = weekNum
      weekDomains = []
      // Track phase ranges
      if (!phaseWeekRanges.has(phase)) {
        phaseWeekRanges.set(phase, { start: weekNum, end: weekNum })
      } else {
        phaseWeekRanges.get(phase)!.end = weekNum
      }
    }

    // 2 days before the test is always a practice test (bypasses biweekly rules)
    const dayType: DayType = date === prePracticeTestDate
      ? 'practice_test'
      : classifyDay(dayOfWeek, weekNum, practiceTestWeeks, lastStudyDow, input.daySchedule)

    if (dayType === 'rest') {
      schedule.push({
        date, dayOfWeek, dayType, weekNumber: weekNum, phase,
        blocks: [], totalDurationMinutes: 0, totalQuestions: 0,
      })
      continue
    }

    if (dayType === 'practice_test') {
      practiceTestCount++
      const block = buildPracticeTestBlock(practiceTestCount)
      schedule.push({
        date, dayOfWeek, dayType, weekNumber: weekNum, phase,
        blocks: [block],
        totalDurationMinutes: block.durationMinutes,
        totalQuestions:       block.questionCount,
      })
      continue
    }

    if (dayType === 'review') {
      // Review covers unique domains (R&W + Math) studied during the week
      const uniqueDomains = [...new Map(weekDomains.map(d => [d.entry.key, d])).values()]
      if (uniqueDomains.length === 0) {
        // Edge case: week started on Saturday (unlikely but guard it)
        schedule.push({
          date, dayOfWeek, dayType, weekNumber: weekNum, phase,
          blocks: [], totalDurationMinutes: 0, totalQuestions: 0,
        })
        continue
      }
      const reviewDuration = Math.min(input.dailyStudyMinutes, uniqueDomains.length * 12)
      const blocks = buildReviewBlocks(uniqueDomains, phase, reviewDuration, maxPriorityScore)
      schedule.push({
        date, dayOfWeek, dayType, weekNumber: weekNum, phase,
        blocks,
        totalDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
        totalQuestions:       blocks.reduce((s, b) => s + b.questionCount, 0),
      })
      continue
    }

    // ── Study day: one R&W block + one Math block ──────────────────────────
    // Each block gets half the daily minutes so total time equals dailyStudyMinutes.
    const macroCycle  = Math.floor((weekNum - 1) / 4)
    const studyBlocks: StudyBlock[] = []

    // R&W block
    if (rwRanked.length > 0) {
      const rwPool  = buildDomainPool(rwRanked, macroCycle)
      const rwRd    = rwPool[rwStudyDayGlobalIdx % rwPool.length]
      const rwCount = rwDomainStudyCounters.get(rwRd.entry.key) ?? 0
      const rwBlock = buildStudyBlock(
        rwRd, phase,
        halfMinutes, halfBase,
        weekNum, totalWeeks,
        rwCount,
        maxPriorityScore,
      )
      rwDomainStudyCounters.set(rwRd.entry.key, rwCount + 1)
      weekDomains.push(rwRd)
      studyBlocks.push(rwBlock)
    }
    rwStudyDayGlobalIdx++

    // Math block
    if (mathRanked.length > 0) {
      const mathPool  = buildDomainPool(mathRanked, macroCycle)
      const mathRd    = mathPool[mathStudyDayGlobalIdx % mathPool.length]
      const mathCount = mathDomainStudyCounters.get(mathRd.entry.key) ?? 0
      const mathBlock = buildStudyBlock(
        mathRd, phase,
        halfMinutes, halfBase,
        weekNum, totalWeeks,
        mathCount,
        maxPriorityScore,
      )
      mathDomainStudyCounters.set(mathRd.entry.key, mathCount + 1)
      weekDomains.push(mathRd)
      studyBlocks.push(mathBlock)
    }
    mathStudyDayGlobalIdx++

    schedule.push({
      date, dayOfWeek, dayType, weekNumber: weekNum, phase,
      blocks: studyBlocks,
      totalDurationMinutes: studyBlocks.reduce((s, b) => s + b.durationMinutes, 0),
      totalQuestions:       studyBlocks.reduce((s, b) => s + b.questionCount, 0),
    })
  }

  // Append the test date itself as a special test_day entry (not in the loop above)
  schedule.push({
    date: input.testDate,
    dayOfWeek: new Date(input.testDate + 'T00:00:00').getDay(),
    dayType: 'test_day',
    weekNumber: totalWeeks + 1,
    phase: 'strategy',
    blocks: [buildTestDayBlock()],
    totalDurationMinutes: 0,
    totalQuestions: 0,
  })

  // Build phase summaries
  const phases: PhaseSummary[] = []
  for (const [phase, { start, end }] of phaseWeekRanges) {
    const phaseDays = schedule.filter(
      d => d.weekNumber >= start && d.weekNumber <= end && d.dayType !== 'rest'
    ).length
    const dominantDiff = phase === 'foundation' ? 'easy'
      : phase === 'skill' ? 'medium'
      : 'hard'
    phases.push({
      phase,
      label: PHASE_LABELS[phase],
      startWeek: start,
      endWeek: end,
      totalDays: phaseDays,
      dominantDifficulty: dominantDiff,
    })
  }
  // Sort phases in natural order
  const phaseOrder: Phase[] = ['foundation', 'skill', 'advanced', 'strategy']
  phases.sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase))

  return { schedule, phases, practiceTestCount }
}
