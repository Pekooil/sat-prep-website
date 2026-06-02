import { Clock, Target, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getAccuracyPercent } from '@/lib/utils'

interface StatsCardsProps {
  totalMinutes: number
  totalAttempted: number
  totalCorrect: number
  unmasteredErrors: number
  masteredErrors: number
  latestScore: number | null
}

export function StatsCards({
  totalMinutes, totalAttempted, totalCorrect,
  unmasteredErrors, masteredErrors, latestScore,
}: StatsCardsProps) {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const accuracy = getAccuracyPercent(totalCorrect, totalAttempted)

  const stats = [
    {
      icon: TrendingUp,
      label: 'Latest Score',
      value: latestScore ? latestScore.toString() : '—',
      sub: 'out of 1600',
      color: 'blue',
    },
    {
      icon: Clock,
      label: 'Total Study Time',
      value: totalMinutes > 0 ? `${hours}h ${mins}m` : '0h',
      sub: `${Math.round(totalMinutes / 60 * 10) / 10} hours total`,
      color: 'indigo',
    },
    {
      icon: Target,
      label: 'Questions Practiced',
      value: totalAttempted.toLocaleString(),
      sub: `${totalCorrect} correct`,
      color: 'violet',
    },
    {
      icon: BookOpen,
      label: 'Accuracy Rate',
      value: totalAttempted > 0 ? `${accuracy}%` : 'N/A',
      sub: totalAttempted > 0 ? `${totalAttempted - totalCorrect} incorrect` : 'No data yet',
      color: 'emerald',
    },
    {
      icon: CheckCircle2,
      label: 'Errors Mastered',
      value: masteredErrors.toString(),
      sub: `${unmasteredErrors} still to review`,
      color: 'amber',
    },
  ]

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'text-violet-600 dark:text-violet-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(({ icon: Icon, label, value, sub, color }) => {
        const colors = colorClasses[color]
        return (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} mb-3`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-[var(--muted-foreground)] font-medium mt-0.5">{label}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
