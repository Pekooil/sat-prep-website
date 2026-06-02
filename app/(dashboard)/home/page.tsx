import { createClient } from '@/lib/supabase/server'
import { WelcomeBanner } from '@/components/home/welcome-banner'
import { ScoreCard } from '@/components/home/score-card'
import { UpcomingTasks } from '@/components/home/upcoming-tasks'
import { QuickStats } from '@/components/home/quick-stats'
import { AIPlannerTrigger } from '@/components/home/ai-planner-trigger'
import { todayISO } from '@/lib/utils'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, tasksResult, scoresResult, errorsResult, sessionsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user!.id).single(),
    supabase
      .from('calendar_tasks')
      .select('*')
      .eq('user_id', user!.id)
      .gte('task_date', todayISO())
      .order('task_date')
      .limit(5),
    supabase
      .from('score_history')
      .select('*')
      .eq('user_id', user!.id)
      .order('test_date', { ascending: false })
      .limit(3),
    supabase
      .from('error_logs')
      .select('id, mastered')
      .eq('user_id', user!.id),
    supabase
      .from('question_sessions')
      .select('questions_attempted, questions_correct, time_spent_minutes')
      .eq('user_id', user!.id),
  ])

  const profile = profileResult.data
  const upcomingTasks = tasksResult.data ?? []
  const recentScores = scoresResult.data ?? []
  const errors = errorsResult.data ?? []
  const sessions = sessionsResult.data ?? []

  const totalAttempted = sessions.reduce((s, q) => s + (q.questions_attempted ?? 0), 0)
  const totalCorrect = sessions.reduce((s, q) => s + (q.questions_correct ?? 0), 0)
  const totalMinutes = sessions.reduce((s, q) => s + (q.time_spent_minutes ?? 0), 0)
  const unmasteredErrors = errors.filter(e => !e.mastered).length

  return (
    <div className="space-y-6">
      <WelcomeBanner profile={profile} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Current Score"
          value={profile?.current_score ?? null}
          suffix="/1600"
          color="blue"
          description={recentScores[0] ? `Last test: ${recentScores[0].test_type}` : 'No tests logged'}
        />
        <ScoreCard
          label="Target Score"
          value={profile?.target_score ?? null}
          suffix="/1600"
          color="indigo"
          description={
            profile?.current_score && profile?.target_score
              ? `Gap: ${profile.target_score - profile.current_score} points`
              : 'Set your goal'
          }
        />
        <ScoreCard
          label="Accuracy Rate"
          value={totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null}
          suffix="%"
          color="emerald"
          description={`${totalAttempted} questions practiced`}
        />
        <ScoreCard
          label="Open Errors"
          value={unmasteredErrors}
          suffix=" to review"
          color="amber"
          description={`${errors.length - unmasteredErrors} mastered`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <UpcomingTasks tasks={upcomingTasks} />
          <QuickStats
            totalMinutes={totalMinutes}
            totalAttempted={totalAttempted}
            totalCorrect={totalCorrect}
            unmasteredErrors={unmasteredErrors}
          />
        </div>
        <div>
          <AIPlannerTrigger profile={profile} />
        </div>
      </div>
    </div>
  )
}
