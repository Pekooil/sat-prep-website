import { CalendarDays, TrendingUp, Flame } from 'lucide-react'
import type { User } from '@/types'
import { daysUntilTest, formatDate } from '@/lib/utils'

interface WelcomeBannerProps {
  profile: User | null
  streak?: number
}

export function WelcomeBanner({ profile, streak = 0 }: WelcomeBannerProps) {
  const days = daysUntilTest(profile?.test_date ?? null)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-700 p-6 text-white shadow-lg">
      <div className="absolute right-0 top-0 opacity-10">
        <TrendingUp className="h-48 w-48 -translate-y-8 translate-x-8" />
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
      </div>
    </div>
  )
}
