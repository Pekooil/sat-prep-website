import { CalendarDays, TrendingUp } from 'lucide-react'
import type { User } from '@/types'
import { daysUntilTest, formatDate } from '@/lib/utils'

interface WelcomeBannerProps {
  profile: User | null
}

export function WelcomeBanner({ profile }: WelcomeBannerProps) {
  const days = daysUntilTest(profile?.test_date ?? null)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg">
      <div className="absolute right-0 top-0 opacity-10">
        <TrendingUp className="h-48 w-48 -translate-y-8 translate-x-8" />
      </div>
      <div className="relative">
        <p className="text-blue-200 text-sm font-medium">{greeting},</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{firstName}! 👋</h1>
        {days !== null ? (
          <div className="mt-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-200" />
            <span className="text-sm text-blue-100">
              {days > 0 ? (
                <>
                  <span className="font-bold text-white">{days} days</span> until your SAT
                  {profile?.test_date && ` · ${formatDate(profile.test_date)}`}
                </>
              ) : days === 0 ? (
                <span className="font-bold text-yellow-300">🎯 Your SAT is today! Good luck!</span>
              ) : (
                <span className="text-blue-200">Your SAT has passed — log your official score!</span>
              )}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-blue-200">Set your test date to get a personalized countdown.</p>
        )}
      </div>
    </div>
  )
}
