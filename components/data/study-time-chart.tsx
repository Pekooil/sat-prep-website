'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { parseISO, format, startOfWeek } from 'date-fns'
import type { QuestionSession } from '@/types'

interface StudyTimeChartProps {
  sessions: QuestionSession[]
  tasks: {
    task_date: string
    duration_minutes: number | null
    is_completed: boolean
  }[]
}

function wk(dateStr: string): { key: string; date: Date } {
  const ws = startOfWeek(parseISO(dateStr), { weekStartsOn: 1 })
  return { key: format(ws, 'yyyy-MM-dd'), date: ws }
}

const TIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
}

export function StudyTimeChart({ sessions, tasks }: StudyTimeChartProps) {
  // Build week → { planned, actual } aggregation
  type Bucket = { planned: number; actual: number; date: Date }
  const map = new Map<string, Bucket>()

  const ensure = (key: string, date: Date): Bucket => {
    if (!map.has(key)) map.set(key, { planned: 0, actual: 0, date })
    return map.get(key)!
  }

  for (const t of tasks) {
    if (!t.task_date) continue
    const { key, date } = wk(t.task_date)
    ensure(key, date).planned += t.duration_minutes ?? 0
  }
  for (const s of sessions) {
    if (!s.session_date) continue
    const { key, date } = wk(s.session_date)
    ensure(key, date).actual += s.time_spent_minutes ?? 0
  }

  const data = [...map.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(b => ({
      week:      format(b.date, 'MMM d'),
      Planned:   Math.round(b.planned),
      Completed: Math.round(b.actual),
    }))

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Study Time</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <p className="text-3xl mb-3">⏱</p>
          <p className="font-medium text-sm">No study time data</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Create a study plan and log sessions to track time.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalPlanned   = data.reduce((s, d) => s + d.Planned, 0)
  const totalCompleted = data.reduce((s, d) => s + d.Completed, 0)
  const pct            = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Study Time: Completed vs Planned</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Minutes per week</p>
          </div>
          {pct !== null && (
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {pct}%
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">completion rate</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={248}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v: number) => `${v}m`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              formatter={(val, name) => {
                const v = Number(val)
                const h = Math.floor(v / 60)
                const m = v % 60
                return [h > 0 ? `${h}h ${m}m` : `${m}m`, String(name)]
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="Planned"   fill="#c7d2fe" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
