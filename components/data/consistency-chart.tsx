'use client'

import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  eachDayOfInterval, format, getDay, parseISO,
  subDays, differenceInDays, isAfter,
} from 'date-fns'
import type { QuestionSession } from '@/types'

interface ConsistencyChartProps {
  sessions: QuestionSession[]
  dateRange: { from: Date | null; to: Date | null }
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cellColor(count: number): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800'
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/70'
  if (count <= 3)  return 'bg-emerald-400 dark:bg-emerald-700'
  return                  'bg-emerald-600 dark:bg-emerald-500'
}

export function ConsistencyChart({ sessions, dateRange }: ConsistencyChartProps) {
  // Calendar always shows last 16 weeks for spatial context
  const calEnd   = new Date()
  const calStart = subDays(calEnd, 16 * 7 - 1)

  // Build day → session count map (all sessions, not date-filtered)
  const dayCounts: Record<string, number> = {}
  for (const s of sessions) {
    if (!s.session_date) continue
    const key = s.session_date.split('T')[0]
    dayCounts[key] = (dayCounts[key] ?? 0) + 1
  }

  // Build weeks grid (Mon–Sun columns)
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Pad beginning so first column starts on Monday
  const firstDow    = getDay(calStart)                  // 0 = Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1 // steps to Monday
  const paddedDays: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...allDays,
  ]
  while (paddedDays.length % 7 !== 0) paddedDays.push(null)

  // Chunk into week columns [[7 days], [7 days], ...]
  const weekCols: (Date | null)[][] = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weekCols.push(paddedDays.slice(i, i + 7))
  }

  // Compute stats from filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (!s.session_date) return false
    const d = parseISO(s.session_date)
    if (dateRange.from && !isAfter(d, subDays(dateRange.from, 1))) return false
    if (dateRange.to   && isAfter(d, dateRange.to))                return false
    return true
  })

  const rangeStart = dateRange.from
    ?? (sessions.length > 0 ? parseISO(sessions[0].session_date) : subDays(new Date(), 30))
  const rangeEnd   = dateRange.to ?? new Date()
  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1)

  const activeDaySet = new Set(
    filteredSessions.map(s => s.session_date?.split('T')[0]).filter(Boolean),
  )
  const activeDays        = activeDaySet.size
  const consistencyScore  = Math.round((activeDays / totalDays) * 100)

  // Current streak (working backwards from today)
  let streak = 0
  let cur    = new Date()
  for (;;) {
    const key = format(cur, 'yyyy-MM-dd')
    if (dayCounts[key]) {
      streak++
      cur = subDays(cur, 1)
    } else break
  }

  // Week column month labels (show if first visible day in col is first of month or col 0)
  const colLabels = weekCols.map(col => {
    const first = col.find(d => d !== null)
    if (!first) return ''
    const dom = first.getDate()
    return dom <= 7 ? format(first, 'MMM') : ''
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Study Consistency</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Activity over the last 16 weeks
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {consistencyScore}%
            </p>
            <div className="flex items-center justify-end gap-0.5 text-[10px] text-[var(--muted-foreground)]">
              {streak > 0 ? (
                <>
                  <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                  <span>{streak}-day streak</span>
                </>
              ) : activeDays > 0 ? (
                <span>{activeDays} study days</span>
              ) : (
                <span>No activity yet</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-[3px] min-w-max">
            {/* Row-label column */}
            <div className="flex flex-col gap-[3px]">
              <div className="h-4" /> {/* month-label spacer */}
              {DAY_LABELS.map(d => (
                <div key={d} className="h-3 text-[9px] text-[var(--muted-foreground)] flex items-center leading-3 pr-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {weekCols.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {/* Month label */}
                <div className="h-4 text-[9px] text-[var(--muted-foreground)] leading-4 whitespace-nowrap">
                  {colLabels[wi]}
                </div>
                {col.map((day, di) => {
                  if (!day) return <div key={di} className="h-3 w-3" />
                  const key   = format(day, 'yyyy-MM-dd')
                  const count = dayCounts[key] ?? 0
                  return (
                    <div
                      key={di}
                      title={`${format(day, 'MMM d')}: ${count} session${count !== 1 ? 's' : ''}`}
                      className={cn('h-3 w-3 rounded-[2px] cursor-default', cellColor(count))}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--muted-foreground)]">
          <span>Less</span>
          {[
            'bg-slate-100 dark:bg-slate-800',
            'bg-emerald-200 dark:bg-emerald-900/70',
            'bg-emerald-400 dark:bg-emerald-700',
            'bg-emerald-600 dark:bg-emerald-500',
          ].map((c, i) => (
            <div key={i} className={cn('h-3 w-3 rounded-[2px]', c)} />
          ))}
          <span>More</span>

          <span className="ml-auto">
            {activeDays} / {totalDays} days active
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
