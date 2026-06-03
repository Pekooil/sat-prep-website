// ─────────────────────────────────────────────────────────────────────────────
// SchedulerService
// Generates the complete day-by-day study schedule from plan start to test date.
//
// Day classification (repeating 7-day calendar):
//   Mon–Fri  → Study day (one priority domain per session)
//   Saturday → Review day (all domains studied that week, short sets)
//              OR Practice Test (every N weeks, see practiceTestWeeks)
//   Sunday   → Rest (no tasks)
//
// Domain rotation across study days:
//   A 7-slot pool: [rank0, rank1, rank2, rank3, rank4, rank0, rank1]
//   Mon gets rank0, Fri gets rank0 again → weakest domain gets 2 sessions/week.
//   The pool advances through all 8 domains over a 4-week cycle so lower-ranked
//   domains still receive attention.
//
// Skill advancement:
//   Each domain tracks how many sessions it has had (domainStudyCount).
//   This counter drives skillFocusForSession() to cycle through the skill list.
//
// Question count ramp:
//   Starts at 80 % of the daily target in week 1, reaches 120 % by the final
//   study week, building stamina progressively.
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
import { dailyQuestionTarget } from './scoring.service'
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
 * on Saturday instead of a review session.
 *
 * Strategy:
 *  < 3 weeks  → no full tests (not enough time to prepare)
 *  3–6 weeks  → week 2 and second-to-last week
 *  7–16 weeks → every 3rd week
 *  > 16 weeks → every 4th week, plus every 2nd week in the final quarter
 */
function practiceTestWeekSet(totalWeeks: number): Set<number> {
  const weeks = new Set<number>()
  if (totalWeeks < 3) return weeks

  if (totalWeeks <= 6) {
    weeks.add(2)
    if (totalWeeks > 3) weeks.add(totalWeeks - 1)
    return weeks
  }

  const interval = totalWeeks <= 16 ? 3 : 4
  for (let w = interval; w <= totalWeeks - 1; w += interval) weeks.add(w)

  // Double frequency in the last quarter
  const quarterStart = Math.floor(totalWeeks * 0.75)
  for (let w = quarterStart; w <= totalWeeks - 1; w += 2) weeks.add(w)

  return weeks
}

// ─── Day Classification ───────────────────────────────────────────────────────

/** Map a calendar day to its DayType. */
function classifyDay(
  dayOfWeek: number,
  weekNum: number,
  practiceTestWeeks: Set<number>,
): DayType {
  if (dayOfWeek === 0) return 'rest'
  if (dayOfWeek === 6) return practiceTestWeeks.has(weekNum) ? 'practice_test' : 'review'
  return 'study'
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

  const descriptions: Record<Phase, string> = {
    foundation: `Practice ${questionCount} Easy ${rd.entry.label} questions on College Board QB. Understand the concept behind every error — log each in your Error Log with the correct approach.`,
    skill:      `Complete ${questionCount} ${difficulty} ${rd.entry.label} questions. Pace yourself at ~1:30/question. Identify recurring error patterns and update your Error Log.`,
    advanced:   `${questionCount} ${difficulty} ${rd.entry.label} questions under timed conditions. Target ${rd.targetAccuracy}% accuracy. Review every error immediately after the set.`,
    strategy:   `Timed ${rd.entry.label} set — ${questionCount} Hard questions. Simulate test conditions. Goal: ${rd.targetAccuracy}% accuracy. Log and mark mastered errors afterwards.`,
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
    priorityScore:        rd.priorityScore,
    masteryTarget:        rd.targetAccuracy,
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
    return {
      subject: rd.entry.subject,
      domainKey: rd.entry.key,
      domainLabel: rd.entry.label,
      durationMinutes: minutesPerDomain,
      questionCount: REVIEW_QUESTIONS_PER_DOMAIN,
      difficulty,
      cbFilters: { domain: rd.entry.cbDomain, skill, difficulty },
      description: `Review ${REVIEW_QUESTIONS_PER_DOMAIN} ${difficulty} ${rd.entry.label} questions. Focus on error types from this week's sessions. Update mastery status in Error Log.`,
      priorityScore:        rd.priorityScore,
      masteryTarget:        rd.targetAccuracy,
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
    priorityScore:        9999,
    masteryTarget:        0,
    estimatedScoreImpact: 0,
    replanningWeight:     0.9,
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
  const baseQuestions = dailyQuestionTarget(input.dailyStudyMinutes)
  const maxPriorityScore = ranked[0]?.priorityScore ?? 1

  // Track per-domain study count for skill progression
  const domainStudyCounters = new Map<string, number>(
    ranked.map(rd => [rd.entry.key, 0])
  )

  // Track which domains were studied in the current review week
  let weekDomains: RankedDomain[] = []
  let currentWeek = 0
  let practiceTestCount = 0

  // Phase tracking for summary
  const phaseWeekRanges = new Map<Phase, { start: number; end: number }>()

  const schedule: DaySchedule[] = []

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

    const dayType = classifyDay(dayOfWeek, weekNum, practiceTestWeeks)

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
      // Review covers unique domains studied Mon–Fri this week
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

    // ── Study day ──────────────────────────────────────────────────────────
    // Study-day-of-week index: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
    const studyDayIdx = dayOfWeek - 1   // Mon=1→0, Fri=5→4
    const macroCycle  = Math.floor((weekNum - 1) / 4)
    const pool        = buildDomainPool(ranked, macroCycle)
    const rd          = pool[studyDayIdx % pool.length]

    const studyCount = domainStudyCounters.get(rd.entry.key) ?? 0
    const block = buildStudyBlock(
      rd, phase,
      input.dailyStudyMinutes,
      baseQuestions,
      weekNum, totalWeeks,
      studyCount,
      maxPriorityScore,
    )
    domainStudyCounters.set(rd.entry.key, studyCount + 1)
    weekDomains.push(rd)

    schedule.push({
      date, dayOfWeek, dayType, weekNumber: weekNum, phase,
      blocks: [block],
      totalDurationMinutes: block.durationMinutes,
      totalQuestions:       block.questionCount,
    })
  }

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
