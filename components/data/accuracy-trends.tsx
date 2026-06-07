'use client'

import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { parseISO, format, startOfWeek } from 'date-fns'
import type { QuestionSession } from '@/types'

interface AccuracyTrendsProps {
  sessions: QuestionSession[]
}

interface WeekBucket {
  weekDate: Date
  overall: { a: number; c: number }
  math:    { a: number; c: number }
  rw:      { a: number; c: number }
}

function buildTrendData(sessions: QuestionSession[]) {
  const map = new Map<string, WeekBucket>()

  for (const s of sessions) {
    if (!s.session_date) continue
    const d = parseISO(s.session_date)
    const ws = startOfWeek(d, { weekStartsOn: 1 })
    const key = format(ws, 'yyyy-MM-dd')

    if (!map.has(key)) {
      map.set(key, {
        weekDate: ws,
        overall: { a: 0, c: 0 },
        math:    { a: 0, c: 0 },
        rw:      { a: 0, c: 0 },
      })
    }
    const w = map.get(key)!
    const a = s.questions_attempted ?? 0
    const c = s.questions_correct   ?? 0
    w.overall.a += a; w.overall.c += c
    if (s.subject === 'math') { w.math.a += a; w.math.c += c }
    else                       { w.rw.a   += a; w.rw.c   += c }
  }

  return [...map.values()]
    .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
    .map(w => ({
      week:     format(w.weekDate, 'MMM d'),
      Overall:  w.overall.a > 0 ? Math.round((w.overall.c / w.overall.a) * 100) : null,
      Math:     w.math.a    > 0 ? Math.round((w.math.c    / w.math.a)    * 100) : null,
      'R & W':  w.rw.a      > 0 ? Math.round((w.rw.c      / w.rw.a)      * 100) : null,
    }))
}

const TIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.12), 0 2px 6px -2px rgba(15,23,42,0.08)',
  padding: '8px 12px',
}

export function AccuracyTrends({ sessions }: AccuracyTrendsProps) {
  const data = buildTrendData(sessions)

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Accuracy Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-3">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="font-medium text-sm">No sessions yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Complete question sessions to see accuracy trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Accuracy Trends</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">Weekly accuracy — Overall · Math · Reading &amp; Writing</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={248}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              formatter={(val, name) => [`${val}%`, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <ReferenceLine
              y={90}
              stroke="#22c55e"
              strokeDasharray="4 3"
              label={{ value: '90% goal', fontSize: 10, fill: '#22c55e', position: 'insideTopRight' }}
            />
            <Line type="monotone" dataKey="Overall" stroke="#6366f1" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Math" stroke="#3b82f6" strokeWidth={1.5}
              dot={false} strokeDasharray="5 4" connectNulls />
            <Line type="monotone" dataKey="R & W" stroke="#ec4899" strokeWidth={1.5}
              dot={false} strokeDasharray="5 4" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
