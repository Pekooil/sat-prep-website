'use client'

import * as React from 'react'
import { CalendarDays, Gauge, Loader2, Save, Target, UserRound } from 'lucide-react'
import { DeleteAccount } from '@/components/settings/delete-account'
import { idempotencyKey, v2Fetch } from './v2-api'

type Profile = {
  id: string
  fullName: string | null
  currentScore: number | null
  targetScore: number | null
  testDate: string | null
  onboardingComplete: boolean
  scratchAnalysisEnabled: boolean
  timingAccommodationMultiplier: number
}

type Bootstrap = { profile: Profile }

type ProfileForm = {
  fullName: string
  currentScore: string
  targetScore: string
  testDate: string
  scratchAnalysisEnabled: boolean
  timingAccommodationMultiplier: string
}

function formFromProfile(profile: Profile): ProfileForm {
  return {
    fullName: profile.fullName ?? '',
    currentScore: profile.currentScore?.toString() ?? '',
    targetScore: profile.targetScore?.toString() ?? '',
    testDate: profile.testDate ?? '',
    scratchAnalysisEnabled: profile.scratchAnalysisEnabled,
    timingAccommodationMultiplier: profile.timingAccommodationMultiplier.toString(),
  }
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading V2 profile" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-full bg-zinc-200 motion-reduce:animate-none dark:bg-zinc-800" />
      <div className="grid animate-pulse gap-5 motion-reduce:animate-none lg:grid-cols-2">
        {[0, 1].map((card) => (
          <div key={card} className="h-72 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        ))}
      </div>
    </div>
  )
}

export function V2Profile() {
  const [form, setForm] = React.useState<ProfileForm | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void v2Fetch<Bootstrap>('/api/v2/bootstrap')
      .then(({ profile }) => {
        if (!cancelled) setForm(formFromProfile(profile))
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load your profile.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setSaved(false)
    setForm((current) => current ? { ...current, [key]: value } : current)
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return

    const currentScore = Number(form.currentScore)
    const targetScore = Number(form.targetScore)
    if (!Number.isInteger(currentScore) || currentScore < 400 || currentScore > 1600) {
      setError('Current score must be between 400 and 1600.')
      return
    }
    if (!Number.isInteger(targetScore) || targetScore < 400 || targetScore > 1600) {
      setError('Target score must be between 400 and 1600.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const profile = await v2Fetch<Profile>('/api/v2/profile', {
        method: 'PATCH',
        headers: { 'Idempotency-Key': idempotencyKey() },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          currentScore,
          targetScore,
          testDate: form.testDate,
          scratchAnalysisEnabled: form.scratchAnalysisEnabled,
          timingAccommodationMultiplier: Number(form.timingAccommodationMultiplier),
        }),
      })
      setForm(formFromProfile(profile))
      setSaved(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  if (!form) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {error ?? 'Your profile is unavailable right now. Refresh the page to try again.'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Make the path yours.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Keep your score goal, test date, and practice experience aligned.
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Student profile</h2>
                <p className="text-xs text-zinc-500">The basics shown across SaturnPath.</p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label htmlFor="v2-full-name" className="text-sm font-medium">Full name</label>
              <input id="v2-full-name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} required maxLength={100} autoComplete="name" className="h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700" />
            </div>
            <div className="mt-5 space-y-2">
              <label htmlFor="v2-test-date" className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4 text-violet-600" />SAT date</label>
              <input id="v2-test-date" type="date" value={form.testDate} onChange={(event) => update('testDate', event.target.value)} required className="h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700" />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Score trajectory</h2>
                <p className="text-xs text-zinc-500">Used to size and prioritize daily work.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="v2-current-score" className="text-sm font-medium">Current score</label>
                <input id="v2-current-score" type="number" min={400} max={1600} step={10} value={form.currentScore} onChange={(event) => update('currentScore', event.target.value)} required className="h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-3 font-mono text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700" />
              </div>
              <div className="space-y-2">
                <label htmlFor="v2-target-score" className="text-sm font-medium">Target score</label>
                <input id="v2-target-score" type="number" min={400} max={1600} step={10} value={form.targetScore} onChange={(event) => update('targetScore', event.target.value)} required className="h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-3 font-mono text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <label htmlFor="v2-timing" className="flex items-center gap-2 text-sm font-medium"><Gauge className="h-4 w-4 text-violet-600" />Timing accommodation</label>
              <select id="v2-timing" value={form.timingAccommodationMultiplier} onChange={(event) => update('timingAccommodationMultiplier', event.target.value)} className="h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700">
                <option value="1">Standard time</option>
                <option value="1.5">Time and a half</option>
                <option value="2">Double time</option>
                <option value="3">Triple time</option>
              </select>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <label className="flex cursor-pointer items-start justify-between gap-5">
            <span>
              <span className="block font-semibold">Scratch analysis</span>
              <span className="mt-1 block max-w-2xl text-sm leading-6 text-zinc-500">Allow SaturnPath to use structured scratchpad signals to improve pacing guidance. Raw scratch work is not required.</span>
            </span>
            <input type="checkbox" checked={form.scratchAnalysisEnabled} onChange={(event) => update('scratchAnalysisEnabled', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-violet-600" />
          </label>
        </section>

        {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}
        {saved && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Profile saved.</p>}

        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
          {saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving profile…' : 'Save changes'}
        </button>
      </form>

      <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <DeleteAccount />
      </div>
    </div>
  )
}
