'use client'

import { Sparkles, AlertCircle, Loader2, Calendar, Clock, Target, TrendingUp, BookOpen, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIOnboardingRec, OnboardingAnalysis } from '@/types'

interface Step4Props {
  aiRecs: AIOnboardingRec | null
  loading: boolean
  error: string | null
  analysis: OnboardingAnalysis
  dailyStudyMinutes: number
  onRetry: () => void
}

export function Step4Recommendations({
  aiRecs, loading, error, analysis, dailyStudyMinutes, onRetry
}: Step4Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-violet-500/30 border-t-violet-600 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-lg">Building your plan…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">This only takes a moment.</p>
        </div>
        <div className="flex flex-col items-start gap-1.5 text-xs text-slate-400">
          {['Mapping your score goal…', 'Scheduling your study days…', 'Prioritizing SAT domains…'].map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-violet-500 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Couldn't build recommendations</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{error}</p>
        </div>
        <button onClick={onRetry} className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium">
          Try again
        </button>
        <p className="text-xs text-slate-400 max-w-xs">
          You can still finish setup — your plan will be generated from the Home page.
        </p>
      </div>
    )
  }

  const estimatedWeeks = aiRecs?.estimatedTimelineWeeks ?? Math.ceil(analysis.studyDays / 7)
  const weeklyHours = Math.round((dailyStudyMinutes * 7) / 60)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 mb-1">
          <CheckCircle2 className="h-8 w-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-bold">Your Plan is Ready</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          A personalized day-by-day schedule has been built for you.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Target,
            label: 'Score Goal',
            value: `+${analysis.scoreGap}`,
            sub: 'points to gain',
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
          },
          {
            icon: Calendar,
            label: 'Study Days',
            value: analysis.studyDays,
            sub: `≈ ${estimatedWeeks} weeks`,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          },
          {
            icon: Clock,
            label: 'Daily Goal',
            value: `${dailyStudyMinutes}m`,
            sub: `${weeklyHours} hrs/week`,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
          },
          {
            icon: TrendingUp,
            label: 'Est. Gain',
            value: `+${analysis.estimatedImprovement}`,
            sub: 'potential pts',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={cn('rounded-xl p-4', bg)}>
            <Icon className={cn('h-5 w-5 mb-2', color)} />
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-[10px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* What happens next */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          What happens next
        </p>
        {[
          {
            icon: Calendar,
            title: 'Check your Calendar',
            desc: 'Daily tasks are already scheduled — open the Calendar to see them.',
          },
          {
            icon: BookOpen,
            title: 'Practice on College Board',
            desc: 'Each task includes Question Bank filter settings to use on the CB website.',
          },
          {
            icon: Sparkles,
            title: 'Your plan adapts',
            desc: 'Log your sessions and the planner automatically adjusts your priorities.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-relaxed px-4">
        Tasks link to College Board Question Bank filters only — no SAT questions are stored here.
      </p>
    </div>
  )
}
