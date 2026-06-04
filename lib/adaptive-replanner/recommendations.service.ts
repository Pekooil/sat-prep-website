// ─────────────────────────────────────────────────────────────────────────────
// AI Recommendations Service
//
// Generates natural-language coach messages describing why the plan changed.
// Called after each replan with the new mastery scores and (optionally) the
// previous mastery scores for comparison.
//
// Example output:
//   "Algebra accuracy dropped from 82% to 69%.
//    Next week's Algebra workload has been increased."
//
//   "Expression of Ideas mastery improved to 91%.
//    Practice volume reduced and moved to maintenance review."
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TopicMasteryScore } from './topic-mastery.service'

type Supabase = SupabaseClient<Database>

export type RecommendationType =
  | 'increase_volume'
  | 'reduce_volume'
  | 'intervention'
  | 'maintenance'
  | 'schedule_change'
  | 'recovery'
  | 'general'

export interface Recommendation {
  domainKey: string | null
  domainLabel: string | null
  type: RecommendationType
  message: string
  oldMastery: number | null
  newMastery: number | null
}

export function generateRecommendations(
  mastery: TopicMasteryScore[],
  previousMastery: Map<string, number>,
): Recommendation[] {
  const recs: Recommendation[] = []

  for (const m of mastery) {
    const prev     = previousMastery.get(m.domainKey)
    const prevStr  = prev !== undefined ? ` (was ${prev})` : ''
    const delta    = prev !== undefined ? m.masteryScore - prev : null

    // Tier-based messages
    if (m.masteryScore < 50) {
      recs.push({
        domainKey:   m.domainKey,
        domainLabel: m.domainLabel,
        type:        'intervention',
        message:     `${m.domainLabel} mastery is at ${m.masteryScore}/100${prevStr}. ` +
          `This topic needs urgent attention — question volume has been increased by 50% ` +
          `and review frequency doubled. Focus on this area daily.`,
        oldMastery: prev ?? null,
        newMastery: m.masteryScore,
      })
    } else if (m.masteryScore < 70) {
      const dropped = delta !== null && delta < -5
        ? `dropped from ${prev} to ${m.masteryScore}`
        : `is at ${m.masteryScore}/100${prevStr}`
      recs.push({
        domainKey:   m.domainKey,
        domainLabel: m.domainLabel,
        type:        'increase_volume',
        message:     `${m.domainLabel} mastery ${dropped}. ` +
          `Question volume has been increased by 25% and review frequency increased.`,
        oldMastery: prev ?? null,
        newMastery: m.masteryScore,
      })
    } else if (m.masteryScore >= 90) {
      recs.push({
        domainKey:   m.domainKey,
        domainLabel: m.domainLabel,
        type:        delta !== null && delta > 0 ? 'reduce_volume' : 'maintenance',
        message:     `${m.domainLabel} mastery reached ${m.masteryScore}/100${prevStr}. ` +
          `Practice volume has been reduced to maintenance level — periodic reviews scheduled.`,
        oldMastery: prev ?? null,
        newMastery: m.masteryScore,
      })
    }

    // Notable change messages (only when prior data exists)
    if (delta !== null) {
      if (delta >= 10) {
        recs.push({
          domainKey:   m.domainKey,
          domainLabel: m.domainLabel,
          type:        'general',
          message:     `Great progress on ${m.domainLabel}! Mastery improved by ${delta} points ` +
            `(${prev} → ${m.masteryScore}).`,
          oldMastery: prev ?? null,
          newMastery: m.masteryScore,
        })
      } else if (delta <= -10) {
        recs.push({
          domainKey:   m.domainKey,
          domainLabel: m.domainLabel,
          type:        'schedule_change',
          message:     `${m.domainLabel} accuracy dropped. Mastery fell from ${prev} to ${m.masteryScore}. ` +
            `Next week's ${m.domainLabel} workload has been increased.`,
          oldMastery: prev ?? null,
          newMastery: m.masteryScore,
        })
      }
    }
  }

  // Sort: interventions first, then schedule changes, then the rest
  const order: Record<RecommendationType, number> = {
    intervention:    0,
    schedule_change: 1,
    increase_volume: 2,
    recovery:        3,
    reduce_volume:   4,
    maintenance:     5,
    general:         6,
  }
  recs.sort((a, b) => order[a.type] - order[b.type])

  return recs
}

export async function saveRecommendations(
  supabase: Supabase,
  userId: string,
  recommendations: Recommendation[],
  replanAuditLogId?: string,
): Promise<void> {
  if (recommendations.length === 0) return

  await (supabase.from('adaptive_recommendations') as any).insert(
    recommendations.map(r => ({
      user_id:               userId,
      replan_audit_log_id:   replanAuditLogId ?? null,
      domain_key:            r.domainKey,
      domain_label:          r.domainLabel,
      recommendation_type:   r.type,
      message:               r.message,
      old_mastery:           r.oldMastery,
      new_mastery:           r.newMastery,
    }))
  )
}
