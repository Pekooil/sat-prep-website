'use client'

import * as React from 'react'
import { BarChart2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { OnboardingStep2Data, CategoryPerf } from '@/types'

interface Step2Props {
  data: OnboardingStep2Data
  onChange: (data: OnboardingStep2Data) => void
  errors: Record<string, string>
}

type Section = 'reading_writing' | 'math'
type RWKey = keyof OnboardingStep2Data['reading_writing']
type MathKey = keyof OnboardingStep2Data['math']

const RW_CATEGORIES: { key: RWKey; label: string; shortLabel: string; description: string }[] = [
  { key: 'informationIdeas', label: 'Information and Ideas', shortLabel: 'Info & Ideas', description: 'Evidence, central ideas, inferences' },
  { key: 'craftStructure', label: 'Craft and Structure', shortLabel: 'Craft & Structure', description: 'Vocabulary, text purpose, cross-text' },
  { key: 'expressionIdeas', label: 'Expression of Ideas', shortLabel: 'Expression', description: 'Rhetorical synthesis, transitions' },
  { key: 'standardEnglish', label: 'Standard English Conventions', shortLabel: 'Conventions', description: 'Grammar, punctuation, form' },
]

const MATH_CATEGORIES: { key: MathKey; label: string; shortLabel: string; description: string }[] = [
  { key: 'algebra', label: 'Algebra', shortLabel: 'Algebra', description: 'Linear equations, systems, inequalities' },
  { key: 'advancedMath', label: 'Advanced Math', shortLabel: 'Advanced Math', description: 'Quadratics, polynomials, exponentials' },
  { key: 'problemSolving', label: 'Problem-Solving and Data Analysis', shortLabel: 'Problem Solving', description: 'Ratios, statistics, probability' },
  { key: 'geometry', label: 'Geometry and Trigonometry', shortLabel: 'Geometry', description: 'Area, triangles, circles, trig' },
]

function accuracyColor(acc: number | null) {
  if (acc === null) return 'bg-slate-200 dark:bg-slate-700'
  if (acc >= 75) return 'bg-emerald-500'
  if (acc >= 55) return 'bg-amber-400'
  return 'bg-red-400'
}

function accuracyLabel(acc: number | null) {
  if (acc === null) return null
  if (acc >= 75) return { text: 'Strong', color: 'text-emerald-600 dark:text-emerald-400' }
  if (acc >= 55) return { text: 'Moderate', color: 'text-amber-600 dark:text-amber-400' }
  return { text: 'Weak', color: 'text-red-600 dark:text-red-400' }
}

interface CategoryRowProps {
  label: string
  shortLabel: string
  description: string
  perf: CategoryPerf
  onChangeAttempted: (v: number) => void
  onChangeCorrect: (v: number) => void
  error?: string
  color: string
}

function CategoryRow({
  label, shortLabel, description, perf, onChangeAttempted, onChangeCorrect, error, color
}: CategoryRowProps) {
  const accuracy = perf.attempted > 0 ? Math.round((perf.correct / perf.attempted) * 100) : null
  const label_ = accuracyLabel(accuracy)
  const hasData = perf.attempted > 0

  return (
    <div className={cn(
      'rounded-xl border-2 transition-all duration-200 p-4',
      error
        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
        : hasData
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
            <p className="text-sm font-semibold leading-tight">{shortLabel}</p>
            {label_ && (
              <span className={`text-xs font-medium ${label_.color}`}>{label_.text}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
        </div>

        {/* Accuracy bar */}
        {hasData && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-lg font-bold tabular-nums">{accuracy}%</span>
            <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={cn('h-full rounded-full transition-all duration-500', accuracyColor(accuracy))}
                style={{ width: `${accuracy}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Questions Attempted</label>
          <Input
            type="number"
            min={0}
            max={999}
            placeholder="0"
            value={perf.attempted || ''}
            onChange={e => {
              const v = Math.max(0, parseInt(e.target.value) || 0)
              onChangeAttempted(v)
            }}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Questions Correct</label>
          <Input
            type="number"
            min={0}
            max={perf.attempted || 999}
            placeholder="0"
            value={perf.correct || ''}
            onChange={e => {
              const v = Math.max(0, parseInt(e.target.value) || 0)
              onChangeCorrect(v)
            }}
            className={cn('h-9 text-sm', error && 'border-red-400')}
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

export function Step2Performance({ data, onChange, errors }: Step2Props) {
  const totalAttempted = [
    ...Object.values(data.reading_writing),
    ...Object.values(data.math),
  ].reduce((s, c) => s + c.attempted, 0)

  const totalCorrect = [
    ...Object.values(data.reading_writing),
    ...Object.values(data.math),
  ].reduce((s, c) => s + c.correct, 0)

  const overallAccuracy = totalAttempted > 0
    ? Math.round((totalCorrect / totalAttempted) * 100)
    : null

  function updateRW(key: RWKey, field: 'attempted' | 'correct', value: number) {
    onChange({
      ...data,
      reading_writing: {
        ...data.reading_writing,
        [key]: { ...data.reading_writing[key], [field]: value },
      },
    })
  }

  function updateMath(key: MathKey, field: 'attempted' | 'correct', value: number) {
    onChange({
      ...data,
      math: {
        ...data.math,
        [key]: { ...data.math[key], [field]: value },
      },
    })
  }

  const RW_COLORS = ['bg-violet-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500']
  const MATH_COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500']

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 mb-2">
          <BarChart2 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Enter Your Practice Data</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your most recent SAT practice results by category. Skip categories with no data.
        </p>
      </div>

      {/* Overall summary */}
      {totalAttempted > 0 && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {totalAttempted} questions entered · {totalCorrect} correct
            </p>
            {overallAccuracy !== null && (
              <p className="text-xs text-slate-500 mt-0.5">
                Overall accuracy: <span className={cn(
                  'font-bold',
                  overallAccuracy >= 75 ? 'text-emerald-600' : overallAccuracy >= 55 ? 'text-amber-600' : 'text-red-600'
                )}>{overallAccuracy}%</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reading & Writing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-violet-500" />
          <h3 className="text-sm font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
            Reading & Writing
          </h3>
        </div>
        {RW_CATEGORIES.map((cat, i) => (
          <CategoryRow
            key={cat.key}
            label={cat.label}
            shortLabel={cat.shortLabel}
            description={cat.description}
            perf={data.reading_writing[cat.key]}
            onChangeAttempted={v => updateRW(cat.key, 'attempted', v)}
            onChangeCorrect={v => updateRW(cat.key, 'correct', v)}
            error={errors[`rw_${cat.key}`]}
            color={RW_COLORS[i]}
          />
        ))}
      </div>

      {/* Math */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            Math
          </h3>
        </div>
        {MATH_CATEGORIES.map((cat, i) => (
          <CategoryRow
            key={cat.key}
            label={cat.label}
            shortLabel={cat.shortLabel}
            description={cat.description}
            perf={data.math[cat.key]}
            onChangeAttempted={v => updateMath(cat.key, 'attempted', v)}
            onChangeCorrect={v => updateMath(cat.key, 'correct', v)}
            error={errors[`math_${cat.key}`]}
            color={MATH_COLORS[i]}
          />
        ))}
      </div>

      {errors._general && (
        <p className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" /> {errors._general}
        </p>
      )}

      <p className="text-xs text-center text-slate-400 dark:text-slate-500">
        Enter 0 / 0 if you have no data for a category — you can always update this later.
      </p>
    </div>
  )
}
