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
    <div className="space-y-8">
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mb-2">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">When & How Much</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Set your test date and daily study commitment.
        </p>
      </div>

      {/* Test date */}
      <div className="space-y-2">
        <Label htmlFor="test-date" className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-500" />
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
        {errors.testDate ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.testDate}
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Don't have a date yet? Pick a target date — you can change it later.
          </p>
        )}
      </div>

      {/* Daily study minutes */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-500" />
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
                  ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600'
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
          ≈ {weeklyHours} hrs/week · Consistency beats intensity — even 30 min/day compounds.
        </p>
      </div>
    </div>
  )
}
