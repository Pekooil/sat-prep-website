'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { StudyPlanEngine } from '@/lib/study-plan-engine'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import type {
  StudyPlanEngineInput,
  StudyPlanEngineResult,
  TopicPerformance,
} from '@/lib/study-plan-engine/types'

// ─── Public Actions ───────────────────────────────────────────────────────────

/**
 * Generate a full study plan from the user's saved profile settings.
 * Topic performance is loaded automatically from question_sessions.
 * No form input required — call this for one-click plan regeneration.
 */
export async function generatePlanFromProfile(): Promise<{
  data?: StudyPlanEngineResult
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileErr } = await (supabase.from('users') as any)
    .select('current_score, target_score, test_date, daily_study_minutes, inventory_mode')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) return { error: 'Profile not found' }
  if (!profile.test_date) return { error: 'No test date set — update your profile first.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicPerformance = await fetchTopicPerformance(supabase as any, user.id)

  return runEngine(supabase, {
    userId: user.id,
    currentScore: profile.current_score ?? 1050,
    targetScore: profile.target_score ?? 1400,
    testDate: profile.test_date,
    dailyStudyMinutes: profile.daily_study_minutes ?? 60,
    topicPerformance,
    inventoryMode: profile.inventory_mode ?? 'exclude_active',
  })
}

/**
 * Generate a full study plan from explicit form inputs.
 * Topic performance is still loaded from the DB and merged automatically.
 * weakAreaKeys are optional domain keys (e.g. 'algebra') — if the domain has
 * no real data yet these are seeded at 40 % accuracy to prioritize them.
 */
export async function generatePlanFromForm(params: {
  currentScore: number
  targetScore: number
  testDate: string
  dailyStudyMinutes: number
  weakAreaKeys?: string[]
  daySchedule?: Record<number, 'study' | 'review' | 'rest'>
}): Promise<{ data?: StudyPlanEngineResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modeRow } = await (supabase.from('users') as any)
    .select('inventory_mode')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicPerformance = await fetchTopicPerformance(supabase as any, user.id, params.weakAreaKeys)

  return runEngine(supabase, {
    userId: user.id,
    currentScore: params.currentScore,
    targetScore: params.targetScore,
    testDate: params.testDate,
    dailyStudyMinutes: params.dailyStudyMinutes,
    topicPerformance,
    daySchedule: params.daySchedule,
    inventoryMode: modeRow?.inventory_mode ?? 'exclude_active',
  })
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function runEngine(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: StudyPlanEngineInput,
): Promise<{ data?: StudyPlanEngineResult; error?: string }> {
  const engine = new StudyPlanEngine(supabase)
  const result = await engine.generate(input)
  if (result.error) return { error: result.error }

  revalidatePath('/calendar')
  revalidatePath('/home')
  return { data: result }
}

/**
 * Aggregate question_sessions rows into per-domain accuracy figures.
 *
 * If weakAreaKeys are provided and a domain has no real data yet,
 * a synthetic entry is inserted at 40 % accuracy so the engine
 * treats it as a priority area.
 */
async function fetchTopicPerformance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  weakAreaKeys: string[] = [],
): Promise<TopicPerformance[]> {
  const { data: sessions } = await supabase
    .from('question_sessions')
    .select('category, questions_attempted, questions_correct')
    .eq('user_id', userId)

  // Build label → domainKey map once
  const labelToKey = new Map(DOMAIN_CATALOG.map(d => [d.label, d.key]))

  // Aggregate real data by domain key
  const agg = new Map<string, { attempted: number; correct: number }>()
  if (sessions) {
    for (const s of sessions) {
      const key = labelToKey.get(s.category)
      if (!key) continue
      const prev = agg.get(key) ?? { attempted: 0, correct: 0 }
      agg.set(key, {
        attempted: prev.attempted + (s.questions_attempted ?? 0),
        correct:   prev.correct   + (s.questions_correct  ?? 0),
      })
    }
  }

  // Seed declared weak areas with synthetic 40 % data (only if no real data exists)
  for (const key of weakAreaKeys) {
    if (!agg.has(key) && DOMAIN_CATALOG.some(d => d.key === key)) {
      agg.set(key, { attempted: 10, correct: 4 }) // 40 % accuracy seed
    }
  }

  return [...agg.entries()]
    .filter(([, { attempted }]) => attempted > 0)
    .map(([domainKey, { attempted, correct }]) => ({
      domainKey,
      attempted,
      correct,
      accuracy: Math.round((correct / attempted) * 100),
    }))
}
