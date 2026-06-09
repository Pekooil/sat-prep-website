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

  // Low-stock warning kept as a meaningful value accent on the Remaining tile.
  const lowStock = totalRemaining / Math.max(totalAvailable, 1) < 0.2
  const midStock = totalRemaining / Math.max(totalAvailable, 1) < 0.5

  const cards = [
    { label: 'Total Available', value: totalAvailable.toLocaleString(), sub: 'Questions in QB catalog', icon: BookOpen,      valueColor: 'text-[var(--text-heading)]' },
    { label: 'Total Assigned',  value: totalAssigned.toLocaleString(),  sub: `${usedPct}% of available`, icon: CalendarCheck, valueColor: 'text-[var(--text-heading)]' },
    { label: 'Total Completed', value: totalCompleted.toLocaleString(), sub: `${donePct}% of available`, icon: CheckCircle2,  valueColor: 'text-[var(--text-heading)]' },
    {
      label: 'Remaining',
      value: totalRemaining.toLocaleString(),
      sub: 'Questions still available',
      icon: Package,
      valueColor: lowStock ? 'text-[var(--destructive)]' : midStock ? 'text-[var(--warning)]' : 'text-[var(--text-heading)]',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-1">{card.label}</p>
                  <p className={`sp-numeric text-2xl font-semibold ${card.valueColor}`}>{card.value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.sub}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--text-muted)]">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
