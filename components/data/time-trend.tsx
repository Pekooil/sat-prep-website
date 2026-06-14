'use client'

import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { QuestionSession } from '@/types'

const DOMAIN_HEX: Record<string, string> = {
  'Algebra':                              '#3b82f6',
  'Advanced Math':                        '#6366f1',
  'Problem-Solving and Data Analysis':    '#f97316',
  'Geometry and Trigonometry':            '#14b8a6',
  'Information and Ideas':                '#22c55e',
  'Craft and Structure':                  '#f43f5e',
  'Expression of Ideas':                  '#f59e0b',
  'Standard English Conventions':         '#06b6d4',
}

const DOMAIN_ABBR: Record<string, string> = {
  'Problem-Solving and Data Analysis': 'PSDA',
  'Geometry and Trigonometry':         'Geo & Trig',
  'Standard English Conventions':      'Std English',
  'Expression of Ideas':               'Expression',
  'Information and Ideas':             'Info & Ideas',
  'Craft and Structure':               'Craft',
  'Advanced Math':                     'Adv Math',
  'Algebra':                           'Algebra',
}

const TIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  padding: '8px 12px',
  color: 'var(--foreground)',
}

interface TaskRow {
  category: string | null
  duration_minutes: number | null
  is_completed: boolean
}

export interface TimeTrendProps {
  sessions: QuestionSession[]
  tasks: TaskRow[]
}

export function TimeTrend({ sessions, tasks }: TimeTrendProps) {
  // Allocated: completed tasks only (unstarted future tasks excluded)
  const allocatedMap = new Map<string, number>()
  for (const t of tasks) {
    if (!t.is_completed || !t.category || !t.duration_minutes) continue
    allocatedMap.set(t.category, (allocatedMap.get(t.category) ?? 0) + t.duration_minutes)
  }

  // Actual: sessions that recorded time
  const actualMap = new Map<string, number>()
  for (const s of sessions) {
    if (!s.category || !s.time_spent_minutes) continue
    actualMap.set(s.category, (actualMap.get(s.category) ?? 0) + s.time_spent_minutes)
  }

  const domains = new Set([...allocatedMap.keys(), ...actualMap.keys()])

  const data = [...domains]
    .map(domain => ({
      domain,
      label: DOMAIN_ABBR[domain] ?? domain,
      color: DOMAIN_HEX[domain] ?? '#6b7280',
      allocated: allocatedMap.get(domain) ?? 0,
      actual:    actualMap.get(domain)    ?? 0,
    }))
    .filter(d => d.allocated > 0 || d.actual > 0)
    .sort((a, b) => b.allocated - a.allocated)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time by Domain</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-sunken)] mb-3">
            <Clock className="h-5 w-5 text-[var(--text-muted)]" strokeWidth={1.75} />
          </div>
          <p className="font-medium text-sm">No session data yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Complete study sessions to see time comparisons by domain.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartHeight = Math.min(480, Math.max(180, data.length * 52 + 32))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Time by Domain</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              Allocated vs. actual time logged per domain
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[11px] text-[var(--muted-foreground)] pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: '#94a3b8' }} />
              Allocated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: '#7c3aed' }} />
              Actual
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v}m`}
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
              width={100}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any, name: any) => [
                `${val} min`,
                name === 'allocated' ? 'Allocated' : 'Actual',
              ]}
            />
            <Bar dataKey="allocated" name="allocated" fill="#94a3b8" radius={[0, 3, 3, 0]} maxBarSize={14} />
            <Bar dataKey="actual"    name="actual"    radius={[0, 3, 3, 0]} maxBarSize={14}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
