'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import type { ReplanAuditLog } from '@/types'

// Short display labels for the radar
const SHORT_LABEL: Record<string, string> = {
  'Algebra':                             'Algebra',
  'Advanced Math':                       'Adv. Math',
  'Problem-Solving and Data Analysis':   'PSDA',
  'Geometry and Trigonometry':           'Geometry',
  'Information and Ideas':               'Info & Ideas',
  'Craft and Structure':                 'Craft & Struct',
  'Expression of Ideas':                 'Expression',
  'Standard English Conventions':        'Std. English',
}

type DomainPriority = {
  label: string
  newPriorityScore: number
  newAccuracy: number
}

const TIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
}

interface ReplanAuditLogProps { replans: ReplanAuditLog[] }

export function WorkloadRedistribution({ replans }: ReplanAuditLogProps) {
  if (replans.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <p className="text-3xl mb-3">🕸</p>
          <p className="font-medium text-sm">No replan data</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Priority distribution will appear after the first replan.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Latest run
  const latest   = [...replans].reverse()[0]
  const previous = replans.length >= 2 ? [...replans].reverse()[1] : null

  const latestDomains  = (latest.domains_reprioritized  as DomainPriority[] | null) ?? []
  const previousDomains = (previous?.domains_reprioritized as DomainPriority[] | null) ?? []

  const prevMap = new Map(previousDomains.map(d => [d.label, d.newPriorityScore]))

  const chartData = latestDomains.map(d => ({
    domain:   SHORT_LABEL[d.label] ?? d.label,
    fullName: d.label,
    Current:  d.newPriorityScore,
    Previous: prevMap.get(d.label) ?? null,
  }))

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-14">
          <p className="text-sm text-[var(--muted-foreground)]">No domain data yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workload Distribution</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          Domain priority scores from the adaptive planner
          {previous ? ' — current vs. previous run' : ' — latest run'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={chartData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
              tickCount={4}
            />
            <Tooltip
              contentStyle={TIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(val: any, name: any, props: any) => [
                `Priority ${val}`,
                `${String(name)}: ${props?.payload?.fullName ?? ''}`,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
            <Radar
              name="Current"
              dataKey="Current"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            {previous && (
              <Radar
                name="Previous"
                dataKey="Previous"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.1}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

