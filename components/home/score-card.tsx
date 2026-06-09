import Link from 'next/link'
import { TrendingUp, Target, Sparkles, CalendarCheck, AlertCircle, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ScoreCardProps {
  label: string
  value: number | null
  suffix?: string
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red' | 'violet'
  description?: string
  href?: string
}

// `color` is retained in the prop contract; it now only selects an icon.
// Stat tiles read as calm neutral surfaces — color is reserved for intent elsewhere.
const ICONS: Record<ScoreCardProps['color'], LucideIcon> = {
  blue:    TrendingUp,
  indigo:  Target,
  emerald: CalendarCheck,
  amber:   AlertCircle,
  red:     AlertCircle,
  violet:  Sparkles,
}

export function ScoreCard({ label, value, suffix = '', color, description, href }: ScoreCardProps) {
  const Icon = ICONS[color]
  const card = (
    <Card interactive={!!href} className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="sp-eyebrow leading-none">{label}</p>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="sp-numeric text-2xl font-semibold leading-none text-[var(--text-heading)]">
              {value !== null ? value : '—'}
            </span>
            {value !== null && suffix && (
              <span className="text-xs text-[var(--text-muted)]">{suffix}</span>
            )}
          </div>
          {description && (
            <p className="mt-2 truncate text-[11px] text-[var(--text-muted)]">{description}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--text-muted)]">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  )
  if (href) return <Link href={href} className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)]">{card}</Link>
  return card
}
