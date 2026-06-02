import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ScoreCardProps {
  label: string
  value: number | null
  suffix?: string
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red'
  description?: string
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

export function ScoreCard({ label, value, suffix = '', color, description }: ScoreCardProps) {
  const colors = colorMap[color]
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">{label}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={cn('text-3xl font-bold', colors.text)}>
                {value !== null ? value.toLocaleString() : '—'}
              </span>
              {value !== null && suffix && (
                <span className="text-sm text-[var(--muted-foreground)]">{suffix}</span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)] truncate">{description}</p>
            )}
          </div>
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', colors.bg)}>
            <div className={cn('h-3 w-3 rounded-full', colors.dot)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
