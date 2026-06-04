import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DataClient } from '@/components/data/data-client'

export default async function DataPage() {
  // Opt out of all Next.js data caching so every navigation to this page
  // produces a fresh server render with the latest Supabase data.
  noStore()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    scoresResult,
    sessionsResult,
    errorsResult,
    replansResult,
    tasksResult,
    profileResult,
    masteryResult,
    predictionsResult,
  ] = await Promise.all([
    supabase
      .from('score_history')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: true }),

    supabase
      .from('question_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: true }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('error_logs') as any)
      .select('id, subject, category, subcategory, error_type, mastered, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('replan_audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('calendar_tasks')
      .select('id, task_date, duration_minutes, subject, category, is_completed, replan_locked')
      .eq('user_id', user.id)
      .order('task_date', { ascending: true }),

    supabase
      .from('users')
      .select('target_score, current_score, test_date, daily_study_minutes')
      .eq('id', user.id)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('topic_mastery') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('mastery_score', { ascending: true }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('score_predictions') as any)
      .select('id, predicted_score, confidence_low, confidence_high, baseline_score, consistency_factor, session_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return (
    <DataClient
      scores={scoresResult.data ?? []}
      sessions={sessionsResult.data ?? []}
      errors={errorsResult.data ?? []}
      replans={replansResult.data ?? []}
      tasks={tasksResult.data ?? []}
      profile={profileResult.data ?? null}
      mastery={masteryResult.data ?? []}
      predictions={predictionsResult.data ?? []}
    />
  )
}
