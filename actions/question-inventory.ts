'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { QuestionInventory } from '@/types'

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

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getInventoryWithStats(): Promise<{
  data?: InventoryItemWithStats[]
  error?: string
  lastUpdated?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [inventoryRes, tasksRes, sessionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('question_inventory')
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createInventoryItem(data: {
  section: 'Reading and Writing' | 'Math'
  domain: string
  skill: string
  difficulty: 'easy' | 'medium' | 'hard'
  available_count: number
}): Promise<{ data?: QuestionInventory; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error } = await (supabase as any)
    .from('question_inventory')
    .insert({ ...data, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data: item }
}

export async function updateInventoryItem(
  id: string,
  data: {
    section?: 'Reading and Writing' | 'Math'
    domain?: string
    skill?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    available_count?: number
  },
): Promise<{ data?: QuestionInventory; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error } = await (supabase as any)
    .from('question_inventory')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data: item }
}

export async function deleteInventoryItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('question_inventory')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

export async function bulkImportInventory(
  items: Array<{
    section: string
    domain: string
    skill: string
    difficulty: string
    available_count: number
  }>,
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, errors: ['Unauthorized'] }

  const VALID_SECTIONS = ['Reading and Writing', 'Math']
  const VALID_DIFFS = ['easy', 'medium', 'hard']
  const errors: string[] = []
  type InventoryInsert = {
    section: 'Reading and Writing' | 'Math'
    domain: string
    skill: string
    difficulty: 'easy' | 'medium' | 'hard'
    available_count: number
    updated_at: string
  }
  const valid: InventoryInsert[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!VALID_SECTIONS.includes(item.section)) {
      errors.push(`Row ${i + 1}: invalid section "${item.section}" (must be "Reading and Writing" or "Math")`)
      continue
    }
    if (!VALID_DIFFS.includes(item.difficulty?.toLowerCase())) {
      errors.push(`Row ${i + 1}: invalid difficulty "${item.difficulty}" (must be easy/medium/hard)`)
      continue
    }
    if (!item.domain?.trim() || !item.skill?.trim()) {
      errors.push(`Row ${i + 1}: domain and skill are required`)
      continue
    }
    const count = Number(item.available_count)
    if (!Number.isFinite(count) || count < 0) {
      errors.push(`Row ${i + 1}: available_count must be a non-negative integer`)
      continue
    }
    valid.push({
      section: item.section as 'Reading and Writing' | 'Math',
      domain: item.domain.trim(),
      skill: item.skill.trim(),
      difficulty: item.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      available_count: Math.floor(count),
      updated_at: new Date().toISOString(),
    })
  }

  if (valid.length === 0) return { imported: 0, errors }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('question_inventory')
    .upsert(valid, { onConflict: 'section,domain,skill,difficulty' })

  if (error) {
    errors.push(error.message)
    return { imported: 0, errors }
  }

  revalidatePath('/inventory')
  return { imported: valid.length, errors }
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
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('question_inventory')
    .select('domain, skill, difficulty, available_count')

  const map = new Map<string, number>()
  if (!data) return map
  for (const row of data) {
    const key = `${row.domain}|||${row.skill}|||${row.difficulty}`
    map.set(key, row.available_count)
  }
  return map
}
