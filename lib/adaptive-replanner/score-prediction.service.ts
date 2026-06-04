// ─────────────────────────────────────────────────────────────────────────────
// Score Prediction Service
//
// Computes a predicted SAT score and confidence interval from:
//   - baseline score (current_score from users table)
//   - topic mastery scores (weighted by domain leverage)
//   - study consistency (recent sessions / expected pace)
//   - session count (determines confidence interval width)
//
// Confidence interval width:
//   < 5 sessions  → ±100
//   5–19          → ±70
//   20–49         → ±50
//   50+           → ±30
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TopicMasteryScore } from './topic-mastery.service'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'

type Supabase = SupabaseClient<Database>

export interface ScorePrediction {
  predictedScore: number
  confidenceLow: number
  confidenceHigh: number
  baselineScore: number
  consistencyFactor: number
  sessionCount: number
}

export async function computeScorePrediction(
  supabase: Supabase,
  userId: string,
  currentScore: number,
  mastery: TopicMasteryScore[],
): Promise<ScorePrediction> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().split('T')[0]

  const [allSessionsResult, recentSessionsResult] = await Promise.all([
    (supabase.from('question_sessions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    (supabase.from('question_sessions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('session_date', fourteenDaysAgo),
  ])

  const sessionCount  = allSessionsResult.count ?? 0
  const recentCount   = recentSessionsResult.count ?? 0

  // Consistency: recent sessions / expected pace (10 sessions per 14 days)
  const consistencyFactor = Math.min(1.0, recentCount / 10)

  // Mastery-weighted potential gain per domain
  const masteryByKey = new Map(mastery.map(m => [m.domainKey, m.masteryScore]))

  let masteryGain = 0
  for (const domain of DOMAIN_CATALOG) {
    const masteryScore = masteryByKey.get(domain.key) ?? 50
    const leverage     = domain.questionCount * domain.pointsPerQuestion
    // Conservative: mastery/100 of potential realized, scaled to realistic range
    masteryGain += (masteryScore / 100) * leverage * 0.4
  }

  const adjustedGain  = Math.round(masteryGain * consistencyFactor)
  const predictedScore = Math.max(currentScore, Math.min(1600, currentScore + adjustedGain))

  // Confidence interval width shrinks as data quality improves
  const ciWidth = sessionCount < 5  ? 100
    : sessionCount < 20 ? 70
    : sessionCount < 50 ? 50
    : 30

  return {
    predictedScore,
    confidenceLow:  Math.max(400,  predictedScore - ciWidth),
    confidenceHigh: Math.min(1600, predictedScore + ciWidth),
    baselineScore:  currentScore,
    consistencyFactor,
    sessionCount,
  }
}

export async function saveScorePrediction(
  supabase: Supabase,
  userId: string,
  prediction: ScorePrediction,
  masterySnapshot: TopicMasteryScore[],
): Promise<string | null> {
  const { data } = await (supabase.from('score_predictions') as any)
    .insert({
      user_id:           userId,
      predicted_score:   prediction.predictedScore,
      confidence_low:    prediction.confidenceLow,
      confidence_high:   prediction.confidenceHigh,
      baseline_score:    prediction.baselineScore,
      consistency_factor: prediction.consistencyFactor,
      session_count:     prediction.sessionCount,
      mastery_snapshot:  masterySnapshot.map(m => ({
        key:   m.domainKey,
        label: m.domainLabel,
        score: m.masteryScore,
        level: m.masteryLevel,
      })),
    })
    .select('id')
    .single()

  return data?.id ?? null
}
