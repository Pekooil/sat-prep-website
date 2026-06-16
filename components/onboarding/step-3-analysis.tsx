'use client'

import { Target, Calendar, Clock, Layers, CheckCircle2, TrendingUp, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingAnalysis } from '@/types'

interface Step3Props {
  analysis: OnboardingAnalysis
  step1CurrentScore: number
  step1TargetScore: number
  dailyStudyMinutes: number
}

export function Step3Analysis({ analysis, step1CurrentScore, step1TargetScore, dailyStudyMinutes }: Step3Props) {
  const { scoreGap, studyDays, practiceTestCount } = analysis
  const weeklyHours = Math.round((dailyStudyMinutes * 7) / 60)
  const estimatedWeeks = Math.ceil(studyDays / 7)

  // Score journey visual (current → target on a 400–1600 scale)
  const scaleMin = 400
  const scaleMax = 1600
  const currentPct = ((step1CurrentScore - scaleMin) / (scaleMax - scaleMin)) * 100
  const targetPct = ((step1TargetScore - scaleMin) / (scaleMax - scaleMin)) * 100

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <TrendingUp className="h-6 w-6" />
        </span>
        <h2 className="sp-display text-2xl">Your study overview</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Here's the roadmap we're building for you.
        </p>
      </div>

      {/* Score journey */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-xs)] space-y-4">
        <p className="sp-eyebrow">Score Journey</p>
        <div className="relative">
          {/* Track */}
          <div className="h-3 w-full rounded-full bg-[var(--surface-sunken)] overflow-visible relative">
            {/* Fill between current and target */}
            <div
              className="absolute top-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-[var(--accent)] opacity-40"
              style={{ left: `${currentPct}%`, width: `${targetPct - currentPct}%` }}
            />
            {/* Current dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-amber-400 border-2 border-[var(--surface-raised)] shadow-md z-10"
              style={{ left: `calc(${currentPct}% - 10px)` }}
            />
            {/* Target dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[var(--accent)] border-2 border-[var(--surface-raised)] shadow-md z-10"
              style={{ left: `calc(${targetPct}% - 10px)` }}
            />
          </div>
          {/* Labels */}
          <div className="flex justify-between mt-4 px-1 text-sm">
            <div className="text-center">
              <p className="sp-numeric text-lg font-semibold text-amber-600 dark:text-amber-400">{step1CurrentScore}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Now</p>
            </div>
            <div className="text-center">
              <p className="sp-numeric text-lg font-semibold text-[var(--accent-soft-foreground)]">+{scoreGap}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Points to gain</p>
            </div>
            <div className="text-center">
              <p className="sp-numeric text-lg font-semibold text-[var(--accent-soft-foreground)]">{step1TargetScore}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Goal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-xs)]">
          <Calendar className="mb-2 h-5 w-5 text-[var(--accent-soft-foreground)]" />
          <p className="sp-numeric text-2xl font-semibold text-[var(--text-heading)]">{studyDays}</p>
          <p className="text-xs font-medium text-[var(--text-body)]">Days until test</p>
          <p className="text-[10px] text-[var(--text-muted)]">≈ {estimatedWeeks} weeks</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-xs)]">
          <Clock className="mb-2 h-5 w-5 text-[var(--accent-soft-foreground)]" />
          <p className="sp-numeric text-2xl font-semibold text-[var(--text-heading)]">{dailyStudyMinutes}m</p>
          <p className="text-xs font-medium text-[var(--text-body)]">Daily commitment</p>
          <p className="text-[10px] text-[var(--text-muted)]">≈ {weeklyHours} hrs/week</p>
        </div>
      </div>

      {/* Practice test count */}
      <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--accent-soft)] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--surface-raised)] text-[var(--accent-soft-foreground)] shadow-[var(--shadow-xs)]">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <p className="sp-numeric text-2xl font-semibold text-[var(--accent-soft-foreground)]">{practiceTestCount}</p>
          <p className="text-xs font-medium text-[var(--text-body)]">
            Bluebook practice test{practiceTestCount !== 1 ? 's' : ''} scheduled
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            Every 2 weeks + one 2 days before your test
          </p>
        </div>
      </div>

      {/* Domain coverage */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-xs)]">
        <div className="mb-3 flex items-center gap-3">
          <Layers className="h-5 w-5 shrink-0 text-[var(--accent-soft-foreground)]" />
          <p className="text-sm font-semibold text-[var(--text-heading)]">All 8 SAT Domains Covered</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Information & Ideas', color: 'bg-violet-500' },
            { label: 'Algebra', color: 'bg-emerald-500' },
            { label: 'Craft & Structure', color: 'bg-purple-500' },
            { label: 'Advanced Math', color: 'bg-teal-500' },
            { label: 'Expression of Ideas', color: 'bg-indigo-500' },
            { label: 'Problem Solving', color: 'bg-cyan-500' },
            { label: 'Conventions', color: 'bg-fuchsia-400' },
            { label: 'Geometry & Trig', color: 'bg-sky-500' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
              <span className="truncate text-xs text-[var(--text-body)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive note */}
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Your plan adapts as you study
          </p>
          <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
            After each practice session, the planner reprioritizes your weakest areas automatically.
          </p>
        </div>
      </div>

      {/* Score target note */}
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-soft-foreground)]" />
        <p className="text-xs text-[var(--accent-soft-foreground)]">
          Your plan focuses on reaching <strong>{step1TargetScore}</strong> by targeting the highest-leverage domains first — so every session moves the needle.
        </p>
      </div>
    </div>
  )
}
