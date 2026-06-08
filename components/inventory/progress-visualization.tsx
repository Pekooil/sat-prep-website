'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryItemWithStats } from '@/actions/question-inventory'

interface ProgressVisualizationProps {
  items: InventoryItemWithStats[]
}

function CircularProgress({ pct, size = 120, strokeWidth = 10 }: { pct: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const cx = size / 2
  const cy = size / 2

  const color = pct > 50 ? '#16a34a' : pct > 20 ? '#d97706' : '#dc2626'

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

interface SectionStats {
  section: string
  available: number
  assigned: number
  completed: number
  remaining: number
}

export function ProgressVisualization({ items }: ProgressVisualizationProps) {
  const totalAvailable  = items.reduce((s, i) => s + i.available_count, 0)
  const totalRemaining  = items.reduce((s, i) => s + i.remaining, 0)
  const overallPct      = totalAvailable > 0 ? Math.round((totalRemaining / totalAvailable) * 100) : 0

  // Per-section breakdown
  const sectionMap = new Map<string, SectionStats>()
  for (const item of items) {
    const prev = sectionMap.get(item.section) ?? {
      section: item.section,
      available: 0, assigned: 0, completed: 0, remaining: 0,
    }
    sectionMap.set(item.section, {
      ...prev,
      available:  prev.available  + item.available_count,
      assigned:   prev.assigned   + item.assigned,
      completed:  prev.completed  + item.completed,
      remaining:  prev.remaining  + item.remaining,
    })
  }
  const sections = [...sectionMap.values()]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Overall circular progress */}
      <Card className="bg-[var(--card)] border-[var(--border)] flex flex-col items-center justify-center py-6">
        <CardHeader className="pb-2 pt-0 text-center">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Overall Remaining</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 pb-4">
          <div className="relative">
            <CircularProgress pct={overallPct} size={120} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[var(--foreground)]">{overallPct}%</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">remaining</span>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {items.reduce((s, i) => s + i.remaining, 0).toLocaleString()} of {totalAvailable.toLocaleString()} questions
          </p>
        </CardContent>
      </Card>

      {/* Section breakdown */}
      <Card className="bg-[var(--card)] border-[var(--border)] md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Section Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {sections.map(s => {
            const pct = s.available > 0 ? Math.round((s.remaining / s.available) * 100) : 0
            const assignedPct = s.available > 0 ? Math.round((s.assigned / s.available) * 100) : 0
            const completedPct = s.available > 0 ? Math.round((s.completed / s.available) * 100) : 0
            const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'

            return (
              <div key={s.section}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-[var(--foreground)]">{s.section}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {s.remaining.toLocaleString()} / {s.available.toLocaleString()} remaining
                  </span>
                </div>
                {/* Stacked bar */}
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div
                    className="h-full bg-violet-500 dark:bg-violet-600 transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                  />
                  <div
                    className="h-full bg-blue-400 dark:bg-blue-500 transition-all duration-500"
                    style={{ width: `${assignedPct}%` }}
                  />
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-violet-500" /> Completed</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-400" /> Assigned</span>
                  <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-sm ${barColor}`} /> Remaining</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
