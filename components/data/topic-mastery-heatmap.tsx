'use client'

import { LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseISO, format, startOfWeek } from 'date-fns'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import { cn } from '@/lib/utils'
import type { QuestionSession } from '@/types'

interface TopicMasteryHeatmapProps {
  sessions: QuestionSession[]
}

function weekKey(dateStr: string): string {
  const ws = startOfWeek(parseISO(dateStr), { weekStartsOn: 1 })
  return format(ws, 'yyyy-MM-dd')
}

function cellBg(acc: number | null): string {
  if (acc === null) return 'bg-slate-100 dark:bg-slate-800/60'
  if (acc >= 90)   return 'bg-emerald-500 dark:bg-emerald-600'
  if (acc >= 75)   return 'bg-emerald-400 dark:bg-emerald-700'
  if (acc >= 60)   return 'bg-amber-400 dark:bg-amber-500'
  if (acc >= 40)   return 'bg-orange-400 dark:bg-orange-500'
  return 'bg-red-500 dark:bg-red-600'
}

function cellText(acc: number | null): string {
  return acc === null ? 'text-[var(--muted-foreground)]' : 'text-white'
}

export function TopicMasteryHeatmap({ sessions }: TopicMasteryHeatmapProps) {
  // Build domain → week → { a, c } map
  const map: Record<string, Record<string, { a: number; c: number }>> = {}
  const allWeeks = new Set<string>()

  for (const s of sessions) {
    if (!s.session_date || !s.category) continue
    const wk = weekKey(s.session_date)
    allWeeks.add(wk)
    map[s.category] ??= {}
    map[s.category][wk] ??= { a: 0, c: 0 }
    map[s.category][wk].a += s.questions_attempted ?? 0
    map[s.category][wk].c += s.questions_correct   ?? 0
  }

  const sortedWeeks = [...allWeeks].sort().slice(-12) // last 12 weeks
  const domains = DOMAIN_CATALOG.filter(d => map[d.label])

  if (domains.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Topic Mastery Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <LayoutGrid className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>
          <p className="font-medium text-sm">No data yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Complete sessions to build your mastery heatmap.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Topic Mastery Over Time</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          Accuracy per domain per week (last 12 weeks)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-1 min-w-[520px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-medium pb-1 w-40">Domain</th>
                {sortedWeeks.map(wk => (
                  <th key={wk} className="text-[var(--muted-foreground)] font-normal text-center whitespace-nowrap pb-1">
                    {format(parseISO(wk), 'M/d')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map(domain => (
                <tr key={domain.key}>
                  <td className="pr-2 py-0.5 font-medium text-[var(--foreground)] truncate max-w-[160px]">
                    <span title={domain.label}>
                      {domain.label.length > 24 ? domain.label.slice(0, 22) + '…' : domain.label}
                    </span>
                  </td>
                  {sortedWeeks.map(wk => {
                    const d    = map[domain.label]?.[wk]
                    const acc  = d && d.a > 0 ? Math.round((d.c / d.a) * 100) : null
                    return (
                      <td key={wk} className="p-0 text-center">
                        <div
                          title={acc !== null ? `${acc}% · ${d!.a} questions` : 'No data'}
                          className={cn(
                            'h-7 rounded flex items-center justify-center font-semibold tabular-nums',
                            cellBg(acc), cellText(acc),
                          )}
                        >
                          {acc !== null ? `${acc}%` : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-[var(--muted-foreground)] flex-wrap">
          {[
            { bg: 'bg-slate-100 dark:bg-slate-800/60', label: 'No data' },
            { bg: 'bg-red-500', label: '<40%' },
            { bg: 'bg-orange-400', label: '40–59%' },
            { bg: 'bg-amber-400', label: '60–74%' },
            { bg: 'bg-emerald-400', label: '75–89%' },
            { bg: 'bg-emerald-500', label: '≥90%' },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={cn('h-3 w-3 rounded', bg)} />
              {label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
