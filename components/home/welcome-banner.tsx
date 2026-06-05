import { CalendarDays, Flame } from 'lucide-react'
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
    <div className="mt-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-violet-200 font-medium">Next milestone: {targetScore}</span>
        {ptsAway > 0 && (
          <span className="text-xs text-violet-300 font-medium">{ptsAway} pts away</span>
        )}
        {ptsAway === 0 && (
          <span className="text-xs text-emerald-300 font-semibold">Goal reached! 🎉</span>
        )}
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full bg-white/15 overflow-visible">
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-700"
          style={{ width: `${fillPct}%` }}
        />

        {/* Target marker */}
        {ptsAway > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-4 rounded-sm bg-yellow-300 shadow-sm shadow-yellow-400/50"
            style={{ left: `${targetPct}%` }}
          />
        )}

        {/* Current score dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md shadow-white/30 border-2 border-indigo-400 z-10"
          style={{ left: `${fillPct}%` }}
        />


      </div>

      {/* Scale labels */}
      <div className="relative mt-2 h-4">
        {milestoneLabels.map(label => (
          <span
            key={label}
            className="absolute text-[10px] text-violet-300 -translate-x-1/2"
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-700 p-6 text-white shadow-lg">
      <div className="absolute right-0 top-0 opacity-10">
        <svg viewBox="0 0 200 200" className="h-48 w-48 -translate-y-8 translate-x-8" aria-hidden="true" fill="currentColor">
          <defs>
            <clipPath id="saturn-ring-back">
              <rect x="0" y="98" width="200" height="102" />
            </clipPath>
            <clipPath id="saturn-ring-front">
              <rect x="0" y="0" width="200" height="98" />
            </clipPath>
          </defs>
          <ellipse cx="100" cy="98" rx="92" ry="24" fill="none" stroke="currentColor" strokeWidth="14" clipPath="url(#saturn-ring-back)" />
          <circle cx="100" cy="98" r="56" />
          <ellipse cx="100" cy="98" rx="92" ry="24" fill="none" stroke="currentColor" strokeWidth="14" clipPath="url(#saturn-ring-front)" />
        </svg>
      </div>
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-violet-200 text-sm font-medium">{greeting},</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{firstName}! 👋</h1>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <Flame className="h-4 w-4 text-orange-300" />
            {streak > 0 ? (
              <div className="text-right">
                <p className="text-base font-bold leading-none text-white">{streak}</p>
                <p className="text-[10px] text-violet-200 leading-none mt-0.5">day streak</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-[11px] font-semibold text-violet-100 leading-none">No streak</p>
                <p className="text-[10px] text-violet-200 leading-none mt-0.5">Study today!</p>
              </div>
            )}
          </div>
        </div>
        {days !== null ? (
          <div className="mt-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-violet-200" />
            <span className="text-sm text-violet-100">
              {days > 0 ? (
                <>
                  <span className="font-bold text-white">{days} days</span> until your SAT
                  {profile?.test_date && ` · ${formatDate(profile.test_date)}`}
                </>
              ) : days === 0 ? (
                <span className="font-bold text-yellow-300">🎯 Your SAT is today! Good luck!</span>
              ) : (
                <span className="text-violet-200">Your SAT has passed — log your official score!</span>
              )}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-violet-200">Set your test date to get a personalized countdown.</p>
        )}
        {currentScore != null && targetScore != null && (
          <ScoreProgressBar currentScore={currentScore} targetScore={targetScore} />
        )}
      </div>
    </div>
  )
}
