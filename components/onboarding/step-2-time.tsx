'use client'

import { Clock, Calendar, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { OnboardingStep1Data } from '@/types'

interface Step2TimeProps {
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

export function Step2Time({ data, onChange, errors }: Step2TimeProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const weeklyHours = Math.round((data.dailyStudyMinutes * 7) / 60)

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <Clock className="h-6 w-6" />
        </span>
        <h2 className="sp-display text-2xl">When &amp; how much</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Set your test date and daily study commitment.
        </p>
      </div>

      {/* Test date */}
      <div className="space-y-2">
        <Label htmlFor="test-date" className="flex items-center gap-2 text-[var(--text-body)]">
          <Calendar className="h-4 w-4 text-[var(--accent-soft-foreground)]" />
          SAT Test Date
        </Label>
        <Input
          id="test-date"
          type="date"
          min={todayStr}
          value={data.testDate}
          onChange={e => onChange({ ...data, testDate: e.target.value })}
          className={cn('h-11', errors.testDate && 'border-red-400 ring-red-400')}
        />
        {errors.testDate ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.testDate}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Don't have a date yet? Pick a target date — you can change it later.
          </p>
        )}
      </div>

      {/* Daily study minutes */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-[var(--text-body)]">
          <Clock className="h-4 w-4 text-[var(--accent-soft-foreground)]" />
          Daily Study Time
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {DAILY_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ ...data, dailyStudyMinutes: p.value })}
              className={cn(
                'rounded-[var(--radius)] border px-1 py-2.5 text-xs font-semibold transition-all duration-150',
                data.dailyStudyMinutes === p.value
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-accent)]'
                  : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-body)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]'
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
        <p className="text-xs text-[var(--text-muted)]">
          ≈ {weeklyHours} hrs/week · Consistency beats intensity — even 30 min/day compounds.
        </p>
      </div>
    </div>
  )
}
