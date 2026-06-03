'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type TaskInsert = Database['public']['Tables']['calendar_tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['calendar_tasks']['Update']

export async function createCalendarTask(data: Omit<TaskInsert, 'user_id'>) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('calendar_tasks').insert({ ...data, user_id: user.id } as TaskInsert)
  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}

export async function updateCalendarTask(id: string, data: TaskUpdate) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('calendar_tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}

export async function toggleTaskComplete(id: string, is_completed: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('calendar_tasks')
    .update({
      is_completed,
      // Lock completed tasks so the Adaptive Replanner cannot modify historical records.
      // Unlocking (un-completing) also removes the lock so it can be rescheduled again.
      replan_locked: is_completed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/home')
  return { success: true }
}

export async function deleteCalendarTask(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('calendar_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}
