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
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mb-2">
          <TrendingUp className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Your Study Overview</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Here's the roadmap we're building for you.
        </p>
      </div>

      {/* Score journey */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Score Journey
        </p>
        <div className="relative">
          {/* Track */}
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-visible relative">
            {/* Fill between current and target */}
            <div
              className="absolute top-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-500 opacity-30"
              style={{ left: `${currentPct}%`, width: `${targetPct - currentPct}%` }}
            />
            {/* Current dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-800 shadow-md z-10"
              style={{ left: `calc(${currentPct}% - 10px)` }}
            />
            {/* Target dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-violet-600 border-2 border-white dark:border-slate-800 shadow-md z-10"
              style={{ left: `calc(${targetPct}% - 10px)` }}
            />
          </div>
          {/* Labels */}
          <div className="flex justify-between mt-4 px-1 text-sm">
            <div className="text-center">
              <p className="font-bold text-amber-600 dark:text-amber-400 text-lg">{step1CurrentScore}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Now</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-violet-600 dark:text-violet-400 text-lg">+{scoreGap}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Points to gain</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-violet-600 dark:text-violet-400 text-lg">{step1TargetScore}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Goal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4">
          <Calendar className="h-5 w-5 text-violet-500 mb-2" />
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{studyDays}</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Days until test</p>
          <p className="text-[10px] text-slate-400">≈ {estimatedWeeks} weeks</p>
        </div>
        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-4">
          <Clock className="h-5 w-5 text-violet-500 mb-2" />
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{dailyStudyMinutes}m</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Daily commitment</p>
          <p className="text-[10px] text-slate-400">≈ {weeklyHours} hrs/week</p>
        </div>
      </div>

      {/* Practice test count */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{practiceTestCount}</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Bluebook practice test{practiceTestCount !== 1 ? 's' : ''} scheduled
          </p>
          <p className="text-[10px] text-slate-400">
            Every 2 weeks + one 2 days before your test
          </p>
        </div>
      </div>

      {/* Domain coverage */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Layers className="h-5 w-5 text-violet-500 shrink-0" />
          <p className="text-sm font-semibold">All 8 SAT Domains Covered</p>
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
              <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive note */}
      <div className={cn(
        'rounded-xl p-4 flex items-start gap-3',
        'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50'
      )}>
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Your plan adapts as you study
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            After each practice session, the planner reprioritizes your weakest areas automatically.
          </p>
        </div>
      </div>

      {/* Score target note */}
      <div className="rounded-xl p-4 flex items-start gap-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
        <Target className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 dark:text-violet-300">
          Your plan focuses on reaching <strong>{step1TargetScore}</strong> by targeting the highest-leverage domains first — so every session moves the needle.
        </p>
      </div>
    </div>
  )
}
