import { CalendarDays, Flame, Target } from 'lucide-react'
import type { User } from '@/types'
import { daysUntilTest, formatDate } from '@/lib/utils'
import { ScoreProgressBar } from './score-progress-bar'

interface WelcomeBannerProps {
  profile: User | null
  streak?: number
  currentScore?: number | null
  targetScore?: number | null
}

export function WelcomeBanner({ profile, streak = 0, currentScore, targetScore }: WelcomeBannerProps) {
  const days = daysUntilTest(profile?.test_date ?? null)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-xs)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="sp-eyebrow">{greeting}</p>
          <h1 className="sp-display mt-1 text-2xl sm:text-3xl">{firstName}</h1>
        </div>
        {/* Streak pill — quiet neutral chip */}
        <div className="flex shrink-0 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2">
          <Flame className={streak > 0 ? 'h-4 w-4 text-[var(--warning)]' : 'h-4 w-4 text-[var(--text-muted)]'} strokeWidth={1.75} />
          {streak > 0 ? (
            <div className="text-right">
              <p className="sp-numeric text-base font-semibold leading-none text-[var(--text-heading)]">{streak}</p>
              <p className="mt-0.5 text-[10px] leading-none text-[var(--text-muted)]">day streak</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[11px] font-semibold leading-none text-[var(--text-body)]">No streak</p>
              <p className="mt-0.5 text-[10px] leading-none text-[var(--text-muted)]">Study today</p>
            </div>
          )}
        </div>
      </div>

      {days !== null ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
          {days > 0 ? (
            <span className="text-[var(--text-body)]">
              <span className="sp-numeric font-semibold text-[var(--text-heading)]">{days}</span>
              <span> days until your SAT</span>
              {profile?.test_date && <span className="text-[var(--text-muted)]"> · {formatDate(profile.test_date)}</span>}
            </span>
          ) : days === 0 ? (
            <span className="flex items-center gap-1 font-semibold text-[var(--accent)]">
              <Target className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Your SAT is today — good luck!
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">Your SAT has passed — log your official score.</span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Set your test date to get a personalized countdown.</p>
      )}

      {currentScore != null && targetScore != null && (
        <ScoreProgressBar currentScore={currentScore} targetScore={targetScore} />
      )}
    </div>
  )
}
