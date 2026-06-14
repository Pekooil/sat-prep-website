'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryItemWithStats } from '@/actions/question-inventory'

interface InventoryChartsProps {
  items: InventoryItemWithStats[]
}

const DIFF_ORDER = ['easy', 'medium', 'hard'] as const

function remainingColor(pct: number) {
  if (pct > 50) return '#16a34a'
  if (pct > 20) return '#d97706'
  return '#dc2626'
}

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

function domainColor(domain: string) {
  return DOMAIN_COLORS[domain] ?? '#6b7280'
}

const DOMAIN_SHORT: Record<string, string> = {
  'Problem-Solving and Data Analysis': 'Problem-Solving & Data',
  'Geometry and Trigonometry':         'Geometry & Trig',
  'Standard English Conventions':      'Standard English',
  'Expression of Ideas':               'Expression of Ideas',
  'Information and Ideas':             'Info & Ideas',
  'Craft and Structure':               'Craft & Structure',
  'Advanced Math':                     'Advanced Math',
  'Algebra':                           'Algebra',
}

export function InventoryCharts({ items }: InventoryChartsProps) {
  // Chart 1: by section
  const sectionData = [...new Set(items.map(i => i.section))].map(section => {
    const rows = items.filter(i => i.section === section)
    return {
      name: section === 'Reading and Writing' ? 'R&W' : 'Math',
      available: rows.reduce((s, r) => s + r.available_count, 0),
      assigned:  rows.reduce((s, r) => s + r.assigned, 0),
      completed: rows.reduce((s, r) => s + r.completed, 0),
      remaining: rows.reduce((s, r) => s + r.remaining, 0),
    }
  })

  // Chart 2: by difficulty
  const diffData = DIFF_ORDER.map(diff => {
    const rows = items.filter(i => i.difficulty === diff)
    return {
      name: diff.charAt(0).toUpperCase() + diff.slice(1),
      available: rows.reduce((s, r) => s + r.available_count, 0),
      remaining: rows.reduce((s, r) => s + r.remaining, 0),
      assigned:  rows.reduce((s, r) => s + r.assigned, 0),
    }
  })

  // Chart 3: questions available by domain
  const depletedDomains = [...new Set(items.map(i => i.domain))]
    .map(domain => {
      const rows = items.filter(i => i.domain === domain)
      const remaining = rows.reduce((s, r) => s + r.remaining, 0)
      const available = rows.reduce((s, r) => s + r.available_count, 0)
      return {
        name: DOMAIN_SHORT[domain] ?? domain,
        fullName: domain,
        remaining,
        available,
        color: domainColor(domain),
      }
    })
    .sort((a, b) => b.available - a.available)
    .slice(0, 8)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* By section */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Inventory by Section</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectionData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--foreground)' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="available" name="Available" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assigned"  name="Assigned"  fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By difficulty */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Inventory by Difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={diffData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--foreground)' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="available" name="Available" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" radius={[4, 4, 0, 0]}>
                {diffData.map((entry, i) => (
                  <Cell key={i} fill={remainingColor(entry.available > 0 ? (entry.remaining / entry.available) * 100 : 100)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Most depleted domains */}
      <Card className="bg-[var(--card)] border-[var(--border)] lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Questions Available by Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depletedDomains} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={160} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${v} questions`, 'Available']}

                contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--foreground)' }}
              />
              <Bar dataKey="available" name="Available" radius={[0, 4, 4, 0]}>
                {depletedDomains.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
