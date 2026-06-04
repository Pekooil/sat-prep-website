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
  /** Letter the student chose (A–D). Stored in error_log.student_answer. */
  studentAnswer: 'A' | 'B' | 'C' | 'D' | null
  /** Correct letter (A–D). Stored in error_log.correct_answer. */
  correctAnswer: 'A' | 'B' | 'C' | 'D' | null
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
  /** Non-null when the session saved but auto-creating error_log rows failed */
  errorLogWarning?: string
  replanner?: Pick<ReplannerResult, 'tasksUpdated' | 'taskChanges' | 'predictedScore' | 'changesSummary'>
  metrics?: SessionMetrics
}

// Maps our session-workflow MistakeType → error_logs DB enum value
const ERROR_TYPE_MAP: Record<MistakeType, 'concept' | 'careless' | 'time' | 'strategy' | 'other'> = {
  concept_gap:      'concept',
  careless_error:   'careless',
  timing_issue:     'time',
  misread_question: 'other',
  strategy_error:   'strategy',
}

// Human-readable label stored in custom_mistake_type when error_type = 'other'
const CUSTOM_LABEL_MAP: Partial<Record<MistakeType, string>> = {
  misread_question: 'Misread Question',
}

// Display label for the auto-generated error description
const DISPLAY_LABEL: Record<MistakeType, string> = {
  concept_gap:      'Concept Gap',
  careless_error:   'Careless Error',
  timing_issue:     'Timing Issue',
  misread_question: 'Misread Question',
  strategy_error:   'Strategy Error',
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
      custom_mistake_type:  CUSTOM_LABEL_MAP[ma.mistakeType!] ?? null,
      description:          `Q${ma.questionIndex + 1}: ${DISPLAY_LABEL[ma.mistakeType!]}`,
      student_answer:       ma.studentAnswer ?? null,
      correct_answer:       ma.correctAnswer ?? null,
      college_board_domain: data.category,
      college_board_skill:  ma.subtopic ?? cbFilters?.skill ?? null,
    }))

  let errorLogInsertError: string | null = null
  if (errorEntries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: errorLogErr } = await (supabase.from('error_logs') as any).insert(errorEntries)
    if (errorLogErr) {
      console.error('[createQuestionSession] error_log insert failed:', errorLogErr.message)
      errorLogInsertError = errorLogErr.message
    }
  }

  // ── Adaptive replanner ──────────────────────────────────────────────────────
  const replanResult = await runAdaptiveReplanner(supabase, user.id, 'question_session', session.id)

  revalidatePath('/calendar')
  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/error-log')

  return {
    success: true,
    ...(errorLogInsertError ? { errorLogWarning: errorLogInsertError } : {}),
    replanner: {
      tasksUpdated:   replanResult.tasksUpdated,
      taskChanges:    replanResult.taskChanges,
      predictedScore: replanResult.predictedScore,
      changesSummary: replanResult.changesSummary,
    },
    metrics: { accuracy, improvementPct, topicMastery },
  }
}
