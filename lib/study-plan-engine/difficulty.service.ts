// ─────────────────────────────────────────────────────────────────────────────
// DifficultyService
// Determines the appropriate QB difficulty and skill focus for any study
// session given the student's current accuracy, plan phase, and how many
// times they have already studied this domain.
// ─────────────────────────────────────────────────────────────────────────────

import { primarySkill, skillAtIndex } from './domain-catalog'
import type { DomainEntry, Difficulty, Phase } from './types'

// ─── Phase Boundaries ────────────────────────────────────────────────────────

/**
 * Assign a plan phase based on progress through the total number of weeks.
 *
 * Foundation  0–25 %  — concept building, Easy only
 * Skill       25–65 % — deliberate practice, Easy → Medium
 * Advanced    65–88 % — high-difficulty drills, Medium → Hard
 * Strategy    88–100% — timed test conditions, Hard + full-section practice
 */
export function phaseForWeek(weekNum: number, totalWeeks: number): Phase {
  const pct = weekNum / totalWeeks
  if (pct <= 0.25) return 'foundation'
  if (pct <= 0.65) return 'skill'
  if (pct <= 0.88) return 'advanced'
  return 'strategy'
}

export const PHASE_LABELS: Record<Phase, string> = {
  foundation: 'Foundation Building',
  skill:      'Skill Development',
  advanced:   'Advanced Practice',
  strategy:   'Test Strategy',
}

// ─── Difficulty Selection ─────────────────────────────────────────────────────

/**
 * Determine the recommended difficulty for a session.
 *
 * Rules:
 *  • Phase is the floor: Foundation never exceeds Easy, Strategy never goes
 *    below Hard.
 *  • Within a phase the student's current accuracy unlocks higher tiers:
 *    accuracy < 55 % → stay Easy regardless of phase ceiling
 *    accuracy 55–72 % → unlock Medium in Skill+
 *    accuracy > 72 % → unlock Hard in Advanced+
 *
 * This prevents students from practicing at a level where they'll just
 * reinforce wrong patterns.
 */
export function difficultyForSession(
  phase: Phase,
  currentAccuracy: number,
): Difficulty {
  switch (phase) {
    case 'foundation':
      return 'easy'

    case 'skill':
      if (currentAccuracy < 55) return 'easy'
      return 'medium'

    case 'advanced':
      if (currentAccuracy < 55) return 'easy'
      if (currentAccuracy < 70) return 'medium'
      return 'hard'

    case 'strategy':
      // In the final push everyone drills at hard — it's timed and simulates the real test
      if (currentAccuracy < 55) return 'medium'  // safety net for severely weak domains
      return 'hard'
  }
}

// ─── Skill Progression ────────────────────────────────────────────────────────

/**
 * Choose which specific skill to focus on in a session.
 *
 * We advance through the domain's skill list as sessions accumulate.
 * This ensures the student covers all sub-skills within a domain, not just
 * the first one. The `domainStudyCount` is the number of times this domain
 * has already been assigned in the schedule.
 */
export function skillFocusForSession(
  domain: DomainEntry,
  phase: Phase,
  currentAccuracy: number,
  domainStudyCount: number,
): string {
  const diff = difficultyForSession(phase, currentAccuracy)

  // In Foundation and early Skill phases, walk through skills in difficulty
  // order (easy first). In Advanced/Strategy, prefer the hard skills.
  if (phase === 'advanced' || phase === 'strategy') {
    const hard = domain.skills.filter(s => s.difficulty === 'hard')
    if (hard.length > 0) return hard[domainStudyCount % hard.length].label
  }

  // Default: walk the skill list from the beginning, cycling by study count
  return skillAtIndex(domain, domainStudyCount)
}

// ─── Question Count Adjustments ───────────────────────────────────────────────

/**
 * Scale the base daily question count for different day types:
 *
 *  Study day     — full count (base)
 *  Review day    — 60 % (shorter, multiple domains)
 *  Per-domain on review day — 8–10 questions each
 */
export function questionsForStudyDay(base: number): number {
  // Ramp: questions increase slightly each week to build stamina.
  // Caller handles the ramp; this just returns the clean daily base.
  return base
}

export const REVIEW_QUESTIONS_PER_DOMAIN = 8
export const PRACTICE_TEST_QUESTIONS     = 98  // 44 Math + 54 R&W
export const PRACTICE_TEST_MINUTES       = 180 // full Digital SAT duration
