'use client'

import * as React from 'react'
import { Target, TrendingUp, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { OnboardingStep1Data } from '@/types'

interface Step1Props {
  data: OnboardingStep1Data
  onChange: (data: OnboardingStep1Data) => void
  errors: Partial<Record<keyof OnboardingStep1Data, string>>
}

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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-xs)] space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2 text-[var(--text-body)]">
          <Icon className="h-4 w-4 text-[var(--accent-soft-foreground)]" />
          {label}
        </Label>
        <span className={cn(
          'sp-numeric text-2xl font-semibold tracking-tight',
          value >= 1400 ? 'text-emerald-600 dark:text-emerald-400'
          : value >= 1100 ? 'text-[var(--accent-soft-foreground)]'
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
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-sunken) ${pct}%)`
          }}
        />
        <div className="flex justify-between mt-1.5">
          {SCORE_MARKS.map(m => (
            <span key={m} className={cn(
              'sp-numeric text-[10px]',
              Math.abs(value - m) < 20 ? 'font-medium text-[var(--accent-soft-foreground)]' : 'text-[var(--text-muted)]'
            )}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--text-muted)]">{helpText}</p>
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

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <Target className="h-6 w-6" />
        </span>
        <h2 className="sp-display text-2xl">Set your SAT goals</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Where are you now, and where do you want to be?
        </p>
      </div>

      {/* Score gap highlight */}
      {gap > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-soft-foreground)]">Score Gap</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {gap <= 100 ? 'Very achievable with consistent practice!' :
                 gap <= 200 ? 'Challenging but definitely doable.' :
                 'Ambitious goal — strong commitment required.'}
              </p>
            </div>
            <div className="text-right">
              <span className="sp-numeric text-3xl font-semibold text-[var(--accent-soft-foreground)]">+{gap}</span>
              <p className="text-xs text-[var(--text-muted)]">points to gain</p>
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
        helpText="Use 400 if you haven't taken a practice test yet"
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
    </div>
  )
}
