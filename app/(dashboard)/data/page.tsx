import { createClient } from '@/lib/supabase/server'
import { DataClient } from '@/components/data/data-client'

export default async function DataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [scoresResult, sessionsResult, errorsResult, profileResult] = await Promise.all([
    supabase
      .from('score_history')
      .select('*')
      .eq('user_id', user!.id)
      .order('test_date', { ascending: true }),
    supabase
      .from('question_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('session_date', { ascending: false }),
    supabase
      .from('error_logs')
      .select('subject, category, error_type, mastered')
      .eq('user_id', user!.id),
    supabase
      .from('users')
      .select('target_score, current_score, test_date')
      .eq('id', user!.id)
      .single(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Data</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your score progression, accuracy by topic, and study patterns.
        </p>
      </div>
      <DataClient
        scores={scoresResult.data ?? []}
        sessions={sessionsResult.data ?? []}
        errors={errorsResult.data ?? []}
      />
    </div>
  )
}
