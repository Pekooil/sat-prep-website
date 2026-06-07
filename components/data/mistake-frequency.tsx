'use client'

import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'

export interface ErrorSummary {
  subject: 'math' | 'reading_writing'
  category: string
  subcategory: string | null
  error_type: string
  mastered: boolean
  created_at: string
}

interface MistakeFrequencyProps {
  errors: ErrorSummary[]
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  concept:  { label: 'Concept Gap',      color: '#ef4444' },
  careless: { label: 'Careless Error',   color: '#f59e0b' },
  time:     { label: 'Timing Issue',     color: '#3b82f6' },
  strategy: { label: 'Strategy Error',   color: '#f97316' },
  other:    { label: 'Other',            color: '#22c55e' },
}

const TIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.12), 0 2px 6px -2px rgba(15,23,42,0.08)',
  padding: '8px 12px',
}

export function MistakeFrequency({ errors }: MistakeFrequencyProps) {
  // Count by type
  const counts: Record<string, number> = {}
  for (const e of errors) {
    counts[e.error_type] = (counts[e.error_type] ?? 0) + 1
  }

  const data = Object.entries(TYPE_META).map(([type, { label, color }]) => ({
    type,
    label,
    color,
    count: counts[type] ?? 0,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  const total = data.reduce((s, d) => s + d.count, 0)

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mistake Frequency</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="font-medium text-sm">No mistakes logged</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Log errors from practice sessions to see patterns.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Mistake Frequency</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Error breakdown by type</p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] shrink-0">{total} total</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={108}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(val: any, _name: any, props: any) => [
                `${val} errors (${Math.round((Number(val) / total) * 100)}%)`,
                props?.payload?.label ?? '',
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Mini breakdown row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {data.map(d => (
            <div key={d.type} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-[var(--foreground)] font-medium">{d.count}</span>
              <span className="text-[var(--muted-foreground)]">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
