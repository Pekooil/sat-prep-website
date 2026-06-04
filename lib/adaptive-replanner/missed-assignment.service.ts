// ─────────────────────────────────────────────────────────────────────────────
// Missed Assignment Recovery Service
//
// Finds all overdue, incomplete, unlocked calendar tasks and redistributes
// them into the next 14 days, respecting daily_study_minutes limits.
//
// Rules:
//   • Never touches replan_locked or is_completed tasks
//   • Never moves practice test tasks
//   • Sorts by priority_score descending (highest-priority work placed first)
//   • Each target day is capped at 1.5× daily_study_minutes
//   • Tasks that can't fit in 14 days are left in place (skipped)
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

export interface RecoveryResult {
  recovered: number
  skipped: number
  newDates: Array<{ taskId: string; oldDate: string; newDate: string }>
}

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export async function recoverMissedAssignments(
  supabase: Supabase,
  userId: string,
  dailyStudyMinutes: number,
): Promise<RecoveryResult> {
  const today      = new Date().toISOString().split('T')[0]
  const maxDays    = 14
  const dailyLimit = Math.round(dailyStudyMinutes * 1.5)

  const [missedResult, futureResult] = await Promise.all([
    (supabase.from('calendar_tasks') as any)
      .select('id, title, task_date, duration_minutes, category, priority_score')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .eq('replan_locked', false)
      .lt('task_date', today)
      .neq('category', 'Full Practice Test')
      .order('priority_score', { ascending: false }),
    (supabase.from('calendar_tasks') as any)
      .select('task_date, duration_minutes')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('task_date', today)
      .lte('task_date', addDays(today, maxDays)),
  ])

  type MissedRow = {
    id: string; title: string; task_date: string
    duration_minutes: number | null; category: string | null; priority_score: number | null
  }
  type FutureRow = { task_date: string; duration_minutes: number | null }

  const missed: MissedRow[] = missedResult.data ?? []
  if (missed.length === 0) return { recovered: 0, skipped: 0, newDates: [] }

  // Build minutes-per-day map from existing future tasks
  const loadByDate = new Map<string, number>()
  for (const t of (futureResult.data ?? []) as FutureRow[]) {
    const prev = loadByDate.get(t.task_date) ?? 0
    loadByDate.set(t.task_date, prev + (t.duration_minutes ?? 60))
  }

  const newDates: Array<{ taskId: string; oldDate: string; newDate: string }> = []
  let skipped = 0
  const now = new Date().toISOString()

  for (const task of missed) {
    const duration = task.duration_minutes ?? 60
    let placed = false

    for (let d = 0; d <= maxDays; d++) {
      const candidate    = addDays(today, d)
      const currentLoad  = loadByDate.get(candidate) ?? 0

      if (currentLoad + duration <= dailyLimit) {
        loadByDate.set(candidate, currentLoad + duration)

        await (supabase.from('calendar_tasks') as any)
          .update({ task_date: candidate, updated_at: now })
          .eq('id', task.id)
          .eq('user_id', userId)

        newDates.push({ taskId: task.id, oldDate: task.task_date, newDate: candidate })
        placed = true
        break
      }
    }

    if (!placed) skipped++
  }

  return { recovered: newDates.length, skipped, newDates }
}
