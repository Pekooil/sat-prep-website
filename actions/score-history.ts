'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ScoreInsert = Database['public']['Tables']['score_history']['Insert']

export async function addScoreEntry(data: Omit<ScoreInsert, 'user_id'>) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('score_history').insert({ ...data, user_id: user.id })
  if (error) return { error: error.message }

  // Update current_score in users table
  if (data.math_score && data.reading_writing_score) {
    const total = data.math_score + data.reading_writing_score
    await supabase
      .from('users')
      .update({ current_score: total, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  revalidatePath('/data')
  revalidatePath('/home')
  return { success: true }
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
