import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your SAT study dashboard — today\'s tasks, score progress, streak, and AI plan generator.',
}
import { WelcomeBanner } from '@/components/home/welcome-banner'
import { ScoreCard } from '@/components/home/score-card'
import { UpcomingTasks } from '@/components/home/upcoming-tasks'
import { AIPlannerTrigger } from '@/components/home/ai-planner-trigger'
import { GuestUpgradeBanner } from '@/components/home/guest-upgrade-banner'
import { todayISO } from '@/lib/utils'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = todayISO()

  const [profileResult, tasksResult, scoresResult, errorsResult, sessionsResult, todayTasksResult, predictionResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user!.id).single(),
    supabase
      .from('calendar_tasks')
      .select('*')
      .eq('user_id', user!.id)
      .gte('task_date', today)
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
      .select('questions_attempted, questions_correct, time_spent_minutes, session_date')
      .eq('user_id', user!.id),
    supabase
      .from('calendar_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('task_date', today)
      .eq('is_completed', false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('score_predictions') as any)
      .select('predicted_score')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = profileResult.data
  const upcomingTasks = tasksResult.data ?? []
  const recentScores = scoresResult.data ?? []
  const errors = errorsResult.data ?? []
  const sessions = sessionsResult.data ?? []
  const todayTaskCount = todayTasksResult.count ?? 0
  const predictedScore: number | null = predictionResult.data?.predicted_score ?? null

  const unmasteredErrors = errors.filter(e => !e.mastered).length

  // Compute study streak: consecutive days with at least one session, working back from today
  const sessionDays = new Set(
    sessions.map(s => (s.session_date as string | null)?.split('T')[0]).filter(Boolean)
  )
  let streak = 0
  let streakDate = new Date()
  for (;;) {
    const key = streakDate.toISOString().split('T')[0]
    if (sessionDays.has(key)) {
      streak++
      streakDate = new Date(streakDate.getTime() - 86_400_000)
    } else break
  }

  return (
    <div className="space-y-6">
      {user?.is_anonymous && <GuestUpgradeBanner />}
      <WelcomeBanner
        profile={profile}
        streak={streak}
        currentScore={recentScores[0]?.total_score ?? profile?.current_score ?? null}
        targetScore={profile?.target_score ?? null}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
              ? `Gap: ${profile.target_score - profile.current_score} pts`
              : 'Set your goal'
          }
        />
        <ScoreCard
          label="Predicted Score"
          value={predictedScore}
          suffix="/1600"
          color="violet"
          description="Based on your session data"
          href="/data"
        />
        <ScoreCard
          label="Due Today"
          value={todayTaskCount}
          suffix=" tasks"
          color="emerald"
          description="Tap to open calendar"
          href="/calendar"
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
        <div className="lg:col-span-2">
          <UpcomingTasks tasks={upcomingTasks} />
        </div>
        <div className="flex flex-col">
          <AIPlannerTrigger profile={profile} />
        </div>
      </div>
    </div>
  )
}
