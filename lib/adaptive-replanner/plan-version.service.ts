// ─────────────────────────────────────────────────────────────────────────────
// Plan Version Service
//
// Snapshots future unlocked tasks before every replan so students can
// compare and restore previous versions of their study schedule.
//
// Restore rules:
//   • Only updates tasks with task_date >= today
//   • Never restores completed (is_completed = true) tasks
//   • Restores: title, task_date, duration_minutes, college_board_filters,
//               priority_score, description
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

export async function savePlanVersion(
  supabase: Supabase,
  userId: string,
  triggeredBy: string,
  reason: string,
  predictedScore?: number,
): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0]

  const [futureTasks, latestVersion] = await Promise.all([
    (supabase.from('calendar_tasks') as any)
      .select('id, title, task_date, duration_minutes, subject, category, college_board_filters, priority_score, description')
      .eq('user_id', userId)
      .gte('task_date', today)
      .order('task_date'),
    (supabase.from('plan_versions') as any)
      .select('version_number')
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single(),
  ])

  const versionNumber = (latestVersion.data?.version_number ?? 0) + 1

  const { data } = await (supabase.from('plan_versions') as any)
    .insert({
      user_id:         userId,
      version_number:  versionNumber,
      triggered_by:    triggeredBy,
      reason,
      tasks_snapshot:  futureTasks.data ?? [],
      tasks_updated:   0,
      predicted_score: predictedScore ?? null,
    })
    .select('id')
    .single()

  return data?.id ?? null
}

export async function updateVersionTaskCount(
  supabase: Supabase,
  versionId: string,
  tasksUpdated: number,
): Promise<void> {
  await (supabase.from('plan_versions') as any)
    .update({ tasks_updated: tasksUpdated })
    .eq('id', versionId)
}

export interface RestoreResult {
  restored: number
  error?: string
}

export async function restorePlanVersion(
  supabase: Supabase,
  userId: string,
  versionId: string,
): Promise<RestoreResult> {
  const { data: version } = await (supabase.from('plan_versions') as any)
    .select('tasks_snapshot')
    .eq('id', versionId)
    .eq('user_id', userId)
    .single()

  if (!version?.tasks_snapshot) return { restored: 0, error: 'Version not found' }

  type SnapTask = {
    id: string; title: string; task_date: string
    duration_minutes: number | null; college_board_filters: Record<string, string> | null
    priority_score: number | null; description: string | null
  }

  const today     = new Date().toISOString().split('T')[0]
  const now       = new Date().toISOString()
  const tasks     = (version.tasks_snapshot as SnapTask[]).filter(t => t.task_date >= today)
  let restored    = 0

  for (const t of tasks) {
    const { error } = await (supabase.from('calendar_tasks') as any)
      .update({
        title:                 t.title,
        task_date:             t.task_date,
        duration_minutes:      t.duration_minutes,
        college_board_filters: t.college_board_filters,
        priority_score:        t.priority_score,
        description:           t.description,
        updated_at:            now,
      })
      .eq('id', t.id)
      .eq('user_id', userId)
      .eq('is_completed', false)

    if (!error) restored++
  }

  return { restored }
}
