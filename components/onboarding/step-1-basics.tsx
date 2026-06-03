'use client'

import * as React from 'react'
import { Target, Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { OnboardingStep1Data } from '@/types'

interface Step1Props {
  data: OnboardingStep1Data
  onChange: (data: OnboardingStep1Data) => void
  errors: Partial<Record<keyof OnboardingStep1Data, string>>
}

const DAILY_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '90 min', value: 90 },
  { label: '2 hours', value: 120 },
]

const SCORE_MARKS = [400, 600, 800, 1000, 1200, 1400, 1600]

function ScoreSlider({
  id, label, value, onChange, min = 400, max = 1600, step = 10, error, icon: Icon, helpText
}: {
  id: string; label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; error?: string
  icon: React.ElementType; helpText?: string
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-500" />
          {label}
        </Label>
        <span className={cn(
          'text-2xl font-bold tabular-nums tracking-tight',
          value >= 1400 ? 'text-emerald-600 dark:text-emerald-400'
          : value >= 1100 ? 'text-blue-600 dark:text-blue-400'
          : 'text-amber-600 dark:text-amber-400'
        )}>
          {value.toLocaleString()}
        </span>
      </div>

      <div className="relative pt-1">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
          style={{
            background: `linear-gradient(to right, #2563eb ${pct}%, var(--border) ${pct}%)`
          }}
        />
        <div className="flex justify-between mt-1">
          {SCORE_MARKS.map(m => (
            <span key={m} className={cn(
              'text-[10px] tabular-nums',
              Math.abs(value - m) < 20 ? 'text-blue-500 font-medium' : 'text-slate-400'
            )}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {helpText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

export function Step1Basics({ data, onChange, errors }: Step1Props) {
  const gap = data.targetScore - data.currentScore
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-8">
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-2">
          <Target className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Set Your SAT Goals</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tell us where you are and where you want to be — we'll build the bridge.
        </p>
      </div>

      {/* Score gap highlight */}
      {gap > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Score Gap</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {gap <= 100 ? 'Very achievable with consistent practice!' :
                 gap <= 200 ? 'Challenging but definitely doable.' :
                 'Ambitious goal — strong commitment required.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">+{gap}</span>
              <p className="text-xs text-blue-500">points to gain</p>
            </div>
          </div>
        </div>
      )}

      {/* Current score */}
      <ScoreSlider
        id="current-score"
        label="Current SAT Score"
        value={data.currentScore}
        onChange={v => onChange({ ...data, currentScore: v })}
        error={errors.currentScore}
        icon={TrendingUp}
        helpText="Enter 400 if you haven't taken a practice test yet"
      />

      {/* Target score */}
      <ScoreSlider
        id="target-score"
        label="Target SAT Score"
        value={data.targetScore}
        onChange={v => onChange({ ...data, targetScore: v })}
        error={errors.targetScore}
        icon={Target}
        helpText="Most top universities look for 1500+"
      />

      {/* Test date */}
      <div className="space-y-2">
        <Label htmlFor="test-date" className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          SAT Test Date
        </Label>
        <Input
          id="test-date"
          type="date"
          min={todayStr}
          value={data.testDate}
          onChange={e => onChange({ ...data, testDate: e.target.value })}
          className={cn(errors.testDate && 'border-red-400 ring-red-400')}
        />
        {errors.testDate && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.testDate}
          </p>
        )}
      </div>

      {/* Daily study minutes */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Daily Study Time
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {DAILY_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ ...data, dailyStudyMinutes: p.value })}
              className={cn(
                'py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all duration-150',
                data.dailyStudyMinutes === p.value
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {errors.dailyStudyMinutes && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.dailyStudyMinutes}
          </p>
        )}
        <p className="text-xs text-slate-400">
          ≈ {Math.round((data.dailyStudyMinutes * 7) / 60)} hrs/week ·
          Consistency beats intensity — even 30 min/day compounds.
        </p>
      </div>
    </div>
  )
}
