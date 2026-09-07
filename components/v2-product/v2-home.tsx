'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  PenLine,
  RotateCcw,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react'
import { idempotencyKey, v2Fetch } from './v2-api'

type Choice = { id: string; content: string }
type Question = {
  questionId: string
  versionId: string
  section: 'math' | 'reading_writing'
  subskillKey: string
  responseType: 'mcq' | 'spr'
  stimulus?: string | null
  stem: string
  choices: Choice[]
  expectedSeconds: number
}
type Ring = {
  id: 'score_growth' | 'weakness_removed' | 'time_saved'
  label: string
  completedValue: number
  targetValue: number
  progress: number
  unit: string
}
type HomeData = {
  scoreEstimate: number | null
  scoreEstimateLow: number | null
  scoreEstimateHigh: number | null
  targetScore: number
  minutesSaved: number
  rings: Ring[]
  recommendation: {
    id: string
    totalMinutes: number
    newMinutes: number
    reviewMinutes: number
    whySelected: string[]
  }
}
type NextData = { sessionId: string; microSetNumber: number; question: Question }
type StartedSession = { id: string; firstQuestion?: NextData }
type Feedback = {
  attempt: { id: string }
  correctAnswer: unknown
  explanation: string
  nextAction: string
  attemptCount: number
  correctCount: number
}
type Summary = {
  questionsAttempted: number
  questionsCorrect: number
  minutesPracticed: number
  minutesSaved: number
}

const ringColors = ['#6857f6', '#35cfa4', '#ff7a70']
const ringRadii = [108, 80, 52]

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {children}
    </section>
  )
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
    >
      {message}
    </div>
  )
}

function ProgressRings({ home }: { home: HomeData }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(320px,0.9fr)_minmax(280px,1.1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[300px]">
          <svg
            viewBox="0 0 260 260"
            className="h-full w-full -rotate-90"
            aria-label="Today’s progress rings"
            role="img"
          >
            {home.rings.slice(0, 3).map((ring, index) => {
              const progress = Math.max(0, Math.min(1, ring.progress))
              return (
                <React.Fragment key={ring.id}>
                  <circle
                    cx="130"
                    cy="130"
                    r={ringRadii[index]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="13"
                    className="text-zinc-100 dark:text-zinc-900"
                  />
                  <circle
                    cx="130"
                    cy="130"
                    r={ringRadii[index]}
                    fill="none"
                    stroke={ringColors[index]}
                    strokeWidth="13"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 - progress * 100}
                    className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                  />
                </React.Fragment>
              )
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Estimated
            </span>
            <strong className="mt-1 text-4xl font-semibold tracking-tight">
              {home.scoreEstimate ?? '—'}
            </strong>
            <span className="mt-1 text-xs text-zinc-500">
              {home.scoreEstimateLow && home.scoreEstimateHigh
                ? `${home.scoreEstimateLow}–${home.scoreEstimateHigh}`
                : 'Keep practicing'}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">
            Your daily signal
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Progress you can see.</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Each ring updates from your practice, review, and time saved.
          </p>
          <div className="mt-5 space-y-3">
            {home.rings.slice(0, 3).map((ring, index) => (
              <div key={ring.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ringColors[index] }}
                  />
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{ring.label}</span>
                </span>
                <strong className="shrink-0 font-mono text-xs">
                  {ring.completedValue}/{ring.targetValue} {ring.unit}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-900">
            <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
              <Target className="h-4 w-4" />
              Target {home.targetScore}
            </span>
            <Link
              href="/data"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-violet-600 outline-none hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:text-violet-400"
            >
              Full progress <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

function PracticeScratchpad({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Scratchpad">
      <Card className="overflow-hidden p-0">
        <div className="flex min-h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <PenLine className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Scratchpad</h2>
              <p className="text-[11px] text-zinc-500">Always open during practice</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={!value}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-zinc-500 outline-none hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
        <div
          className="bg-zinc-50 p-3 dark:bg-zinc-900"
          style={{
            backgroundImage:
              'linear-gradient(rgba(104,87,246,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(104,87,246,.09) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Work through the problem here…"
            className="min-h-72 w-full resize-y rounded-xl border border-zinc-200/80 bg-white/80 p-4 text-sm leading-7 shadow-sm outline-none backdrop-blur-sm placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-700 dark:bg-zinc-950/85 lg:min-h-[520px]"
          />
        </div>
      </Card>
    </aside>
  )
}

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`} />
}

function PracticeLoadingSkeleton({ status }: { status: string }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-labelledby="practice-loading-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
          Focused practice
        </p>
        <h1 id="practice-loading-title" className="mt-2 text-2xl font-semibold tracking-tight">
          Preparing your first question.
        </h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-500" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600 motion-reduce:animate-none" aria-hidden="true" />
          {status}
        </p>
      </div>

      <div className="grid animate-pulse gap-5 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <SkeletonBar className="h-3 w-36" />
            <SkeletonBar className="h-3 w-16" />
          </div>
          <div className="mt-8 space-y-3">
            <SkeletonBar className="h-5 w-full" />
            <SkeletonBar className="h-5 w-11/12" />
            <SkeletonBar className="h-5 w-3/5" />
          </div>
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3].map((choice) => (
              <div key={choice} className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <SkeletonBar className={`h-3 ${choice % 2 === 0 ? 'w-3/4' : 'w-2/3'}`} />
              </div>
            ))}
          </div>
          <div className="mt-7 h-11 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
        </Card>

        <aside aria-label="Scratchpad loading">
          <Card className="overflow-hidden p-0">
            <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
              <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-2">
                <SkeletonBar className="h-3 w-24" />
                <SkeletonBar className="h-2.5 w-36" />
              </div>
            </div>
            <div className="min-h-72 bg-zinc-100 p-4 dark:bg-zinc-900 lg:min-h-[520px]">
              <div className="h-full min-h-64 rounded-xl border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/70 lg:min-h-[488px]" />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export function V2Home() {
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [question, setQuestion] = React.useState<NextData | null>(null)
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [answer, setAnswer] = React.useState('')
  const [scratchpad, setScratchpad] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [working, setWorking] = React.useState(false)
  const [startStatus, setStartStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const startedAt = React.useRef(0)

  const loadHome = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setHome(await v2Fetch<HomeData>('/api/v2/home'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your V2 home.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void v2Fetch<HomeData>('/api/v2/home')
      .then((nextHome) => {
        if (!cancelled) setHome(nextHome)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load your V2 home.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function startPractice() {
    if (!home) return
    setWorking(true)
    setError(null)
    setSummary(null)
    setFeedback(null)
    setScratchpad('')
    setStartStatus('Starting practice…')
    try {
      const session = await v2Fetch<StartedSession>('/api/v2/sessions', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey(),
          'X-Client-Version': 'web-v2.1',
        },
        body: JSON.stringify({
          dailyRecommendationId: home.recommendation.id,
          resumeIfAvailable: true,
          includeFirstQuestion: true,
        }),
      })
      const nextQuestion = session.firstQuestion
        ?? await v2Fetch<NextData>(`/api/v2/sessions/${session.id}/next`)
      setQuestion(nextQuestion)
      setAnswer('')
      startedAt.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start practice.')
    } finally {
      setWorking(false)
      setStartStatus(null)
    }
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return
    setWorking(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const result = await v2Fetch<Feedback>(
        `/api/v2/sessions/${question.sessionId}/attempts`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': idempotencyKey(),
            'X-Client-Version': 'web-v2.1',
          },
          body: JSON.stringify({
            questionId: question.question.questionId,
            versionId: question.question.versionId,
            selectedAnswer: answer.trim(),
            clientResponseSeconds: Math.max(
              0,
              Math.round((Date.now() - startedAt.current) / 1000),
            ),
            answerChangeCount: 0,
            events: [
              {
                type: 'question_presented',
                sequenceNumber: 1,
                occurredAt: new Date(startedAt.current).toISOString(),
              },
              {
                type: 'answer_selected',
                sequenceNumber: 2,
                occurredAt: now,
                choiceId: question.question.responseType === 'mcq' ? answer : null,
              },
              { type: 'submitted', sequenceNumber: 3, occurredAt: now },
            ],
          }),
        },
      )
      setFeedback(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit that answer.')
    } finally {
      setWorking(false)
    }
  }

  async function next() {
    if (!question) return
    setWorking(true)
    setError(null)
    try {
      setQuestion(await v2Fetch<NextData>(`/api/v2/sessions/${question.sessionId}/next`))
      setFeedback(null)
      setAnswer('')
      startedAt.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No next question is available.')
    } finally {
      setWorking(false)
    }
  }

  async function finish() {
    if (!question) return
    setWorking(true)
    setError(null)
    try {
      setSummary(
        await v2Fetch<Summary>(`/api/v2/sessions/${question.sessionId}/end`, {
          method: 'POST',
          headers: { 'Idempotency-Key': idempotencyKey() },
          body: JSON.stringify({ reason: 'user_stop' }),
        }),
      )
      setQuestion(null)
      setFeedback(null)
      setScratchpad('')
      await loadHome()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to finish this session.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600 motion-reduce:animate-none" />
      </div>
    )
  }

  if (startStatus) {
    return <PracticeLoadingSkeleton status={startStatus} />
  }

  if (question) {
    const correct =
      feedback ? String(feedback.correctAnswer).toLowerCase() === answer.toLowerCase() : false

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
              Micro-set {question.microSetNumber}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Think it through.</h1>
          </div>
          <button
            type="button"
            onClick={finish}
            disabled={working}
            className="min-h-11 rounded-lg px-2 text-sm text-zinc-500 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:hover:text-white"
          >
            Finish session
          </button>
        </div>
        {error && <ErrorNotice message={error} />}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <div className="flex items-center justify-between gap-4 text-xs text-zinc-500">
              <span>
                {question.question.section === 'math' ? 'Math' : 'Reading & Writing'} ·{' '}
                {question.question.subskillKey.replaceAll('_', ' ')}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {Math.max(1, Math.round(question.question.expectedSeconds / 60))} min
              </span>
            </div>
            {question.question.stimulus && (
              <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm leading-7 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {question.question.stimulus}
              </p>
            )}
            <h2 className="mt-6 text-lg font-medium leading-8">{question.question.stem}</h2>
            {question.question.responseType === 'mcq' ? (
              <div className="mt-6 space-y-3">
                {question.question.choices.map((choice, index) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={!!feedback}
                    onClick={() => setAnswer(choice.id)}
                    className={`flex min-h-14 w-full items-start gap-3 rounded-xl border p-4 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default ${
                      answer === choice.id
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800'
                    }`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{choice.content}</span>
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={!!feedback}
                placeholder="Type your answer"
                className="mt-6 h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-70 dark:border-zinc-700"
              />
            )}
            {!feedback ? (
              <button
                type="button"
                disabled={!answer || working}
                onClick={submitAnswer}
                className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <>
                    Submit answer <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <div
                className={`mt-7 rounded-xl border p-4 ${
                  correct
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                  Correct answer: {String(feedback.correctAnswer)}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {feedback.explanation}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={next}
                    disabled={working || feedback.nextAction === 'recommended_stop'}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                  >
                    {feedback.nextAction === 'recommended_stop' ? (
                      'Recommended stopping point'
                    ) : (
                      <>
                        Next question <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={finish}
                    disabled={working}
                    className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-zinc-700"
                  >
                    Finish
                  </button>
                </div>
              </div>
            )}
          </Card>
          <PracticeScratchpad value={scratchpad} onChange={setScratchpad} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
          Today
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          A small session with a clear signal.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Your practice, review, and progress now share the same path.
        </p>
      </div>
      {error && !home && <ErrorNotice message={error} />}
      {summary && (
        <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            Session complete
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <strong className="block text-2xl">
                {summary.questionsCorrect}/{summary.questionsAttempted}
              </strong>
              <span className="text-xs text-zinc-500">correct</span>
            </div>
            <div>
              <strong className="block text-2xl">{summary.minutesPracticed}m</strong>
              <span className="text-xs text-zinc-500">practiced</span>
            </div>
            <div>
              <strong className="block text-2xl">{summary.minutesSaved}m</strong>
              <span className="text-xs text-zinc-500">saved</span>
            </div>
          </div>
        </Card>
      )}
      {home && <ProgressRings home={home} />}
      {home && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                Recommended next
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {home.recommendation.totalMinutes} minutes to move forward.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                {home.recommendation.whySelected[0]}
              </p>
              <div className="mt-4 flex gap-2 text-xs text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-900">
                  {home.recommendation.newMinutes}m new
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-900">
                  {home.recommendation.reviewMinutes}m review
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <button
                type="button"
                onClick={startPractice}
                disabled={working}
                aria-busy={working}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm outline-none hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                {startStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    {startStatus}
                  </>
                ) : (
                  <>
                    Start practicing <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="min-h-4 text-center text-xs text-zinc-500" aria-live="polite">
                {startStatus ?? 'Your first question should open in a few seconds.'}
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-4">
              <ErrorNotice message={error} />
            </div>
          )}
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">Review queue</h2>
              <p className="text-sm text-zinc-500">
                Mistakes become the next useful question.
              </p>
            </div>
          </div>
          <Link
            href="/error-log"
            className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-violet-600 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            Open review <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">See what is changing</h2>
              <p className="text-sm text-zinc-500">
                Track mastery and score signals over time.
              </p>
            </div>
          </div>
          <Link
            href="/data"
            className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-violet-600 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            View progress <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  )
}
