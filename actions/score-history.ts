'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import type { Database } from '@/types/database'

type ScoreInsert = Database['public']['Tables']['score_history']['Insert']

export async function addScoreEntry(
  data: Omit<ScoreInsert, 'user_id'>,
): Promise<{ success?: true; scoreId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: score, error } = await supabase
    .from('score_history')
    .insert({ ...data, user_id: user.id })
    .select('id')
    .single()
  if (error) return { error: error.message }

  // Update current_score in users table.
  // When both sections are provided, use the exact total.
  // When only one section is provided, fetch the existing other-section score and add.
  const mathScore = data.math_score ?? 0
  const rwScore   = data.reading_writing_score ?? 0

  if (mathScore > 0 || rwScore > 0) {
    let newTotal: number

    if (mathScore > 0 && rwScore > 0) {
      // Full score — straightforward
      newTotal = mathScore + rwScore
    } else {
      // Partial score — pull the other half from the most recent full score_history row
      const { data: existing } = await supabase
        .from('users')
        .select('current_score')
        .eq('id', user.id)
        .single()

      const existingTotal = existing?.current_score ?? 0
      // Heuristic: split existing total 50/50 to fill the missing section
      const existingHalf = Math.round(existingTotal * 0.5)
      newTotal = mathScore > 0
        ? mathScore + (existingTotal - existingHalf)  // known Math + estimated R&W
        : (existingHalf) + rwScore                    // estimated Math + known R&W
    }

    await supabase
      .from('users')
      .update({ current_score: newTotal, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  // Practice/official test score → re-evaluate remaining plan difficulty
  if (data.test_type === 'practice' || data.test_type === 'official' || data.test_type === 'full_length') {
    await runAdaptiveReplanner(supabase, user.id, 'practice_test_score', score.id)
  }

  revalidatePath('/data')
  revalidatePath('/home')
  return { success: true, scoreId: score.id }
}

export async function deleteScoreEntry(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('score_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/data')
  return { success: true }
}

export async function updateUserProfile(data: {
  full_name?: string
  target_score?: number
  test_date?: string
  study_hours_per_week?: number
}) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('users')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/home')
  revalidatePath('/data')
  return { success: true }
}
