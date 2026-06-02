'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ErrorLogInsert = Database['public']['Tables']['error_logs']['Insert']
type ErrorLogUpdate = Database['public']['Tables']['error_logs']['Update']

export async function createErrorLog(data: Omit<ErrorLogInsert, 'user_id'>) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('error_logs').insert({ ...data, user_id: user.id })
  if (error) return { error: error.message }

  revalidatePath('/error-log')
  return { success: true }
}

export async function updateErrorLog(id: string, data: ErrorLogUpdate) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('error_logs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/error-log')
  return { success: true }
}

export async function markErrorMastered(id: string, mastered: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('error_logs')
    .update({
      mastered,
      review_count: mastered ? undefined : 0,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/error-log')
  return { success: true }
}

export async function deleteErrorLog(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('error_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/error-log')
  return { success: true }
}
