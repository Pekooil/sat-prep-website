'use client'

import { BookOpen, CalendarCheck, CheckCircle2, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SummaryCardsProps {
  totalAvailable: number
  totalAssigned: number
  totalCompleted: number
  totalRemaining: number
}

export function SummaryCards({
  totalAvailable,
  totalAssigned,
  totalCompleted,
  totalRemaining,
}: SummaryCardsProps) {
  const usedPct = totalAvailable > 0 ? Math.round((totalAssigned / totalAvailable) * 100) : 0
  const donePct  = totalAvailable > 0 ? Math.round((totalCompleted / totalAvailable) * 100) : 0

  const cards = [
    {
      label: 'Total Available',
      value: totalAvailable.toLocaleString(),
      sub: 'Questions in QB catalog',
      icon: BookOpen,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      label: 'Total Assigned',
      value: totalAssigned.toLocaleString(),
      sub: `${usedPct}% of available`,
      icon: CalendarCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Total Completed',
      value: totalCompleted.toLocaleString(),
      sub: `${donePct}% of available`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Remaining',
      value: totalRemaining.toLocaleString(),
      sub: 'Questions still available',
      icon: Package,
      color: totalRemaining / Math.max(totalAvailable, 1) < 0.2
        ? 'text-red-600 dark:text-red-400'
        : totalRemaining / Math.max(totalAvailable, 1) < 0.5
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-slate-600 dark:text-slate-400',
      bg: totalRemaining / Math.max(totalAvailable, 1) < 0.2
        ? 'bg-red-100 dark:bg-red-900/30'
        : totalRemaining / Math.max(totalAvailable, 1) < 0.5
          ? 'bg-amber-100 dark:bg-amber-900/30'
          : 'bg-slate-100 dark:bg-slate-800/60',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <Card key={card.label} className="bg-[var(--card)] border-[var(--border)]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)] font-medium mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{card.value}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{card.sub}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
