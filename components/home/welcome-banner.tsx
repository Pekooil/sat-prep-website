import { CalendarDays, Flame, Target, PartyPopper } from 'lucide-react'
import type { User } from '@/types'
import { daysUntilTest, formatDate } from '@/lib/utils'

const SCORE_MIN = 400
const SCORE_MAX = 1600
const SCORE_RANGE = SCORE_MAX - SCORE_MIN

function ScoreProgressBar({ currentScore, targetScore }: { currentScore: number; targetScore: number }) {
  const clamp = (v: number) => Math.min(Math.max(v, SCORE_MIN), SCORE_MAX)
  const pct = (score: number) => ((clamp(score) - SCORE_MIN) / SCORE_RANGE) * 100

  const fillPct = pct(currentScore)
  const targetPct = pct(targetScore)
  const ptsAway = Math.max(0, targetScore - currentScore)
  const milestoneLabels = [400, 600, 800, 1000, 1200, 1400, 1600]

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">Next milestone: {targetScore}</span>
        {ptsAway > 0 ? (
          <span className="sp-numeric text-xs font-medium text-[var(--text-body)]">{ptsAway} pts away</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--success)]">
            <PartyPopper className="h-3.5 w-3.5 shrink-0" />
            Goal reached!
          </span>
        )}
      </div>

      <div className="relative h-2 rounded-full bg-[var(--surface-sunken)] overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
          style={{ width: `${fillPct}%`, transition: `width 700ms cubic-bezier(0.16,1,0.3,1)` }}
        />
        {ptsAway > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-0.5 rounded-full bg-[var(--border-strong)]"
            style={{ left: `${targetPct}%` }}
          />
        )}
        <div
          className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] bg-[var(--surface-raised)] shadow-[var(--shadow-xs)]"
          style={{ left: `${fillPct}%` }}
        />
      </div>

      <div className="relative mt-2 h-4">
        {milestoneLabels.map(label => (
          <span
            key={label}
            className="sp-numeric absolute -translate-x-1/2 text-[10px] text-[var(--text-muted)]"
            style={{ left: `${pct(label)}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

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
