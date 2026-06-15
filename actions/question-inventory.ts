'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { QuestionInventory } from '@/types'

export type InventoryMode = 'exclude_active' | 'include_active'

// ─── Enriched type ────────────────────────────────────────────────────────────

export type InventoryItemWithStats = QuestionInventory & {
  assigned: number
  completed: number
  remaining: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractQuestionCount(title: string): number {
  const m = title.match(/(\d+)q\b/)
  return m ? parseInt(m[1], 10) : 0
}

function subjectToSection(subject: string): 'Reading and Writing' | 'Math' {
  return subject === 'math' ? 'Math' : 'Reading and Writing'
}

function inventoryTable(mode: InventoryMode): string {
  return mode === 'include_active' ? 'question_inventory_with_active' : 'question_inventory'
}

// ─── User Mode Preference ─────────────────────────────────────────────────────

export async function getUserInventoryMode(): Promise<{
  mode: InventoryMode
  practiceTestCount: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { mode: 'exclude_active', practiceTestCount: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any)
    .select('inventory_mode')
    .eq('id', user.id)
    .single()

  const { count } = await supabase
    .from('calendar_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('category', 'Practice Test')

  return {
    mode: (profile?.inventory_mode as InventoryMode | null) ?? 'exclude_active',
    practiceTestCount: count ?? 0,
  }
}

export async function setInventoryMode(
  mode: InventoryMode,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('users') as any)
    .update({ inventory_mode: mode })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getInventoryWithStats(
  mode: InventoryMode = 'exclude_active',
): Promise<{
  data?: InventoryItemWithStats[]
  error?: string
  lastUpdated?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const table = inventoryTable(mode)

  const [inventoryRes, tasksRes, sessionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from(table)
      .select('*')
      .order('section')
      .order('domain')
      .order('skill')
      .order('difficulty'),

    supabase
      .from('calendar_tasks')
      .select('category, college_board_filters, title, subject')
      .eq('user_id', user.id)
      .eq('replan_locked', false)
      .not('college_board_filters', 'is', null),

    supabase
      .from('question_sessions')
      .select('category, subcategory, questions_attempted, subject')
      .eq('user_id', user.id),
  ])

  if (inventoryRes.error) return { error: inventoryRes.error.message }

  const inventory: QuestionInventory[] = inventoryRes.data ?? []

  // Build assigned map: key = `${section}|||${domain}|||${skill}|||${difficulty}`
  const assignedMap = new Map<string, number>()
  for (const task of (tasksRes.data ?? [])) {
    const filters = task.college_board_filters as Record<string, string> | null
    if (!filters?.difficulty) continue
    const section = subjectToSection(task.subject ?? 'math')
    const domain = task.category ?? filters.domain ?? ''
    const skill = filters.skill ?? ''
    const difficulty = filters.difficulty ?? ''
    const key = `${section}|||${domain}|||${skill}|||${difficulty}`
    assignedMap.set(key, (assignedMap.get(key) ?? 0) + extractQuestionCount(task.title))
  }

  // Build completed map: key = `${section}|||${domain}|||${skill}`
  const completedMap = new Map<string, number>()
  for (const session of (sessionsRes.data ?? [])) {
    const section = subjectToSection(session.subject ?? 'math')
    const key = `${section}|||${session.category ?? ''}|||${session.subcategory ?? ''}`
    completedMap.set(key, (completedMap.get(key) ?? 0) + (session.questions_attempted ?? 0))
  }

  const items: InventoryItemWithStats[] = inventory.map(item => {
    const assignedKey = `${item.section}|||${item.domain}|||${item.skill}|||${item.difficulty}`
    const assigned = assignedMap.get(assignedKey) ?? 0
    const completedKey = `${item.section}|||${item.domain}|||${item.skill}`
    const completed = completedMap.get(completedKey) ?? 0
    const remaining = Math.max(0, item.available_count - assigned)
    return { ...item, assigned, completed, remaining }
  })

  const lastUpdated = inventory.length > 0
    ? inventory.reduce((l, i) => (i.updated_at > l ? i.updated_at : l), inventory[0].updated_at)
    : new Date().toISOString()

  return { data: items, lastUpdated }
}

// ─── Planner helper ───────────────────────────────────────────────────────────

/**
 * Load inventory limits for the study plan engine.
 * Returns a map keyed by `${domain}|||${skill}|||${difficulty}` → available_count.
 * Used by PlanStoreService to cap question counts before inserting tasks.
 */
export async function getInventoryLimits(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  mode: InventoryMode = 'exclude_active',
): Promise<Map<string, number>> {
  const table = inventoryTable(mode)
  const { data } = await supabase
    .from(table)
    .select('domain, skill, difficulty, available_count')

  const map = new Map<string, number>()
  if (!data) return map
  for (const row of data) {
    const key = `${row.domain}|||${row.skill}|||${row.difficulty}`
    map.set(key, row.available_count)
  }
  return map
}
