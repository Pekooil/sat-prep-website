'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import type { Database } from '@/types/database'
import type { ReplannerResult } from '@/lib/adaptive-replanner/types'

type SessionInsert = Database['public']['Tables']['question_sessions']['Insert']

// ─── Exported types ───────────────────────────────────────────────────────────

export type MistakeType =
  | 'concept_gap'
  | 'careless_error'
  | 'timing_issue'
  | 'misread_question'
  | 'strategy_error'

export interface MissedAnalysisEntry {
  questionIndex: number
  subtopic: string | null
  mistakeType: MistakeType | null
}

export interface SessionMetrics {
  accuracy: number
  /** Null when no prior sessions exist for this category */
  improvementPct: number | null
  /** Rolling 5-session accuracy average (0–100) */
  topicMastery: number
}

export interface CreateSessionResult {
  success?: true
  error?: string
  replanner?: Pick<ReplannerResult, 'tasksUpdated' | 'taskChanges' | 'predictedScore' | 'changesSummary'>
  metrics?: SessionMetrics
}

// Maps our display mistake types to the error_logs DB enum
const ERROR_TYPE_MAP: Record<MistakeType, 'concept' | 'careless' | 'time' | 'strategy' | 'other'> = {
  concept_gap:      'concept',
  careless_error:   'careless',
  timing_issue:     'time',
  misread_question: 'other',
  strategy_error:   'strategy',
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function createQuestionSession(
  data: Omit<SessionInsert, 'user_id'>,
  missedAnalysis: MissedAnalysisEntry[] = [],
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

  // ── Compute session metrics ─────────────────────────────────────────────────
  const attempted = data.questions_attempted ?? 0
  const correct   = data.questions_correct   ?? 0
  const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0

  type PrevRow = { questions_attempted: number; questions_correct: number }

  // Last 4 completed sessions for the same category (excludes the one just inserted)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prevSessions } = await (supabase.from('question_sessions') as any)
    .select('questions_attempted, questions_correct')
    .eq('user_id', user.id)
    .eq('category', data.category)
    .neq('id', session.id)
    .order('created_at', { ascending: false })
    .limit(4)

  const prevAccuracies: number[] = ((prevSessions ?? []) as PrevRow[])
    .filter(s => (s.questions_attempted ?? 0) > 0)
    .map(s => Math.round(((s.questions_correct ?? 0) / s.questions_attempted) * 100))

  const prevAvg = prevAccuracies.length > 0
    ? Math.round(prevAccuracies.reduce((a, b) => a + b, 0) / prevAccuracies.length)
    : null

  const improvementPct = prevAvg !== null ? accuracy - prevAvg : null

  // Rolling mean of up to 5 sessions (current + previous)
  const allAccuracies = [accuracy, ...prevAccuracies]
  const topicMastery  = Math.round(
    allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length
  )

  // ── Auto-create error_log entries for tagged missed questions ───────────────
  const cbFilters = data.college_board_filters as Record<string, string> | null
  const errorEntries = missedAnalysis
    .filter(ma => ma.mistakeType !== null)
    .map(ma => ({
      user_id:              user.id,
      question_session_id:  session.id,
      subject:              data.subject,
      category:             data.category,
      subcategory:          ma.subtopic ?? data.subcategory ?? null,
      error_type:           ERROR_TYPE_MAP[ma.mistakeType!],
      description:          `Q${ma.questionIndex + 1}: ${ma.mistakeType!.replace(/_/g, ' ')}`,
      college_board_domain: data.category,
      college_board_skill:  ma.subtopic ?? cbFilters?.skill ?? null,
    }))

  if (errorEntries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('error_logs') as any).insert(errorEntries)
  }

  // ── Adaptive replanner ──────────────────────────────────────────────────────
  const replanResult = await runAdaptiveReplanner(supabase, user.id, 'question_session', session.id)

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/error-log')

  return {
    success: true,
    replanner: {
      tasksUpdated:   replanResult.tasksUpdated,
      taskChanges:    replanResult.taskChanges,
      predictedScore: replanResult.predictedScore,
      changesSummary: replanResult.changesSummary,
    },
    metrics: { accuracy, improvementPct, topicMastery },
  }
}
