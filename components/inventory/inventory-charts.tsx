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

  // Chart 3: most depleted skills (remaining / available lowest)
  const depletedSkills = [...items]
    .filter(i => i.available_count > 0)
    .map(i => ({
      name: i.skill.length > 28 ? i.skill.slice(0, 26) + '…' : i.skill,
      fullName: i.skill,
      pct: Math.round((i.remaining / i.available_count) * 100),
      remaining: i.remaining,
      available: i.available_count,
    }))
    .sort((a, b) => a.pct - b.pct)
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
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="available" name="Available" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assigned"  name="Assigned"  fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#34d399" radius={[4, 4, 0, 0]} />
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
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="available" name="Available" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" radius={[4, 4, 0, 0]}>
                {diffData.map((entry, i) => (
                  <Cell key={i} fill={remainingColor(entry.available > 0 ? (entry.remaining / entry.available) * 100 : 100)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Most depleted skills */}
      <Card className="bg-[var(--card)] border-[var(--border)] lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Most Depleted Skills (% remaining)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depletedSkills} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--border)" tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--border)" width={180} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, _name: any, entry: any) =>
                  [`${v}% (${entry?.payload?.remaining ?? 0}/${entry?.payload?.available ?? 0})`, 'Remaining']
                }
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="pct" name="Remaining %" radius={[0, 4, 4, 0]}>
                {depletedSkills.map((entry, i) => (
                  <Cell key={i} fill={remainingColor(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
