'use client'

import * as React from 'react'
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle, Loader2, Clock, BookOpen, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLLEGE_BOARD_QB_URL } from '@/lib/constants'
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
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Sparkles className="h-9 w-9 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 border-t-blue-600 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-bold text-lg">Building your personalized plan…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            Our AI is analyzing your strengths, weak spots, and timeline to craft a study plan just for you.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {[
            'Analyzing your performance data…',
            'Mapping weak areas to College Board domains…',
            'Calculating your optimal study sequence…',
          ].map((msg, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold">Couldn't generate recommendations</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Try again
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-sm">
          You can still complete setup — your data will be saved and you can generate a study plan later from the Home page.
        </p>
      </div>
    )
  }

  if (!aiRecs) return null

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 mb-2">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Your Study Plan is Ready</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalized recommendations based on your performance data.
        </p>
      </div>

      {/* AI personal message */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">AI Coach</p>
            <p className="text-sm leading-relaxed">{aiRecs.message}</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: 'Est. Timeline', value: `${aiRecs.estimatedTimelineWeeks}w`, color: 'text-blue-500' },
          { icon: Clock, label: 'Daily Goal', value: `${dailyStudyMinutes}m`, color: 'text-indigo-500' },
          { icon: BookOpen, label: 'Focus Areas', value: `${analysis.weakDomains.length}`, color: 'text-violet-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <Icon className={`h-5 w-5 ${color} mx-auto mb-1`} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly plan summary */}
      {aiRecs.weeklyPlanSummary && (
        <div className="rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Study Approach
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {aiRecs.weeklyPlanSummary}
          </p>
        </div>
      )}

      {/* Priority topics */}
      {aiRecs.priorityTopics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Priority Topics — Start Here
          </h3>
          {aiRecs.priorityTopics.map((topic, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5',
                  i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-500' : 'bg-blue-500'
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{topic.domain}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      topic.subject === 'Math'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                    )}>
                      {topic.subject}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{topic.reason}</p>
                  {topic.weeklyGoal && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      This week: {topic.weeklyGoal}
                    </p>
                  )}
                </div>
              </div>

              {/* College Board QB filter recommendation */}
              {topic.cbFilters && (
                <div className="ml-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    📋 College Board QB Filters
                  </p>
                  <div className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
                    <p>Domain: <span className="font-semibold">{topic.cbFilters.domain}</span></p>
                    {topic.cbFilters.skill && (
                      <p>Skill: <span className="font-semibold">{topic.cbFilters.skill}</span></p>
                    )}
                    <p>Difficulty: <span className="font-semibold capitalize">{topic.cbFilters.difficulty}</span></p>
                  </div>
                  <a
                    href={COLLEGE_BOARD_QB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold mt-1"
                  >
                    Open College Board Question Bank
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Study tips */}
      {aiRecs.studyTips.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Study Tips for You
          </h3>
          <ul className="space-y-2">
            {aiRecs.studyTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                <span className="text-emerald-500 font-bold mt-0.5 shrink-0">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Copyright notice */}
      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-relaxed px-4">
        This plan recommends College Board Question Bank filter settings only. No SAT questions are stored or displayed by this platform. All practice must be done directly on the College Board website.
      </p>
    </div>
  )
}
