'use client'

import * as React from 'react'
import { ArrowRight, CheckCircle2, Clock3, Loader2, RotateCcw, Sparkles, Target, XCircle } from 'lucide-react'
import { idempotencyKey, v2Fetch } from './v2-api'

type Choice = { id: string; content: string }
type Question = { questionId: string; versionId: string; section: 'math' | 'reading_writing'; subskillKey: string; responseType: 'mcq' | 'spr'; stimulus?: string | null; stem: string; choices: Choice[]; expectedSeconds: number }
type HomeData = { scoreEstimate: number | null; scoreEstimateLow: number | null; scoreEstimateHigh: number | null; targetScore: number; minutesSaved: number; recommendation: { id: string; totalMinutes: number; newMinutes: number; reviewMinutes: number; whySelected: string[] } }
type NextData = { sessionId: string; microSetNumber: number; question: Question }
type Feedback = { attempt: { id: string }; correctAnswer: unknown; explanation: string; nextAction: string; attemptCount: number; correctCount: number }
type Summary = { questionsAttempted: number; questionsCorrect: number; minutesPracticed: number; minutesSaved: number }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>{children}</section>
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{message}</div>
}

export function V2Home() {
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [question, setQuestion] = React.useState<NextData | null>(null)
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [answer, setAnswer] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [working, setWorking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const startedAt = React.useRef(0)

  const loadHome = React.useCallback(async () => {
    setLoading(true); setError(null)
    try { setHome(await v2Fetch<HomeData>('/api/v2/home')) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load your V2 home.') }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { void loadHome() }, [loadHome])

  async function startPractice() {
    if (!home) return
    setWorking(true); setError(null); setSummary(null); setFeedback(null)
    try {
      const session = await v2Fetch<{ id: string }>('/api/v2/sessions', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey(), 'X-Client-Version': 'web-v2.1' }, body: JSON.stringify({ dailyRecommendationId: home.recommendation.id, resumeIfAvailable: true }) })
      const next = await v2Fetch<NextData>(`/api/v2/sessions/${session.id}/next`)
      setQuestion(next); setAnswer(''); startedAt.current = Date.now()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to start practice.') }
    finally { setWorking(false) }
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return
    setWorking(true); setError(null)
    try {
      const now = new Date().toISOString()
      const result = await v2Fetch<Feedback>(`/api/v2/sessions/${question.sessionId}/attempts`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey(), 'X-Client-Version': 'web-v2.1' }, body: JSON.stringify({ questionId: question.question.questionId, versionId: question.question.versionId, selectedAnswer: answer.trim(), clientResponseSeconds: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)), answerChangeCount: 0, events: [{ type: 'question_presented', sequenceNumber: 1, occurredAt: new Date(startedAt.current).toISOString() }, { type: 'answer_selected', sequenceNumber: 2, occurredAt: now, choiceId: question.question.responseType === 'mcq' ? answer : null }, { type: 'submitted', sequenceNumber: 3, occurredAt: now }] }) })
      setFeedback(result)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to submit that answer.') }
    finally { setWorking(false) }
  }

  async function next() {
    if (!question) return
    setWorking(true); setError(null)
    try { setQuestion(await v2Fetch<NextData>(`/api/v2/sessions/${question.sessionId}/next`)); setFeedback(null); setAnswer(''); startedAt.current = Date.now() }
    catch (err) { setError(err instanceof Error ? err.message : 'No next question is available.') }
    finally { setWorking(false) }
  }

  async function finish() {
    if (!question) return
    setWorking(true); setError(null)
    try { setSummary(await v2Fetch<Summary>(`/api/v2/sessions/${question.sessionId}/end`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify({ reason: 'user_stop' }) })); setQuestion(null); setFeedback(null); await loadHome() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to finish this session.') }
    finally { setWorking(false) }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>

  if (question) {
    const correct = feedback ? String(feedback.correctAnswer).toLowerCase() === answer.toLowerCase() : false
    return <div className="mx-auto max-w-3xl space-y-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Micro-set {question.microSetNumber}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Think it through.</h1></div><button type="button" onClick={finish} disabled={working} className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-white">Finish session</button></div>{error && <ErrorNotice message={error} />}<Card><div className="flex items-center justify-between text-xs text-zinc-500"><span>{question.question.section === 'math' ? 'Math' : 'Reading & Writing'} · {question.question.subskillKey.replaceAll('_', ' ')}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{Math.max(1, Math.round(question.question.expectedSeconds / 60))} min</span></div>{question.question.stimulus && <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm leading-7 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{question.question.stimulus}</p>}<h2 className="mt-6 text-lg font-medium leading-8">{question.question.stem}</h2>{question.question.responseType === 'mcq' ? <div className="mt-6 space-y-3">{question.question.choices.map((choice, index) => <button key={choice.id} type="button" onClick={() => !feedback && setAnswer(choice.id)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${answer === choice.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800'}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold">{String.fromCharCode(65 + index)}</span><span>{choice.content}</span></button>)}</div> : <input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={!!feedback} placeholder="Type your answer" className="mt-6 h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700" />}{!feedback ? <button type="button" disabled={!answer || working} onClick={submitAnswer} className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit answer <ArrowRight className="h-4 w-4" /></>}</button> : <div className={`mt-7 rounded-xl border p-4 ${correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}><p className="flex items-center gap-2 text-sm font-semibold">{correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />} Correct answer: {String(feedback.correctAnswer)}</p><p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{feedback.explanation}</p><div className="mt-4 flex gap-3"><button type="button" onClick={next} disabled={working || feedback.nextAction === 'recommended_stop'} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">{feedback.nextAction === 'recommended_stop' ? 'Recommended stopping point' : <>Next question <ArrowRight className="h-4 w-4" /></>}</button><button type="button" onClick={finish} disabled={working} className="rounded-xl border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">Finish</button></div></div>}</Card></div>
  }

  return <div className="space-y-8"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Today</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A small session with a clear signal.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">Your practice, review, and progress now share the same path.</p></div>{error && <ErrorNotice message={error} />}{summary && <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/20"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Session complete</p><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><strong className="block text-2xl">{summary.questionsCorrect}/{summary.questionsAttempted}</strong><span className="text-xs text-zinc-500">correct</span></div><div><strong className="block text-2xl">{summary.minutesPracticed}m</strong><span className="text-xs text-zinc-500">practiced</span></div><div><strong className="block text-2xl">{summary.minutesSaved}m</strong><span className="text-xs text-zinc-500">saved</span></div></div></Card>}<div className="grid gap-4 sm:grid-cols-3"><Card><p className="text-xs text-zinc-500">Predicted score</p><p className="mt-2 text-3xl font-semibold">{home?.scoreEstimate ?? '—'}</p><p className="mt-1 text-xs text-zinc-500">{home?.scoreEstimateLow && home.scoreEstimateHigh ? `${home.scoreEstimateLow}–${home.scoreEstimateHigh} range` : 'Build your first signal'}</p></Card><Card><p className="text-xs text-zinc-500">Target score</p><p className="mt-2 text-3xl font-semibold">{home?.targetScore ?? '—'}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500"><Target className="h-3.5 w-3.5" />Your current goal</p></Card><Card><p className="text-xs text-zinc-500">Time saved</p><p className="mt-2 text-3xl font-semibold">{home?.minutesSaved ?? 0}m</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500"><Sparkles className="h-3.5 w-3.5" />From adaptive choices</p></Card></div>{home && <Card className="overflow-hidden"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Recommended next</p><h2 className="mt-2 text-2xl font-semibold">{home.recommendation.totalMinutes} minutes to move forward.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">{home.recommendation.whySelected[0]}</p><div className="mt-4 flex gap-2 text-xs text-zinc-500"><span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-900">{home.recommendation.newMinutes}m new</span><span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-900">{home.recommendation.reviewMinutes}m review</span></div></div><button type="button" onClick={startPractice} disabled={working} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start practicing <ArrowRight className="h-4 w-4" /></>}</button></div></Card>}<div className="grid gap-4 sm:grid-cols-2"><Card><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></span><div><h2 className="font-semibold">Review queue</h2><p className="text-sm text-zinc-500">Mistakes become the next useful question.</p></div></div><a href="/error-log" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-600">Open review <ArrowRight className="h-4 w-4" /></a></Card><Card><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><RotateCcw className="h-4 w-4" /></span><div><h2 className="font-semibold">See what is changing</h2><p className="text-sm text-zinc-500">Track mastery and score signals over time.</p></div></div><a href="/data" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-600">View progress <ArrowRight className="h-4 w-4" /></a></Card></div></div>
}
