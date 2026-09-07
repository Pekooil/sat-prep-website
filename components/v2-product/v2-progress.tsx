'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { v2Fetch } from './v2-api'

type Skill = {
  section: string
  subskillKey: string
  mastery: number
  confidence: number
  attempts: number
}
type Progress = {
  scoreEstimate: number | null
  scoreEstimateLow: number | null
  scoreEstimateHigh: number | null
  minutesSaved: number
  resolvedErrors: number
  skills: Skill[]
}

export function V2Progress() {
  const [data, setData] = React.useState<Progress | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const loadProgress = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await v2Fetch<Progress>('/api/v2/progress'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load progress.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void v2Fetch<Progress>('/api/v2/progress')
      .then((nextProgress) => {
        if (!cancelled) setData(nextProgress)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load progress.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600 motion-reduce:animate-none" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold">Progress could not load.</p>
        <p className="mt-2 text-sm leading-6">
          {error ?? 'The progress response was empty. Please try again.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadProgress()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white outline-none hover:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-200 dark:text-amber-950"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 px-4 text-sm font-semibold outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-800 dark:hover:bg-amber-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
          Progress
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">What’s changing.</h1>
        <p className="mt-3 text-sm text-zinc-500">
          Signals from your actual V2 practice history.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Score estimate</p>
          <p className="mt-2 text-3xl font-semibold">{data.scoreEstimate ?? '—'}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.scoreEstimateLow && data.scoreEstimateHigh
              ? `${data.scoreEstimateLow}–${data.scoreEstimateHigh}`
              : 'Not enough practice yet'}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Minutes saved</p>
          <p className="mt-2 text-3xl font-semibold">{data.minutesSaved}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Adaptive efficiency
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Resolved errors</p>
          <p className="mt-2 text-3xl font-semibold">{data.resolvedErrors}</p>
          <p className="mt-1 text-xs text-zinc-500">Confirmed through review</p>
        </div>
      </div>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold">Skill mastery</h2>
        {data.skills.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            Complete a V2 practice session to start building skill signals.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {data.skills.map((skill) => {
              const masteryPercent = Math.max(0, Math.min(100, Math.round(skill.mastery * 100)))
              return (
                <div key={`${skill.section}-${skill.subskillKey}`}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{skill.subskillKey.replaceAll('_', ' ')}</span>
                    <span className="shrink-0 font-mono text-xs text-zinc-500">
                      {masteryPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <span
                      className="block h-full rounded-full bg-violet-600 transition-[width] duration-500 motion-reduce:transition-none"
                      style={{ width: `${masteryPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {skill.attempts} attempts · {Math.round(skill.confidence * 100)}% confidence
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
