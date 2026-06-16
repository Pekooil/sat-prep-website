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
      <div className="flex flex-col items-center justify-center gap-5 py-20">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <Sparkles className="h-7 w-7 text-[var(--accent-soft-foreground)]" />
          </div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--accent)]/25 border-t-[var(--accent)]" />
        </div>
        <div className="space-y-1 text-center">
          <p className="sp-display text-lg">Building your plan…</p>
          <p className="text-sm text-[var(--text-muted)]">This only takes a moment.</p>
        </div>
        <div className="flex flex-col items-start gap-1.5 text-xs text-[var(--text-muted)]">
          {['Mapping your score goal…', 'Scheduling your study days…', 'Prioritizing SAT domains…'].map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--accent-soft-foreground)]" />
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
          <p className="sp-display text-lg">Couldn't build recommendations</p>
          <p className="max-w-xs text-sm text-[var(--text-muted)]">{error}</p>
        </div>
        <button onClick={onRetry} className="text-sm font-medium text-[var(--accent-soft-foreground)] hover:underline">
          Try again
        </button>
        <p className="max-w-xs text-xs text-[var(--text-muted)]">
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
      <div className="space-y-2 text-center">
        <span className="mb-1 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="sp-display text-2xl">Your plan is ready</h2>
        <p className="mx-auto max-w-xs text-sm text-[var(--text-muted)]">
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
            color: 'text-[var(--accent-soft-foreground)]',
          },
          {
            icon: Calendar,
            label: 'Study Days',
            value: analysis.studyDays,
            sub: `≈ ${estimatedWeeks} weeks`,
            color: 'text-[var(--accent-soft-foreground)]',
          },
          {
            icon: Clock,
            label: 'Daily Goal',
            value: `${dailyStudyMinutes}m`,
            sub: `${weeklyHours} hrs/week`,
            color: 'text-[var(--accent-soft-foreground)]',
          },
          {
            icon: TrendingUp,
            label: 'Est. Gain',
            value: `+${analysis.estimatedImprovement}`,
            sub: 'potential pts',
            color: 'text-emerald-600 dark:text-emerald-400',
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-xs)]">
            <Icon className={cn('mb-2 h-5 w-5', color)} />
            <p className={cn('sp-numeric text-2xl font-semibold', color)}>{value}</p>
            <p className="text-xs font-medium text-[var(--text-body)]">{label}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* What happens next */}
      <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-xs)]">
        <p className="sp-eyebrow">What happens next</p>
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
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-heading)]">{title}</p>
              <p className="text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="px-4 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
        Tasks link to College Board Question Bank filters only — no SAT questions are stored here.
      </p>
    </div>
  )
}
