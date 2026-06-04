// ─────────────────────────────────────────────────────────────────────────────
// Topic Mastery Service
//
// Computes a 0–100 mastery score for each SAT domain using 6 weighted factors:
//   accuracy_score      (0.30) — all-time accuracy
//   recent_accuracy     (0.25) — last 3 sessions
//   improvement_factor  (0.15) — trajectory (first half vs second half)
//   mistake_cleanliness (0.15) — inverse mistake frequency
//   confidence_factor   (0.10) — avg error-log confidence rating 1–5 → 0–100
//   consistency_factor  (0.05) — sessions in last 14 days / expected
//
// Mastery tiers drive volume adjustments in the replanner:
//   90–100  Mastered  → reduce volume 30%
//   70–89   Proficient → normal volume
//   50–69   Developing → +25% volume
//   0–49    Needs Work  → +50% volume (high-priority intervention)
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'

type Supabase = SupabaseClient<Database>

export type MasteryLevel = 'mastered' | 'proficient' | 'developing' | 'needs_work'

export interface TopicMasteryScore {
  domainKey: string
  domainLabel: string
  subject: 'math' | 'reading_writing'
  masteryScore: number
  accuracyScore: number
  recentAccuracy: number
  improvementFactor: number
  mistakeCleanliness: number
  confidenceFactor: number
  consistencyFactor: number
  totalAttempted: number
  totalSessions: number
  masteryLevel: MasteryLevel
}

function levelForScore(score: number): MasteryLevel {
  if (score >= 90) return 'mastered'
  if (score >= 70) return 'proficient'
  if (score >= 50) return 'developing'
  return 'needs_work'
}

function safeDivide(correct: number, attempted: number): number {
  return attempted > 0 ? Math.round((correct / attempted) * 100) : 0
}

export async function computeTopicMastery(
  supabase: Supabase,
  userId: string,
): Promise<TopicMasteryScore[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().split('T')[0]

  const [sessionsResult, errorsResult] = await Promise.all([
    (supabase.from('question_sessions') as any)
      .select('category, questions_attempted, questions_correct, session_date')
      .eq('user_id', userId)
      .order('session_date', { ascending: true }),
    (supabase.from('error_logs') as any)
      .select('category, confidence_rating, archived')
      .eq('user_id', userId)
      .eq('archived', false),
  ])

  type SessionRow = {
    category: string
    questions_attempted: number | null
    questions_correct: number | null
    session_date: string
  }
  type ErrorRow = {
    category: string
    confidence_rating: number | null
    archived: boolean
  }

  const sessions: SessionRow[] = sessionsResult.data ?? []
  const errors: ErrorRow[]    = errorsResult.data ?? []

  // Group by domain label
  const sessionsByLabel = new Map<string, SessionRow[]>()
  for (const s of sessions) {
    const arr = sessionsByLabel.get(s.category) ?? []
    arr.push(s)
    sessionsByLabel.set(s.category, arr)
  }

  const errorsByLabel = new Map<string, ErrorRow[]>()
  for (const e of errors) {
    const arr = errorsByLabel.get(e.category) ?? []
    arr.push(e)
    errorsByLabel.set(e.category, arr)
  }

  return DOMAIN_CATALOG.map(domain => {
    const domainSessions = sessionsByLabel.get(domain.label) ?? []
    const domainErrors   = errorsByLabel.get(domain.label) ?? []

    const totalAttempted = domainSessions.reduce((s, q) => s + (q.questions_attempted ?? 0), 0)
    const totalCorrect   = domainSessions.reduce((s, q) => s + (q.questions_correct ?? 0), 0)
    const totalSessions  = domainSessions.length

    // Factor 1: all-time accuracy
    const accuracyScore = totalAttempted > 0 ? safeDivide(totalCorrect, totalAttempted) : 50

    // Factor 2: recent accuracy (last 3 sessions)
    const last3 = domainSessions.slice(-3)
    const recentAttempted = last3.reduce((s, q) => s + (q.questions_attempted ?? 0), 0)
    const recentCorrect   = last3.reduce((s, q) => s + (q.questions_correct ?? 0), 0)
    const recentAccuracy  = recentAttempted > 0 ? safeDivide(recentCorrect, recentAttempted) : accuracyScore

    // Factor 3: improvement (first-half accuracy vs second-half accuracy → 0–100)
    let improvementFactor = 50
    if (domainSessions.length >= 4) {
      const half = Math.floor(domainSessions.length / 2)
      const first  = domainSessions.slice(0, half)
      const second = domainSessions.slice(half)
      const firstAcc  = safeDivide(
        first.reduce((s, q) => s + (q.questions_correct ?? 0), 0),
        first.reduce((s, q) => s + (q.questions_attempted ?? 0), 0),
      )
      const secondAcc = safeDivide(
        second.reduce((s, q) => s + (q.questions_correct ?? 0), 0),
        second.reduce((s, q) => s + (q.questions_attempted ?? 0), 0),
      )
      const delta = secondAcc - firstAcc
      improvementFactor = Math.max(0, Math.min(100, 50 + delta))
    }

    // Factor 4: mistake cleanliness — inverse of (mistakes per 10 questions)
    const mistakeCount      = domainErrors.length
    const mistakeRate       = totalAttempted > 0 ? (mistakeCount / totalAttempted) * 10 : 0
    const mistakeCleanliness = Math.max(0, Math.min(100, 100 - mistakeRate * 15))

    // Factor 5: confidence rating (error log, avg 1–5 → 0–100)
    const rated        = domainErrors.filter(e => e.confidence_rating !== null)
    const avgRating    = rated.length > 0
      ? rated.reduce((s, e) => s + (e.confidence_rating ?? 3), 0) / rated.length
      : 3
    const confidenceFactor = Math.round(((avgRating - 1) / 4) * 100)

    // Factor 6: consistency (sessions in last 14 days / 10 expected)
    const recentCount      = domainSessions.filter(s => s.session_date >= twoWeeksAgo).length
    const consistencyFactor = Math.min(100, Math.round((recentCount / 10) * 100))

    const masteryScore = Math.max(0, Math.min(100, Math.round(
      accuracyScore      * 0.30 +
      recentAccuracy     * 0.25 +
      improvementFactor  * 0.15 +
      mistakeCleanliness * 0.15 +
      confidenceFactor   * 0.10 +
      consistencyFactor  * 0.05,
    )))

    return {
      domainKey: domain.key,
      domainLabel: domain.label,
      subject: domain.subject,
      masteryScore,
      accuracyScore,
      recentAccuracy,
      improvementFactor,
      mistakeCleanliness,
      confidenceFactor,
      consistencyFactor,
      totalAttempted,
      totalSessions,
      masteryLevel: levelForScore(masteryScore),
    }
  })
}

export async function fetchSavedMastery(
  supabase: Supabase,
  userId: string,
): Promise<Map<string, number>> {
  const { data } = await (supabase.from('topic_mastery') as any)
    .select('domain_key, mastery_score')
    .eq('user_id', userId)

  const map = new Map<string, number>()
  for (const row of data ?? []) map.set(row.domain_key, row.mastery_score)
  return map
}

export async function saveTopicMastery(
  supabase: Supabase,
  userId: string,
  mastery: TopicMasteryScore[],
): Promise<void> {
  const now = new Date().toISOString()
  const rows = mastery.map(m => ({
    user_id:                  userId,
    domain_key:               m.domainKey,
    domain_label:             m.domainLabel,
    subject:                  m.subject,
    mastery_score:            m.masteryScore,
    accuracy_score:           m.accuracyScore,
    recent_accuracy:          m.recentAccuracy,
    improvement_factor:       m.improvementFactor,
    mistake_cleanliness:      m.mistakeCleanliness,
    confidence_factor:        m.confidenceFactor,
    consistency_factor:       m.consistencyFactor,
    total_questions_attempted: m.totalAttempted,
    total_sessions:           m.totalSessions,
    computed_at:              now,
    updated_at:               now,
  }))

  await (supabase.from('topic_mastery') as any).upsert(rows, {
    onConflict: 'user_id,domain_key',
  })
}

/** Volume multiplier applied to base question counts based on mastery tier. */
export function volumeMultiplier(masteryScore: number): number {
  if (masteryScore >= 90) return 0.70
  if (masteryScore >= 70) return 1.00
  if (masteryScore >= 50) return 1.25
  return 1.50
}
