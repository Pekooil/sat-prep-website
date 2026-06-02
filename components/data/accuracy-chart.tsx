'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { QuestionSession } from '@/types'

interface AccuracyChartProps {
  sessions: QuestionSession[]
}

export function AccuracyChart({ sessions }: AccuracyChartProps) {
  const categoryMap: Record<string, { attempted: number; correct: number; subject: string }> = {}

  for (const s of sessions) {
    if (!categoryMap[s.category]) {
      categoryMap[s.category] = { attempted: 0, correct: 0, subject: s.subject }
    }
    categoryMap[s.category].attempted += s.questions_attempted ?? 0
    categoryMap[s.category].correct += s.questions_correct ?? 0
  }

  const data = Object.entries(categoryMap)
    .map(([cat, { attempted, correct, subject }]) => ({
      name: cat.length > 20 ? cat.slice(0, 18) + '…' : cat,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      attempted,
      subject,
    }))
    .filter(d => d.attempted > 0)
    .sort((a, b) => a.accuracy - b.accuracy)

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-medium">No practice sessions yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Log question sessions to see your accuracy by topic.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Accuracy by Topic</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(val, _name, props) => [`${val}% (${props.payload.attempted} questions)`, 'Accuracy']}
            />
            <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.accuracy >= 80 ? '#10b981'
                    : entry.accuracy >= 60 ? '#3b82f6'
                    : entry.accuracy >= 40 ? '#f59e0b'
                    : '#ef4444'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--muted-foreground)] flex-wrap">
          <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> ≥80%</div>
          <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> 60–79%</div>
          <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-500" /> 40–59%</div>
          <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" /> &lt;40%</div>
        </div>
      </CardContent>
    </Card>
  )
}
