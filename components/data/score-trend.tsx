'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatShortDate, testTypeLabel } from '@/lib/utils'
import type { ScoreHistory } from '@/types'

interface ScoreTrendProps {
  scores: ScoreHistory[]
  targetScore: number | null
}

const TIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
}

const TEST_MARKERS: Record<string, string> = {
  diagnostic:  '#94a3b8',
  practice:    '#6366f1',
  official:    '#f59e0b',
  full_length: '#10b981',
}

export function ScoreTrend({ scores, targetScore }: ScoreTrendProps) {
  if (scores.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Progression</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <p className="text-3xl mb-3">🎯</p>
          <p className="font-medium text-sm">No scores logged</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Log a practice or official test score to start tracking.
          </p>
        </CardContent>
      </Card>
    )
  }

  const data = scores.map(s => ({
    date:     formatShortDate(s.test_date),
    Total:    s.total_score,
    Math:     s.math_score,
    'R & W':  s.reading_writing_score,
    testType: testTypeLabel(s.test_type),
    dotColor: TEST_MARKERS[s.test_type] ?? '#6366f1',
  }))

  const latestScore = scores.at(-1)?.total_score ?? null
  const firstScore  = scores[0]?.total_score ?? null
  const gain        = latestScore && firstScore ? latestScore - firstScore : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Score Progression</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Actual test scores over time</p>
          </div>
          {gain !== null && (
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {gain > 0 ? '+' : ''}{gain}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">pts gained</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={248}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
            />
            <YAxis
              domain={[400, 1600]}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              formatter={(val, name) => [val, String(name)]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any, payload: any) => {
                const type = payload?.[0]?.payload?.testType ?? ''
                return `${String(label)}${type ? ` · ${type}` : ''}`
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {targetScore && (
              <ReferenceLine
                y={targetScore}
                stroke="#22c55e"
                strokeDasharray="6 3"
                label={{ value: `Target ${targetScore}`, fontSize: 10, fill: '#22c55e', position: 'insideTopRight' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="Total"
              fill="url(#scoreGrad)"
              stroke="none"
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line type="monotone" dataKey="Math"  stroke="#3b82f6" strokeWidth={1.5}
              dot={{ r: 3 }} strokeDasharray="5 4" />
            <Line type="monotone" dataKey="R & W" stroke="#ec4899" strokeWidth={1.5}
              dot={{ r: 3 }} strokeDasharray="5 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
