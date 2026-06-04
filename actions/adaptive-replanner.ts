'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import { restorePlanVersion } from '@/lib/adaptive-replanner/plan-version.service'

// ─── Manual replan ────────────────────────────────────────────────────────────

export interface ManualReplanResult {
  success?: true
  error?: string
  tasksUpdated: number
  predictedScore: number
  predictedScoreLow: number
  predictedScoreHigh: number
  planVersionId: string | null
  changesSummary: string
}

export async function triggerManualReplan(): Promise<ManualReplanResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', tasksUpdated: 0, predictedScore: 0, predictedScoreLow: 0, predictedScoreHigh: 0, planVersionId: null, changesSummary: '' }

  const result = await runAdaptiveReplanner(supabase, user.id, 'manual')

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/ai-coach')

  return {
    success:           true,
    tasksUpdated:      result.tasksUpdated,
    predictedScore:    result.predictedScore,
    predictedScoreLow: result.predictedScoreLow,
    predictedScoreHigh: result.predictedScoreHigh,
    planVersionId:     result.planVersionId,
    changesSummary:    result.changesSummary,
  }
}

// ─── Recover missed assignments + replan ─────────────────────────────────────

export interface RecoverMissedResult {
  success?: true
  error?: string
  recovered: number
  skipped: number
  tasksUpdated: number
  predictedScore: number
}

export async function recoverMissedAndReplan(): Promise<RecoverMissedResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', recovered: 0, skipped: 0, tasksUpdated: 0, predictedScore: 0 }

  const result = await runAdaptiveReplanner(supabase, user.id, 'behind_schedule')

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/ai-coach')

  return {
    success:        true,
    recovered:      result.recoveredTasks ?? 0,
    skipped:        result.skippedTasks   ?? 0,
    tasksUpdated:   result.tasksUpdated,
    predictedScore: result.predictedScore,
  }
}

// ─── Restore a plan version ───────────────────────────────────────────────────

export interface RestoreVersionResult {
  success?: true
  error?: string
  restored: number
}

export async function restoreVersion(versionId: string): Promise<RestoreVersionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', restored: 0 }

  const result = await restorePlanVersion(supabase, user.id, versionId)
  if (result.error) return { error: result.error, restored: 0 }

  // Run a replan after restore to refresh metadata
  await runAdaptiveReplanner(supabase, user.id, 'manual')

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/ai-coach')

  return { success: true, restored: result.restored }
}

// ─── Mark a recommendation as read ───────────────────────────────────────────

export async function markRecommendationRead(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase.from('adaptive_recommendations') as any)
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)
}
