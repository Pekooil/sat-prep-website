import { Clock, Target, BookOpen, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAccuracyPercent } from '@/lib/utils'

interface QuickStatsProps {
  totalMinutes: number
  totalAttempted: number
  totalCorrect: number
  unmasteredErrors: number
}

export function QuickStats({ totalMinutes, totalAttempted, totalCorrect, unmasteredErrors }: QuickStatsProps) {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const accuracy = getAccuracyPercent(totalCorrect, totalAttempted)

  const stats = [
    {
      icon: Clock,
      label: 'Study Time',
      value: totalMinutes > 0 ? `${hours}h ${mins}m` : '0h',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: Target,
      label: 'Questions Practiced',
      value: totalAttempted.toLocaleString(),
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      icon: BookOpen,
      label: 'Overall Accuracy',
      value: totalAttempted > 0 ? `${accuracy}%` : 'N/A',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      icon: AlertCircle,
      label: 'Errors to Review',
      value: unmasteredErrors.toString(),
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-xs text-[var(--muted-foreground)] leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
