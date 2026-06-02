'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { QuestionSession } from '@/types'

type ErrorSummary = {
  subject: 'math' | 'reading_writing'
  category: string
  error_type: string
  mastered: boolean
}

interface CategoryStatsProps {
  errors: ErrorSummary[]
  sessions: QuestionSession[]
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  concept: '#ef4444',
  careless: '#f59e0b',
  time: '#8b5cf6',
  strategy: '#3b82f6',
  other: '#6b7280',
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  concept: 'Concept Gap',
  careless: 'Careless',
  time: 'Time Mgmt',
  strategy: 'Strategy',
  other: 'Other',
}

export function CategoryStats({ errors, sessions }: CategoryStatsProps) {
  const errorTypeCounts: Record<string, number> = {}
  for (const e of errors) {
    errorTypeCounts[e.error_type] = (errorTypeCounts[e.error_type] ?? 0) + 1
  }
  const pieData = Object.entries(errorTypeCounts).map(([type, count]) => ({
    name: ERROR_TYPE_LABELS[type] ?? type,
    value: count,
    type,
  }))

  const categoryErrors: Record<string, { count: number; mastered: number; subject: string }> = {}
  for (const e of errors) {
    if (!categoryErrors[e.category]) {
      categoryErrors[e.category] = { count: 0, mastered: 0, subject: e.subject }
    }
    categoryErrors[e.category].count++
    if (e.mastered) categoryErrors[e.category].mastered++
  }

  const topErrors = Object.entries(categoryErrors)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Error type breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Error Types</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[var(--muted-foreground)] text-sm">No errors logged yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ERROR_TYPE_COLORS[entry.type] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val, name) => [`${val} errors`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top error categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Errors by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {topErrors.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[var(--muted-foreground)] text-sm">No error data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topErrors.map(([category, { count, mastered, subject }]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={subject === 'math' ? 'math' : 'reading'} className="text-[9px] py-0 shrink-0">
                        {subject === 'math' ? 'M' : 'RW'}
                      </Badge>
                      <span className="font-medium truncate">{category}</span>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] shrink-0 ml-2">
                      {mastered}/{count} mastered
                    </div>
                  </div>
                  <Progress value={count > 0 ? (mastered / count) * 100 : 0} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
