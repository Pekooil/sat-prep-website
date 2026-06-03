'use client'

import { BookOpen, TrendingDown, TrendingUp, Calendar, Target, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import type { OnboardingAnalysis, DomainStat } from '@/types'

interface Step3Props {
  analysis: OnboardingAnalysis
  step1CurrentScore: number
  step1TargetScore: number
}

function LevelBadge({ level }: { level: DomainStat['level'] }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
      level === 'weak' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      level === 'moderate' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      level === 'strong' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    )}>
      {level === 'weak' ? '⚠ Needs Work' : level === 'moderate' ? '↗ Moderate' : '✓ Strong'}
    </span>
  )
}

const ACCURACY_COLOR = (acc: number) =>
  acc >= 75 ? '#10b981' : acc >= 55 ? '#f59e0b' : '#ef4444'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: DomainStat = payload[0].payload
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{d.label}</p>
      <p className={d.subject === 'math' ? 'text-emerald-500' : 'text-violet-500'}>
        {d.subject === 'math' ? 'Math' : 'Reading & Writing'}
      </p>
      <p className="mt-1">
        <span className="font-bold" style={{ color: ACCURACY_COLOR(d.accuracy) }}>
          {d.accuracy}%
        </span>{' '}
        accuracy ({d.correct}/{d.attempted})
      </p>
    </div>
  )
}

export function Step3Analysis({ analysis, step1CurrentScore, step1TargetScore }: Step3Props) {
  const { domains, weakDomains, strongDomains, studyDays, scoreGap, overallAccuracy } = analysis

  // Build chart data — short labels for chart
  const chartData = domains
    .filter(d => d.attempted > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map(d => ({
      ...d,
      shortLabel: d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label,
    }))

  const noData = domains.every(d => d.attempted === 0)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mb-2">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Your SAT Analysis</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Here's what the data says — and where to focus first.
        </p>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Score Gap',
            value: `+${scoreGap}`,
            sub: 'points to gain',
            icon: Target,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            label: 'Study Days',
            value: studyDays,
            sub: 'until test',
            icon: Calendar,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          },
          {
            label: 'Overall Accuracy',
            value: noData ? 'N/A' : `${overallAccuracy}%`,
            sub: 'across all topics',
            icon: Zap,
            color: overallAccuracy >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            bg: overallAccuracy >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            label: 'Priority Areas',
            value: weakDomains.length,
            sub: 'topics to fix first',
            icon: TrendingDown,
            color: weakDomains.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
            bg: weakDomains.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 ${bg}`}>
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Accuracy chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Accuracy by Topic
          </h3>
          <ResponsiveContainer width="100%" height={chartData.length * 42 + 20}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={v => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortLabel"
                tick={{ fontSize: 11 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                x={75}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                x={55}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="accuracy" radius={[0, 5, 5, 0]} maxBarSize={20}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={ACCURACY_COLOR(entry.accuracy)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-emerald-500 inline-block" /> ≥75% Strong</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-amber-400 inline-block" /> 55–74% Moderate</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-red-400 inline-block" /> &lt;55% Needs Work</span>
          </div>
        </div>
      )}

      {/* Weak areas */}
      {weakDomains.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Priority Focus Areas ({weakDomains.length})
          </h3>
          <div className="space-y-2">
            {weakDomains.map(d => (
              <div key={d.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    d.subject === 'math'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                  )}>
                    {d.subject === 'math' ? 'M' : 'RW'}
                  </span>
                  <span className="text-sm font-medium truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-red-200 dark:bg-red-900">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${d.accuracy}%` }} />
                  </div>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums w-8 text-right">
                    {d.attempted > 0 ? `${d.accuracy}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strong areas */}
      {strongDomains.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Your Strengths — Keep Them Sharp
          </h3>
          <div className="flex flex-wrap gap-2">
            {strongDomains.map(d => (
              <div key={d.key} className="flex items-center gap-1.5 bg-white dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1">
                <span className="text-xs font-medium">{d.label}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{d.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noData && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-6 text-center">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">No practice data entered</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            That's okay! Your AI plan will focus on all topics evenly and adapt as you log practice sessions.
          </p>
        </div>
      )}
    </div>
  )
}
