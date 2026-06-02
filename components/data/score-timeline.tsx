'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatShortDate, testTypeLabel } from '@/lib/utils'
import type { ScoreHistory } from '@/types'

interface ScoreTimelineProps {
  scores: ScoreHistory[]
}

export function ScoreTimeline({ scores }: ScoreTimelineProps) {
  const data = scores.map(s => ({
    date: formatShortDate(s.test_date),
    Total: s.total_score,
    Math: s.math_score,
    'Reading & Writing': s.reading_writing_score,
    type: testTypeLabel(s.test_type),
  }))

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium">No score history yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Log your first practice or official score to start tracking progress.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Score Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-slate-500" />
            <YAxis domain={[400, 1600]} tick={{ fontSize: 11 }} className="text-slate-500" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(val, name) => [val, name]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={1400} stroke="#10b981" strokeDasharray="4 4" label={{ value: '1400', fontSize: 10, fill: '#10b981' }} />
            <Line type="monotone" dataKey="Total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Math" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Reading & Writing" stroke="#ec4899" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
