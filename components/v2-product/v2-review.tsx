'use client'

import * as React from 'react'
import { ArrowRight, Loader2, RotateCcw } from 'lucide-react'
import { idempotencyKey, v2Fetch } from './v2-api'

type ReviewItem = { id: string; state: string; subskillKey: string; lapseCount: number; summary?: string }

export function V2Review() {
  const [items, setItems] = React.useState<ReviewItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [working, setWorking] = React.useState<string | null>(null)
  const load = React.useCallback(() => v2Fetch<ReviewItem[]>('/api/v2/review').then(setItems).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load review.')), [])
  React.useEffect(() => { void load() }, [load])
  async function act(item: ReviewItem, action: 'practice_now' | 'defer') {
    setWorking(item.id); setError(null)
    try { await v2Fetch(`/api/v2/review/${item.id}/action`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify({ action }) }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update review.') }
    finally { setWorking(null) }
  }
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{error}</div>
  if (!items) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
  return <div className="space-y-8"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Review queue</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ready when you are.</h1><p className="mt-3 text-sm text-zinc-500">The mistakes worth seeing again, ordered by timing.</p></div>{items.length === 0 ? <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-950"><RotateCcw className="mx-auto h-6 w-6 text-zinc-400" /><h2 className="mt-4 font-semibold">Nothing due right now</h2><p className="mt-2 text-sm text-zinc-500">Complete a practice question and incorrect answers will appear here automatically.</p><a href="/home" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600">Go to today <ArrowRight className="h-4 w-4" /></a></section> : <div className="space-y-3">{items.map((item) => <section key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{item.state}</span><h2 className="mt-2 font-semibold">{item.subskillKey.replaceAll('_', ' ')}</h2><p className="mt-1 text-sm text-zinc-500">{item.summary ?? 'A focused correction is ready.'}</p></div><span className="text-xs text-zinc-500">{item.lapseCount} lapses</span></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => act(item, 'practice_now')} disabled={working === item.id} className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">{working === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Practice now'}</button><button type="button" onClick={() => act(item, 'defer')} disabled={working === item.id} className="h-10 rounded-xl border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">Defer</button></div></section>)}</div>}</div>
}
