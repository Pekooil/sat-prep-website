import Link from 'next/link'
import { TrendingUp, Target, Sparkles, CalendarCheck, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ScoreCardProps {
  label: string
  value: number | null
  suffix?: string
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red' | 'violet'
  description?: string
  href?: string
}

const colorMap = {
  blue: {
    bg:   'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: TrendingUp,
    iconColor: 'text-blue-500 dark:text-blue-400',
    accent: 'from-blue-500',
  },
  indigo: {
    bg:   'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: Target,
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    accent: 'from-indigo-500',
  },
  emerald: {
    bg:   'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: CalendarCheck,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    accent: 'from-emerald-500',
  },
  amber: {
    bg:   'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: AlertCircle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    accent: 'from-amber-500',
  },
  red: {
    bg:   'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    icon: AlertCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    accent: 'from-red-500',
  },
  violet: {
    bg:   'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    icon: Sparkles,
    iconColor: 'text-violet-500 dark:text-violet-400',
    accent: 'from-violet-500',
  },
}

export function ScoreCard({ label, value, suffix = '', color, description, href }: ScoreCardProps) {
  const colors = colorMap[color]
  const Icon = colors.icon
  const card = (
    <Card className={cn(
      'overflow-hidden group transition-all duration-200',
      href && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
    )}>
      {/* Colored top accent line */}
      <div className={cn('h-0.5 w-full bg-gradient-to-r to-transparent', colors.accent)} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-wide)] leading-none">
              {label}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold leading-none font-mono tabular-nums', colors.text)}>
                {value !== null ? value : '—'}
              </span>
              {value !== null && suffix && (
                <span className="text-xs text-[var(--muted-foreground)]">{suffix}</span>
              )}
            </div>
            {description && (
              <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)] truncate">{description}</p>
            )}
          </div>
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200',
            colors.bg,
            href && 'group-hover:scale-110',
          )}>
            <Icon className={cn('h-4 w-4', colors.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{card}</Link>
  return card
}
