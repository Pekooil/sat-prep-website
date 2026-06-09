'use client'

import { Target } from 'lucide-react'
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
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: 'var(--shadow-lg)',
  padding: '8px 12px',
  color: 'var(--foreground)',
}

const TEST_MARKERS: Record<string, string> = {
  diagnostic:  'var(--text-muted)',
  practice:    'var(--accent)',
  official:    'var(--warning)',
  full_length: 'var(--success)',
}

export function ScoreTrend({ scores, targetScore }: ScoreTrendProps) {
  if (scores.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Progression</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-sunken)] mb-3">
            <Target className="h-5 w-5 text-[var(--text-muted)]" strokeWidth={1.75} />
          </div>
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
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.16} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
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
                stroke="var(--success)"
                strokeDasharray="6 3"
                label={{ value: `Target ${targetScore}`, fontSize: 10, fill: 'var(--success)', position: 'insideTopRight' }}
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
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line type="monotone" dataKey="Math"  stroke="var(--text-body)" strokeWidth={1.5}
              dot={{ r: 3 }} strokeDasharray="5 4" />
            <Line type="monotone" dataKey="R & W" stroke="var(--text-muted)" strokeWidth={1.5}
              dot={{ r: 3 }} strokeDasharray="5 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
