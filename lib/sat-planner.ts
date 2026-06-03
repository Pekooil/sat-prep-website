// ─────────────────────────────────────────────────────────────────────────────
// SAT Deterministic Planning Engine
// Pure TypeScript — zero external dependencies.
// Replaces the OpenAI API with a data-driven algorithm that produces the
// identical output types (AIOnboardingRec, AIStudyPlan) the UI expects.
//
// Core algorithm:
//  1. Build a domain catalog with College Board QB filter metadata
//  2. Rank domains by "priority score" = accuracy gap × point leverage
//  3. Assign starting QB difficulty by current accuracy
//  4. Generate a week-by-week schedule with phase progression
//     (Foundation → Skill Building → Advanced Practice → Test Strategy)
//  5. Compute adaptive daily question targets from study time
// ─────────────────────────────────────────────────────────────────────────────

import type { AIOnboardingRec, AIStudyPlan, OnboardingAnalysis, OnboardingStep1Data } from '@/types'

// ─── Domain Catalog ──────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'foundation' | 'skill' | 'advanced' | 'strategy'

interface SkillEntry {
  label: string
  difficulty: Difficulty
}

interface DomainEntry {
  key: string
  label: string
  cbDomain: string            // Official College Board domain label for QB filter
  subject: 'math' | 'reading_writing'
  questionCount: number       // Approx questions on Digital SAT
  pointsPerQuestion: number   // Approx SAT points per additional correct answer
  skills: SkillEntry[]        // QB filter skill options, ordered easy → hard
}

// Points-per-question: each section spans 600 pts over its question pool
// Math  44 questions → 600/44 ≈ 13.6 pts
// R&W   54 questions → 600/54 ≈ 11.1 pts
const M = 13.6
const R = 11.1

const DOMAINS: DomainEntry[] = [
  // ── Reading & Writing ──────────────────────────────────────────────────
  {
    key: 'informationIdeas',
    label: 'Information and Ideas',
    cbDomain: 'Information and Ideas',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Central ideas and details',           difficulty: 'easy' },
      { label: 'Command of evidence (textual)',        difficulty: 'medium' },
      { label: 'Command of evidence (quantitative)',  difficulty: 'medium' },
      { label: 'Inferences',                          difficulty: 'hard' },
    ],
  },
  {
    key: 'craftStructure',
    label: 'Craft and Structure',
    cbDomain: 'Craft and Structure',
    subject: 'reading_writing',
    questionCount: 18,
    pointsPerQuestion: R,
    skills: [
      { label: 'Words in context',           difficulty: 'easy' },
      { label: 'Text structure and purpose', difficulty: 'medium' },
      { label: 'Cross-text connections',     difficulty: 'hard' },
    ],
  },
  {
    key: 'expressionIdeas',
    label: 'Expression of Ideas',
    cbDomain: 'Expression of Ideas',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Transitions',          difficulty: 'easy' },
      { label: 'Rhetorical synthesis', difficulty: 'medium' },
    ],
  },
  {
    key: 'standardEnglish',
    label: 'Standard English Conventions',
    cbDomain: 'Standard English Conventions',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Boundaries',               difficulty: 'easy' },
      { label: 'Form, structure, and sense', difficulty: 'medium' },
    ],
  },
  // ── Math ──────────────────────────────────────────────────────────────
  {
    key: 'algebra',
    label: 'Algebra',
    cbDomain: 'Algebra',
    subject: 'math',
    questionCount: 13,
    pointsPerQuestion: M,
    skills: [
      { label: 'Linear equations in one variable',  difficulty: 'easy' },
      { label: 'Linear equations in two variables', difficulty: 'easy' },
      { label: 'Linear functions',                  difficulty: 'medium' },
      { label: 'Systems of linear equations',       difficulty: 'medium' },
      { label: 'Linear inequalities',               difficulty: 'hard' },
    ],
  },
  {
    key: 'advancedMath',
    label: 'Advanced Math',
    cbDomain: 'Advanced Math',
    subject: 'math',
    questionCount: 13,
    pointsPerQuestion: M,
    skills: [
      { label: 'Equivalent expressions',               difficulty: 'easy' },
      { label: 'Nonlinear equations in one variable',  difficulty: 'medium' },
      { label: 'Systems of equations',                 difficulty: 'medium' },
      { label: 'Nonlinear functions',                  difficulty: 'hard' },
    ],
  },
  {
    key: 'problemSolving',
    label: 'Problem-Solving and Data Analysis',
    cbDomain: 'Problem-Solving and Data Analysis',
    subject: 'math',
    questionCount: 9,
    pointsPerQuestion: M,
    skills: [
      { label: 'Ratios, rates, and proportional relationships', difficulty: 'easy' },
      { label: 'Percentages',                                    difficulty: 'easy' },
      { label: 'Two-variable data: models and scatterplots',     difficulty: 'medium' },
      { label: 'Probability and conditional probability',        difficulty: 'medium' },
      { label: 'Evaluating statistical claims',                  difficulty: 'hard' },
    ],
  },
  {
    key: 'geometry',
    label: 'Geometry and Trigonometry',
    cbDomain: 'Geometry and Trigonometry',
    subject: 'math',
    questionCount: 6,
    pointsPerQuestion: M,
    skills: [
      { label: 'Area and volume',                   difficulty: 'easy' },
      { label: 'Lines, angles, and triangles',      difficulty: 'easy' },
      { label: 'Right triangles and trigonometry',  difficulty: 'medium' },
      { label: 'Circles',                           difficulty: 'hard' },
    ],
  },
]

// Map from constants.ts domain "value" strings → internal domain keys
const CONST_TO_KEY: Record<string, string> = {
  algebra:            'algebra',
  advanced_math:      'advancedMath',
  problem_solving:    'problemSolving',
  geometry:           'geometry',
  information_ideas:  'informationIdeas',
  craft_structure:    'craftStructure',
  expression_ideas:   'expressionIdeas',
  standard_english:   'standardEnglish',
}

// ─── Internal Ranked Domain ───────────────────────────────────────────────────

interface RankedDomain {
  entry: DomainEntry
  currentAccuracy: number  // 0–100, defaults to 50 if no data
  targetAccuracy: number   // 0–100, derived from targetScore
  priorityScore: number    // accuracy gap × leverage — the core ranking signal
  potentialPoints: number  // max SAT points available from this domain
  hasData: boolean
}

// ─── Scoring Model ────────────────────────────────────────────────────────────

/**
 * Estimate the accuracy a student needs in one section to hit their target total.
 * Assumes scores split ~50/50 between Math and R&W, capped at realistic 95%.
 */
function targetAccuracyForScore(targetScore: number): number {
  const sectionTarget = targetScore / 2  // equal split estimate
  const acc = ((Math.max(200, Math.min(800, sectionTarget)) - 200) / 600) * 100
  return Math.max(55, Math.min(95, Math.round(acc)))
}

/**
 * Rank all 8 domains by priority score = (targetAccuracy - currentAccuracy) × leverage.
 * Domains with no data get accuracy = 50 (treated as neutral).
 */
function rankDomains(
  accuracies: Map<string, number>,
  targetScore: number,
): RankedDomain[] {
  const targetAcc = targetAccuracyForScore(targetScore)

  return DOMAINS.map(entry => {
    const hasData = accuracies.has(entry.key)
    const currentAccuracy = hasData ? accuracies.get(entry.key)! : 50
    const leverage = entry.questionCount * entry.pointsPerQuestion
    const gap = Math.max(0, targetAcc - currentAccuracy)
    const priorityScore = gap * leverage
    const potentialPoints = Math.round(gap / 100 * entry.questionCount * entry.pointsPerQuestion)

    return {
      entry,
      currentAccuracy,
      targetAccuracy: targetAcc,
      priorityScore,
      potentialPoints,
      hasData,
    }
  }).sort((a, b) => b.priorityScore - a.priorityScore)
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function daysUntilTest(testDate: string): number {
  return Math.max(7, Math.ceil(
    (new Date(testDate).getTime() - Date.now()) / 86_400_000,
  ))
}

/** SAT questions average ~1.2 min. Cap range: 10–80 questions/day. */
function dailyQuestionTarget(minutes: number): number {
  return Math.max(10, Math.min(80, Math.floor(minutes / 1.2)))
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ─── Phase & Difficulty Logic ─────────────────────────────────────────────────

function phaseFor(weekNum: number, totalWeeks: number): Phase {
  const pct = weekNum / totalWeeks
  if (pct <= 0.25) return 'foundation'
  if (pct <= 0.65) return 'skill'
  if (pct <= 0.88) return 'advanced'
  return 'strategy'
}

const PHASE_THEME: Record<Phase, string> = {
  foundation: 'Foundation Building',
  skill:      'Skill Development',
  advanced:   'Advanced Practice',
  strategy:   'Test Strategy',
}

/**
 * Starting difficulty is set by current accuracy:
 *  <55 % → easy   (core concepts not solid)
 *  55–72% → medium (ready to push)
 *  >72%   → hard   (strong base, target highest-yield questions)
 * Phase then raises the floor: advanced/strategy never go below medium.
 */
function difficultyForPhaseAndAccuracy(phase: Phase, accuracy: number): Difficulty {
  if (phase === 'foundation') return 'easy'
  if (phase === 'strategy')   return 'hard'
  if (phase === 'advanced')   return accuracy < 70 ? 'medium' : 'hard'
  // skill phase:
  return accuracy < 58 ? 'easy' : 'medium'
}

function skillForDifficulty(domain: DomainEntry, diff: Difficulty): string {
  const match = domain.skills.find(s => s.difficulty === diff)
  return match?.label ?? domain.skills[0].label
}

// ─── Task Description Templates ───────────────────────────────────────────────

function taskDescription(
  domain: DomainEntry,
  phase: Phase,
  diff: Difficulty,
  n: number,
  targetAcc: number,
): string {
  switch (phase) {
    case 'foundation':
      return (
        `Practice ${n} ${diff} ${domain.label} questions from the College Board QB. ` +
        `Aim to understand the underlying concept for every error — ` +
        `log each mistake with the correct approach in your Error Log.`
      )
    case 'skill':
      return (
        `Work through ${n} ${diff} ${domain.label} questions. ` +
        `Time yourself (~1:30 per question) and identify recurring error patterns. ` +
        `Update your Error Log after every session.`
      )
    case 'advanced':
      return (
        `Complete ${n} ${diff} ${domain.label} questions under timed conditions. ` +
        `Target ${targetAcc}% accuracy before advancing to the next difficulty tier. ` +
        `Review every error immediately and update mastery status.`
      )
    case 'strategy':
      return (
        `Timed ${domain.label} set — ${n} questions at ${diff} difficulty. ` +
        `Simulate real test conditions. Goal: ${targetAcc}% accuracy. ` +
        `After completing, mark mastered errors in the Error Log.`
      )
  }
}

// ─── Weekly Schedule Builder ──────────────────────────────────────────────────

const STUDY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function buildSchedule(
  ranked: RankedDomain[],
  totalWeeks: number,
  studyDays: number,
  dailyMins: number,
): AIStudyPlan['weeks'] {
  const baseQuestions = dailyQuestionTarget(dailyMins)
  // Use up to 5 priority domains; if fewer exist use all
  const pool = ranked.slice(0, Math.min(5, ranked.length))
  // Use 5 days/wk normally; 6 days when fewer than 60 days remain (crunch mode)
  const activeDays = (studyDays <= 60 ? STUDY_DAYS : STUDY_DAYS.slice(0, 5)) as readonly string[]
  const today = new Date()

  return Array.from({ length: totalWeeks }, (_, wi) => {
    const weekNum = wi + 1
    const phase = phaseFor(weekNum, totalWeeks)
    const weekStart = addDays(today, wi * 7)
    const weekEnd = addDays(weekStart, 6)

    // Questions ramp up slightly each week: 80 % → 120 % of base
    const weekQuestions = Math.round(baseQuestions * (0.8 + (weekNum / totalWeeks) * 0.4))

    const tasks: AIStudyPlan['weeks'][0]['tasks'] = activeDays.map((day, di) => {
      // Saturdays always revisit the highest-priority (weakest) domain
      const rd = day === 'Saturday' ? pool[0] : pool[di % pool.length]
      const diff = difficultyForPhaseAndAccuracy(phase, rd.currentAccuracy)
      const skill = skillForDifficulty(rd.entry, diff)
      const targetAcc = Math.round(rd.targetAccuracy)
      const mins = day === 'Saturday' ? Math.min(dailyMins * 1.5, 120) : dailyMins

      return {
        day,
        subject: rd.entry.subject,
        category: rd.entry.label,
        durationMinutes: Math.round(mins),
        description: taskDescription(rd.entry, phase, diff, weekQuestions, targetAcc),
        collegeBoardFilters: {
          domain: rd.entry.cbDomain,
          skill,
          difficulty: diff,
        },
      }
    })

    return {
      weekNumber: weekNum,
      startDate: isoDate(weekStart),
      endDate: isoDate(weekEnd),
      theme: PHASE_THEME[phase],
      tasks,
    }
  })
}

// ─── Study Tips (Adaptive) ────────────────────────────────────────────────────

function buildStudyTips(
  currentScore: number,
  targetScore: number,
  studyDays: number,
  dailyMins: number,
  ranked: RankedDomain[],
): string[] {
  const gap = targetScore - currentScore
  const top2Labels = ranked.slice(0, 2).map(r => r.entry.label).join(' and ')
  const tips: string[] = []

  // Tip 1 — always use official QB (non-negotiable)
  tips.push(
    'Practice exclusively from the College Board Question Bank — it is the only source that exactly mirrors the real test\'s difficulty curve, question style, and scoring. Third-party materials train the wrong patterns.'
  )

  // Tip 2 — error log is compounding ROI
  tips.push(
    'After every practice session, open the Error Log and record each mistake with your incorrect reasoning AND the correct approach. Students who do this consistently improve at 2× the rate of those who skip error review.'
  )

  // Tip 3 — adapted to timeline
  if (studyDays < 45) {
    tips.push(
      `With only ${studyDays} days until your test, ruthlessly prioritize. Focus all of your energy on ${top2Labels} — do not touch any other domain. Concentrated effort on your biggest weaknesses beats scattered improvement every time.`
    )
  } else if (gap > 200) {
    tips.push(
      `A ${gap}-point gap requires iron-clad daily consistency. Missing even 3 sessions a week compounds into weeks of lost progress. Treat your ${dailyMins}-minute daily study block as non-negotiable — set a phone alarm and protect it.`
    )
  } else {
    tips.push(
      `Build accuracy before speed. On every new domain, stay on Easy QB questions until you consistently hit 80% accuracy before moving to Medium. Rushing difficulty locks in bad habits that are hard to unlearn.`
    )
  }

  // Tip 4 — adapted to score band
  if (currentScore >= 1300) {
    tips.push(
      'At your score level, Hard questions determine your final placement. Spend at least 60% of each session on hard difficulty — every additional hard question you master translates directly to the highest point gains.'
    )
  } else if (currentScore < 1100) {
    tips.push(
      'Start every new domain on Easy difficulty until you hit 80% accuracy reliably. A solid foundation now makes Medium and Hard questions dramatically easier in weeks 4–6. Don\'t rush the difficulty ladder.'
    )
  } else {
    tips.push(
      `Complete one full timed College Board practice section per week (available on their site). Timed stamina is a trainable skill, and students who do weekly timed sets score 30–50 points higher on test day than those who only do untimed practice.`
    )
  }

  return tips
}

// ─── Message Generator ────────────────────────────────────────────────────────

function buildMessage(
  currentScore: number,
  targetScore: number,
  studyDays: number,
  topDomainLabel: string | null,
): string {
  const gap = targetScore - currentScore
  const weeks = Math.ceil(studyDays / 7)
  const focus = topDomainLabel ? `, starting with ${topDomainLabel}` : ''

  if (gap <= 80) {
    return `You're only ${gap} points away from your goal — ${weeks} weeks of focused daily practice${focus} is all it takes. Stay consistent and this score is yours.`
  }
  if (gap <= 150) {
    return `A ${gap}-point improvement in ${weeks} weeks is very achievable${focus}. Your plan targets the exact domains where every hour of practice moves the needle most.`
  }
  if (gap <= 250) {
    return `${gap} points in ${weeks} weeks is a real challenge — and the plan below is calibrated precisely to get you there${focus}. Commit to every session and you'll see major gains by week 4.`
  }
  return `${gap} points in ${weeks} weeks is ambitious and requires daily discipline${focus}. This plan prioritizes your highest-leverage weaknesses in order — follow it precisely and the improvement compounds fast.`
}

// ─── Weekly Plan Summary ──────────────────────────────────────────────────────

function buildWeeklyPlanSummary(
  totalWeeks: number,
  ranked: RankedDomain[],
  dailyMins: number,
): string {
  const top2 = ranked.slice(0, 2).map(r => r.entry.label)
  const questions = dailyQuestionTarget(dailyMins)
  const fWeeks = Math.max(1, Math.round(totalWeeks * 0.25))
  const sWeeks = Math.max(1, Math.round(totalWeeks * 0.40))
  const aWeeks = totalWeeks - fWeeks - sWeeks

  return (
    `Weeks 1–${fWeeks} build foundations in ${top2.join(' and ')} using Easy-difficulty QB questions (~${questions}/day). ` +
    `Weeks ${fWeeks + 1}–${fWeeks + sWeeks} develop skills at Medium difficulty across all priority domains as accuracy surpasses 70%. ` +
    `The final ${aWeeks} week${aWeeks !== 1 ? 's' : ''} shift to Hard questions and timed full-section practice to lock in gains under real test pressure.`
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PlannerInput {
  currentScore: number
  targetScore: number
  testDate: string            // ISO date string
  dailyStudyMinutes: number
  accuracyByDomainKey?: Map<string, number>  // domain key → accuracy 0–100
}

export interface StudyPlanInput {
  currentScore: number
  targetScore: number
  testDate: string
  hoursPerWeek: number
  weakAreaKeys: string[]  // constants.ts domain value strings OR internal keys
}

/**
 * generateRecommendations
 * Returns an AIOnboardingRec — identical shape to what the OpenAI call used to return.
 * Called from the onboarding Step 4 action.
 */
export function generateRecommendations(
  input: PlannerInput,
  analysis?: OnboardingAnalysis,
): AIOnboardingRec {
  const studyDays = daysUntilTest(input.testDate)
  const totalWeeks = Math.min(Math.ceil(studyDays / 7), 12)

  // Build accuracy map from analysis domains or explicit input
  const accuracies = new Map<string, number>()
  if (analysis) {
    for (const d of analysis.domains) {
      if (d.attempted > 0) accuracies.set(d.key, d.accuracy)
    }
  }
  input.accuracyByDomainKey?.forEach((acc, key) => accuracies.set(key, acc))

  const ranked = rankDomains(accuracies, input.targetScore)
  const topLabel = ranked[0]?.entry.label ?? null

  // Priority topics — top 4 by priority score
  const priorityTopics: AIOnboardingRec['priorityTopics'] = ranked.slice(0, 4).map((rd, i) => {
    const diff: Difficulty =
      rd.currentAccuracy < 55 ? 'easy' :
      rd.currentAccuracy < 72 ? 'medium' : 'hard'
    const skill = skillForDifficulty(rd.entry, diff)
    const q = dailyQuestionTarget(input.dailyStudyMinutes)

    const reasons = [
      `At ${rd.currentAccuracy}% accuracy, this is your highest-leverage domain — closing the gap to ${rd.targetAccuracy}% is worth ~${rd.potentialPoints} points.`,
      `This domain ranks #${i + 1} by priority score: ${rd.entry.questionCount} questions × ${rd.potentialPoints} available points make it essential.`,
      `You're ${Math.round(rd.targetAccuracy - rd.currentAccuracy)} percentage points below target accuracy here — the largest gap in your ${rd.entry.subject === 'math' ? 'Math' : 'R&W'} section.`,
      `With ${rd.entry.questionCount} questions allocated to this domain on the SAT, a ${Math.round(rd.targetAccuracy - rd.currentAccuracy)}-point accuracy gain here translates directly to your score.`,
    ]

    const weeklyGoals = [
      `Complete ${q * 5} ${diff} questions this week; log all errors and master "${skill}".`,
      `Hit 70%+ accuracy on ${diff} "${skill}" questions before the week ends.`,
      `Practice ${diff} ${rd.entry.label} questions daily; review every error with the correct approach.`,
      `Finish 3 full ${rd.entry.label} QB sets this week and mark mastered errors.`,
    ]

    return {
      domain: rd.entry.label,
      subject: rd.entry.subject === 'math' ? 'Math' : 'Reading & Writing',
      reason: reasons[i % reasons.length],
      weeklyGoal: weeklyGoals[i % weeklyGoals.length],
      cbFilters: { domain: rd.entry.cbDomain, skill, difficulty: diff },
    }
  })

  return {
    message: buildMessage(input.currentScore, input.targetScore, studyDays, topLabel),
    priorityTopics,
    studyTips: buildStudyTips(input.currentScore, input.targetScore, studyDays, input.dailyStudyMinutes, ranked),
    estimatedTimelineWeeks: totalWeeks,
    weeklyPlanSummary: buildWeeklyPlanSummary(totalWeeks, ranked, input.dailyStudyMinutes),
  }
}

/**
 * generateStudyPlan
 * Returns an AIStudyPlan — identical shape to the OpenAI study plan output.
 * Called from the Home page AI Planner trigger action.
 */
export function generateStudyPlan(input: StudyPlanInput): AIStudyPlan {
  const studyDays = daysUntilTest(input.testDate)
  const totalWeeks = Math.min(Math.ceil(studyDays / 7), 12)
  // Distribute hours across 6 days/week
  const dailyMins = Math.round((input.hoursPerWeek * 60) / 6)
  const gap = input.targetScore - input.currentScore

  // Seed accuracy map: known-weak areas get 40 %, all others default to 62 %
  const accuracies = new Map<string, number>()
  DOMAINS.forEach(d => accuracies.set(d.key, 62))
  for (const area of input.weakAreaKeys) {
    const key = CONST_TO_KEY[area] ?? area
    if (DOMAINS.some(d => d.key === key)) accuracies.set(key, 40)
  }

  const ranked = rankDomains(accuracies, input.targetScore)
  const top2 = ranked.slice(0, 2).map(r => r.entry.label).join(' and ')
  const q = dailyQuestionTarget(dailyMins)

  const title = `${totalWeeks}-Week SAT Study Plan — Target ${input.targetScore}`
  const overallStrategy =
    `Prioritize ${top2} for the highest score impact. ` +
    `Progress from Easy to Hard difficulty over ${totalWeeks} weeks (~${q} questions/day, ${input.hoursPerWeek} hrs/week). ` +
    (gap > 200
      ? 'Daily consistency is non-negotiable at this score gap — every missed session costs compound progress.'
      : 'Track accuracy weekly; move to the next difficulty tier once you sustain 80%+ on the current one.')

  return {
    title,
    totalWeeks,
    overallStrategy,
    weeks: buildSchedule(ranked, totalWeeks, studyDays, dailyMins),
  }
}
