'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import type { Database } from '@/types/database'
import type { ReplannerResult } from '@/lib/adaptive-replanner/types'

type SessionInsert = Database['public']['Tables']['question_sessions']['Insert']

export interface CreateSessionResult {
  success?: true
  error?: string
  replanner?: Pick<ReplannerResult, 'tasksUpdated' | 'taskChanges' | 'predictedScore' | 'changesSummary'>
}

export async function createQuestionSession(
  data: Omit<SessionInsert, 'user_id'>,
): Promise<CreateSessionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (supabase.from('question_sessions') as any)
    .insert({ ...data, user_id: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const replanResult = await runAdaptiveReplanner(supabase, user.id, 'question_session', session.id)

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/data')

  return {
    success: true,
    replanner: {
      tasksUpdated:    replanResult.tasksUpdated,
      taskChanges:     replanResult.taskChanges,
      predictedScore:  replanResult.predictedScore,
      changesSummary:  replanResult.changesSummary,
    },
  }
}
