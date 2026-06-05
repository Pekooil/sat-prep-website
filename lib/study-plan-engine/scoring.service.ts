// ─────────────────────────────────────────────────────────────────────────────
// ScoringService
// Pure functions for ranking domains by study priority and estimating
// score improvements. No external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import { DOMAIN_CATALOG } from './domain-catalog'
import type { RankedDomain, TopicPerformance } from './types'

// ─── Target Accuracy ─────────────────────────────────────────────────────────

/**
 * Estimate the section accuracy a student needs to reach their target score.
 *
 * Model: sections split ~50/50, accuracy = (sectionTarget − 200) / 600.
 * Clamped to 55–95 % — below 55 % the student likely needs more time.
 */
export function targetAccuracyForScore(targetScore: number): number {
  const sectionTarget = Math.max(200, Math.min(800, targetScore / 2))
  const raw = ((sectionTarget - 200) / 600) * 100
  return Math.max(55, Math.min(95, Math.round(raw)))
}

/**
 * Estimate per-section score from a composite score.
 * Returns [mathScore, rwScore] as integers.
 */
export function estimateSectionScores(totalScore: number): [number, number] {
  const half = Math.round(totalScore / 2 / 10) * 10   // round to nearest 10
  return [half, totalScore - half]
}

// ─── Domain Ranking ───────────────────────────────────────────────────────────

/**
 * Rank all 8 domains by priority score:
 *   priority = (targetAccuracy − currentAccuracy) × questionCount × pointsPerQuestion
 *
 * Domains with no performance data are assigned a neutral 50 % accuracy,
 * so they still appear in the plan but with lower priority than genuinely weak domains.
 */
export function rankDomains(
  performance: TopicPerformance[],
  targetScore: number,
): RankedDomain[] {
  const perfMap = new Map<string, number>(
    performance.map(p => [p.domainKey, p.accuracy])
  )
  const targetAcc = targetAccuracyForScore(targetScore)

  return DOMAIN_CATALOG
    .map(entry => {
      const hasData      = perfMap.has(entry.key)
      const currentAccuracy = hasData ? perfMap.get(entry.key)! : 50
      const gap          = Math.max(0, targetAcc - currentAccuracy)
      const leverage     = entry.questionCount * entry.pointsPerQuestion
      const priorityScore = gap * leverage
      const potentialPoints = Math.round(gap / 100 * leverage)

      return { entry, currentAccuracy, targetAccuracy: targetAcc, priorityScore, potentialPoints, hasData }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
}

// ─── Improvement Estimate ────────────────────────────────────────────────────

/**
 * Estimate the total score gain if the student reaches their target accuracy
 * on their top N weakest domains.
 */
export function estimateScoreGain(ranked: RankedDomain[], topN = 4): number {
  return ranked.slice(0, topN).reduce((sum, rd) => sum + rd.potentialPoints, 0)
}

// ─── Per-Domain Mastery Target ───────────────────────────────────────────────

/**
 * Compute the per-domain mastery target based on the student's current accuracy.
 *
 * Sets a progressive, achievable goal rather than a flat 90 % for every domain.
 * Weaker domains get a near-term step-up target; stronger domains are pushed
 * toward peak performance.
 *
 *   < 45 %  accuracy → 60 %  (Entry Goal — first meaningful milestone)
 *   45–59 % accuracy → 70 %  (Step-Up Goal — from struggling to developing)
 *   60–74 % accuracy → 80 %  (Stretch Goal — solid progress toward proficiency)
 *   75–84 % accuracy → 88 %  (Near-Mastery — one push from the top tier)
 *   85 %+   accuracy → 92 %  (Peak Target — maintain and refine)
 */
export function masteryTargetForDomain(currentAccuracy: number): number {
  if (currentAccuracy < 45) return 60
  if (currentAccuracy < 60) return 70
  if (currentAccuracy < 75) return 80
  if (currentAccuracy < 85) return 88
  return 92
}

// ─── Daily Question Target ────────────────────────────────────────────────────

/**
 * Compute how many questions fit in a study session.
 *
 * Average pace:  ~1.25 min/question (blend of Math ~1.5 and R&W ~1.0).
 * 80 % efficiency factor accounts for reading instructions, error logging.
 * Hard bounds: 10–80 questions.
 */
export function dailyQuestionTarget(minutes: number): number {
  return Math.max(10, Math.min(80, Math.floor((minutes * 0.80) / 1.25)))
}
