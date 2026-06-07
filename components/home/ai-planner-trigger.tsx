'use client'

import * as React from 'react'
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateAIStudyPlan } from '@/actions/ai-planner'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type DayType = 'study' | 'review' | 'rest'
type DaySchedule = Record<number, DayType>   // key = JS getDay() 0–6

interface AIPlannerTriggerProps {
  profile: User | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Mon=1 … Fri=5, Sat=6, Sun=0  (getDay() values)
const DAYS = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
]

const DEFAULT_SCHEDULE: DaySchedule = {
  1: 'study', 2: 'study', 3: 'study', 4: 'study', 5: 'study',
  6: 'review',
  0: 'rest',
}

const DAY_TYPE_ORDER: DayType[] = ['study', 'review', 'rest']

const DAY_TYPE_CONFIG: Record<DayType, { label: string; bg: string; text: string; border: string }> = {
  study:  { label: 'Study',  bg: 'bg-violet-100 dark:bg-violet-900/40',   text: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-300 dark:border-violet-700' },
  review: { label: 'Review', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  rest:   { label: 'Rest',   bg: 'bg-slate-100 dark:bg-slate-800',    text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-600' },
}

// ─── Day picker ───────────────────────────────────────────────────────────────

function DaySchedulePicker({
  schedule,
  onChange,
}: {
  schedule: DaySchedule
  onChange: (s: DaySchedule) => void
}) {
  function cycleDay(dow: number) {
    const current = schedule[dow]
    const idx     = DAY_TYPE_ORDER.indexOf(current)
    const next    = DAY_TYPE_ORDER[(idx + 1) % DAY_TYPE_ORDER.length]
    onChange({ ...schedule, [dow]: next })
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">Customize Schedule</Label>
      <p className="text-[10px] text-[var(--muted-foreground)]">
        Tap each day to cycle: Study → Review → Rest
      </p>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(({ dow, label }) => {
          const type = schedule[dow]
          const cfg  = DAY_TYPE_CONFIG[type]
          return (
            <button
              key={dow}
              type="button"
              onClick={() => cycleDay(dow)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg border py-2 px-1 transition-all text-center select-none',
                cfg.bg, cfg.text, cfg.border,
              )}
            >
              <span className="text-[10px] font-semibold">{label}</span>
              <span className="text-[9px] font-medium leading-none mt-0.5">{cfg.label}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {DAY_TYPE_ORDER.map(type => {
          const cfg   = DAY_TYPE_CONFIG[type]
          const count = Object.values(schedule).filter(t => t === type).length
          return (
            <span key={type} className={cn('text-[10px] font-medium', cfg.text)}>
              {cfg.label}: {count}d/wk
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIPlannerTrigger({ profile }: AIPlannerTriggerProps) {
  const [loading,  setLoading]  = React.useState(false)
  const [success,  setSuccess]  = React.useState(false)
  const [schedule, setSchedule] = React.useState<DaySchedule>(DEFAULT_SCHEDULE)
  const { toast } = useToast()

  const defaultCurrent = profile?.current_score ?? 1100
  const defaultTarget  = profile?.target_score  ?? 1400
  const defaultDate    = profile?.test_date      ?? ''
  const defaultMinutes = profile?.daily_study_minutes ?? 60

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const result = await generateAIStudyPlan({
      currentScore:  Number(fd.get('current_score')),
      targetScore:   Number(fd.get('target_score')),
      testDate:      fd.get('test_date') as string,
      minutesPerDay: Number(fd.get('minutes_per_day')),
      daySchedule:   schedule,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      setSuccess(true)
      toast({
        title: 'Plan generated!',
        description: 'Your personalized plan has been added to the calendar.',
      })
    }
  }

  return (
    <Card className="h-full flex flex-col border-violet-200 dark:border-violet-800 bg-gradient-to-b from-violet-50/50 to-white dark:from-violet-950/20 dark:to-[var(--card)]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-violet-500" />
          AI Adaptive Replanner
        </CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          Generates a personalized week-by-week plan. Domain priorities are set automatically from your session data.
        </p>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col justify-center">
        {success ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6 text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Plan created!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Check your Calendar tab to see your schedule.</p>
            <button
              className="text-xs text-emerald-700 dark:text-emerald-400 underline mt-1 cursor-pointer"
              onClick={() => setSuccess(false)}
            >
              Generate a new plan
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="current_score">Current Score</Label>
                <Input
                  id="current_score" name="current_score"
                  type="number" min={400} max={1600} step={10}
                  defaultValue={defaultCurrent}
                  className="h-9 text-sm" required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="target_score">Target Score</Label>
                <Input
                  id="target_score" name="target_score"
                  type="number" min={400} max={1600} step={10}
                  defaultValue={defaultTarget}
                  className="h-9 text-sm" required
                />
              </div>
            </div>

            {/* Test date + minutes per day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="test_date">Test Date</Label>
                <Input
                  id="test_date" name="test_date"
                  type="date" defaultValue={defaultDate}
                  className="h-9 text-sm" required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="minutes_per_day">Min/Day</Label>
                <Input
                  id="minutes_per_day" name="minutes_per_day"
                  type="number" min={15} max={300} step={15}
                  defaultValue={defaultMinutes}
                  className="h-9 text-sm" required
                />
              </div>
            </div>

            {/* Day schedule */}
            <DaySchedulePicker schedule={schedule} onChange={setSchedule} />

            {/* Divider */}
            <div className="border-t border-violet-100 dark:border-violet-900" />

            {/* Generate button */}
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating plan…</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />Generate Plan</>
              )}
            </Button>

            <p className="text-[10px] text-[var(--muted-foreground)] text-center leading-relaxed">
              Domain priorities are set automatically based on your question session history.
              No questions are stored or displayed.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
