import * as React from 'react'
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './card'

type DeltaDirection = 'up' | 'down' | 'neutral'

interface Delta {
  value: string | number
  direction?: DeltaDirection
  /** When true, "down" is good (e.g. fewer errors) and is shown green. */
  invert?: boolean
}

function deltaTone(direction: DeltaDirection, invert: boolean) {
  if (direction === 'neutral') return 'text-[var(--text-muted)] bg-[var(--surface-sunken)]'
  const positive = invert ? direction === 'down' : direction === 'up'
  return positive
    ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15'
    : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/15'
}

function DeltaBadge({ value, direction = 'neutral', invert = false }: Delta) {
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold sp-numeric',
        deltaTone(direction, invert)
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {value}
    </span>
  )
}

/* ----------------------------------------------------------------
   StatCard — compact KPI tile (label · value · delta)
   ---------------------------------------------------------------- */
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  delta?: Delta
  hint?: string
}

export function StatCard({ label, value, icon: Icon, delta, hint, className, ...props }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.75} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="sp-numeric text-2xl font-semibold text-[var(--text-heading)]">{value}</span>
        {delta && <DeltaBadge {...delta} />}
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </Card>
  )
}

/* ----------------------------------------------------------------
   MetricCard — hero metric (eyebrow · large numeric · delta · chart)
   ---------------------------------------------------------------- */
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  unit?: string
  delta?: Delta
  /** Optional sparkline / mini chart rendered below the value. */
  chart?: React.ReactNode
  footer?: React.ReactNode
  tone?: 'brand' | 'neutral'
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  chart,
  footer,
  tone = 'neutral',
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5',
        tone === 'brand' && 'border-violet-200/60 dark:border-violet-500/20',
        className
      )}
      {...props}
    >
      {tone === 'brand' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 sp-mesh opacity-70" />
      )}
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="sp-eyebrow">{label}</p>
          {delta && <DeltaBadge {...delta} />}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="sp-numeric text-4xl font-semibold tracking-[var(--tracking-tight)] text-[var(--text-heading)]">
            {value}
          </span>
          {unit && <span className="text-sm font-medium text-[var(--text-muted)]">{unit}</span>}
        </div>
        {chart && <div className="mt-3 -mx-1 h-12">{chart}</div>}
        {footer && <div className="mt-3 text-xs text-[var(--text-muted)]">{footer}</div>}
      </div>
    </Card>
  )
}

export { DeltaBadge }
