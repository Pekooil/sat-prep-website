'use client'

import { BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { parseISO, format, startOfWeek } from 'date-fns'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import type { QuestionSession } from '@/types'

interface TopicMasteryTrendsProps {
  sessions: QuestionSession[]
}

// Hex colors matching task-colors.ts domains
const DOMAIN_COLORS: Record<string, string> = {
  'Algebra':                              '#3b82f6',
  'Advanced Math':                        '#6366f1',
  'Problem-Solving and Data Analysis':    '#f97316',
  'Geometry and Trigonometry':            '#14b8a6',
  'Information and Ideas':                '#22c55e',
  'Craft and Structure':                  '#f43f5e',
  'Expression of Ideas':                  '#f59e0b',
  'Standard English Conventions':         '#06b6d4',
}

const DOMAIN_STROKE: Record<string, string> = {
  'Algebra':                              '0',
  'Advanced Math':                        '5 3',
  'Problem-Solving and Data Analysis':    '3 3',
  'Geometry and Trigonometry':            '6 2',
  'Information and Ideas':                '0',
  'Craft and Structure':                  '5 3',
  'Expression of Ideas':                  '3 3',
  'Standard English Conventions':         '6 2',
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

export function TopicMasteryTrends({ sessions }: TopicMasteryTrendsProps) {
  // Build week → domain → accuracy
  type WkMap = Record<string, { a: number; c: number }>
  const domainWeekMap: Record<string, WkMap> = {}
  const allWeeks = new Set<string>()

  for (const s of sessions) {
    if (!s.session_date || !s.category) continue
    const ws  = startOfWeek(parseISO(s.session_date), { weekStartsOn: 1 })
    const wk  = format(ws, 'yyyy-MM-dd')
    allWeeks.add(wk)
    domainWeekMap[s.category]      ??= {}
    domainWeekMap[s.category][wk]  ??= { a: 0, c: 0 }
    domainWeekMap[s.category][wk].a += s.questions_attempted ?? 0
    domainWeekMap[s.category][wk].c += s.questions_correct   ?? 0
  }

  const sortedWeeks = [...allWeeks].sort()

  // Pick domains with at least 2 data points, up to 5
  const activeDomains = DOMAIN_CATALOG
    .filter(d => {
      const wks = domainWeekMap[d.label]
      return wks && Object.values(wks).filter(v => v.a > 0).length >= 1
    })
    .slice(0, 8)

  if (activeDomains.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Topic Mastery Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-sunken)] mb-3">
            <BarChart2 className="h-5 w-5 text-[var(--text-muted)]" strokeWidth={1.75} />
          </div>
          <p className="font-medium text-sm">No data yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Log sessions across multiple topics to see trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Build chart data: one row per week
  const chartData = sortedWeeks.map(wk => {
    const row: Record<string, string | number | null> = { week: format(parseISO(wk), 'MMM d') }
    for (const d of activeDomains) {
      const entry = domainWeekMap[d.label]?.[wk]
      row[d.label] = entry && entry.a > 0
        ? Math.round((entry.c / entry.a) * 100)
        : null
    }
    return row
  })

  // Short labels for legend
  const shortLabel = (label: string) =>
    label.length > 20 ? label.slice(0, 18) + '…' : label

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Topic Mastery Trends</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">Per-domain accuracy over time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              formatter={(val, name) => [`${val}%`, shortLabel(String(name))]}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              formatter={(value: string) => shortLabel(value)}
            />
            <ReferenceLine
              y={90}
              stroke="var(--success)"
              strokeDasharray="4 3"
              label={{ value: '90%', fontSize: 9, fill: 'var(--success)', position: 'insideTopRight' }}
            />
            {activeDomains.map(d => (
              <Line
                key={d.key}
                type="monotone"
                dataKey={d.label}
                stroke={DOMAIN_COLORS[d.label] ?? '#94a3b8'}
                strokeWidth={1.5}
                strokeDasharray={DOMAIN_STROKE[d.label] ?? '0'}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
