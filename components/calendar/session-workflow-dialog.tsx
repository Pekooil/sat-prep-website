'use client'

import * as React from 'react'
import {
  Loader2, Timer, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, ExternalLink, ShieldAlert,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createQuestionSession } from '@/actions/question-sessions'
import type { MistakeType, MissedAnalysisEntry, SessionMetrics } from '@/actions/question-sessions'
import { toggleTaskComplete } from '@/actions/calendar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import { COLLEGE_BOARD_QB_URL } from '@/lib/constants'
import type { CalendarTask } from '@/types'
import type { CollegeBoardFilter } from '@/types'
import type { DomainChange } from '@/lib/adaptive-replanner/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MISTAKE_TYPE_OPTIONS: { value: MistakeType; label: string }[] = [
  { value: 'concept_gap',      label: 'Concept Gap'      },
  { value: 'careless_error',   label: 'Careless Error'   },
  { value: 'timing_issue',     label: 'Timing Issue'     },
  { value: 'misread_question', label: 'Misread Question' },
  { value: 'strategy_error',   label: 'Strategy Error'   },
]

const SECS_PER_Q: Record<string, number> = {
  math:            95,
  reading_writing: 71,
  both:            71,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Letter = 'A' | 'B' | 'C' | 'D'
const LETTERS: Letter[] = ['A', 'B', 'C', 'D']

type WorkflowPhase = 'idle' | 'active' | 'review' | 'results' | 'missed_analysis' | 'plan_updated'

interface QuestionRow {
  yourAnswer:    Letter | null
  correctAnswer: Letter | null
}

interface SessionWorkflowDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  task:         CalendarTask
  onSuccess?:   () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseQuestionCount(title: string): number {
  const m = title.match(/(\d+)q/)
  return m ? Math.max(1, Math.min(80, parseInt(m[1], 10))) : 10
}

function allocatedSeconds(count: number, subject: string): number {
  const raw = count * (SECS_PER_Q[subject] ?? 71)
  return Math.ceil(raw / 60) * 60
}

function formatClock(secs: number): string {
  const abs = Math.abs(secs)
  const m   = Math.floor(abs / 60)
  const s   = abs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimerPill({ elapsed, allocated }: { elapsed: number; allocated: number }) {
  const remaining = allocated - elapsed
  const overtime  = remaining <= 0
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums border',
      overtime
        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
        : 'bg-[var(--surface-sunken)] text-[var(--foreground)] border-[var(--border)]'
    )}>
      <Timer className="h-3.5 w-3.5 shrink-0" />
      {overtime ? `+${formatClock(Math.abs(remaining))}` : formatClock(remaining)}
    </div>
  )
}

// A / B / C / D letter button used in active + review phases
function LetterBtn({
  letter, selected, onClick, color = 'accent',
}: {
  letter:  Letter
  selected: boolean
  onClick:  () => void
  color?:   'accent' | 'emerald'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-[var(--radius-sm)] text-xs font-bold border transition-all shrink-0 select-none',
        selected
          ? color === 'accent'
            ? 'bg-[var(--accent)] text-white border-transparent'
            : 'bg-emerald-500 text-white border-transparent'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--foreground)]'
      )}
    >
      {letter}
    </button>
  )
}

// Static read-only letter badge shown in review / results
function AnswerBadge({
  letter, variant = 'neutral',
}: {
  letter:  Letter | null
  variant?: 'neutral' | 'correct' | 'wrong'
}) {
  return (
    <span className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold border shrink-0',
      !letter
        ? 'text-[var(--muted-foreground)] border-dashed border-[var(--border)]'
        : variant === 'correct'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
          : variant === 'wrong'
            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
            : 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--foreground)]'
    )}>
      {letter ?? '—'}
    </span>
  )
}

// Divider with label used between column groups in review
function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
      {children}
    </p>
  )
}

// ─── Phase header strip ───────────────────────────────────────────────────────

function PhaseBar({
  left, right, border = true,
}: {
  left:    React.ReactNode
  right?:  React.ReactNode
  border?: boolean
}) {
  return (
    <div className={cn(
      'flex-none flex items-center justify-between px-6 py-3.5 gap-4',
      border && 'border-b border-[var(--border)]'
    )}>
      <div className="min-w-0">{left}</div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SessionWorkflowDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: SessionWorkflowDialogProps) {
  const { toast } = useToast()

  const questionCount = React.useMemo(() => parseQuestionCount(task.title), [task.title])
  const allocSecs     = React.useMemo(() => allocatedSeconds(questionCount, task.subject), [questionCount, task.subject])
  const filters       = task.college_board_filters as CollegeBoardFilter | null

  const domainSkills = React.useMemo(() => {
    const domain = DOMAIN_CATALOG.find(d => d.label === task.category)
    return domain?.skills.map(s => s.label) ?? []
  }, [task.category])

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,        setPhase]        = React.useState<WorkflowPhase>('idle')
  const [phaseVisible, setPhaseVisible] = React.useState(true)
  const [rows,         setRows]         = React.useState<QuestionRow[]>([])
  const [timeElapsed,  setElapsed]      = React.useState(0)
  const [timedOut,     setTimedOut]     = React.useState(false)
  const [saving,       setSaving]       = React.useState(false)
  const [missedRows,   setMissedRows]   = React.useState<MissedAnalysisEntry[]>([])
  const [sessionMetrics, setSessionMetrics] = React.useState<SessionMetrics | null>(null)
  const [replanResult, setReplanResult] = React.useState<{
    tasksUpdated:  number
    taskChanges:   DomainChange[]
    predictedScore: number
  } | null>(null)

  const [confirm, setConfirm] = React.useState<{
    title:       string
    description: string
    onConfirm:   () => void
  } | null>(null)

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Animated phase transition ──────────────────────────────────────────────
  async function transitionTo(newPhase: WorkflowPhase, prep?: () => void): Promise<void> {
    setPhaseVisible(false)
    await new Promise<void>(r => setTimeout(r, 160))
    prep?.()
    setPhase(newPhase)
    requestAnimationFrame(() => requestAnimationFrame(() => setPhaseVisible(true)))
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'active') return
    intervalRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  React.useEffect(() => {
    if (phase === 'active' && !timedOut && timeElapsed >= allocSecs) {
      setTimedOut(true)
      toast({
        title:       "Time's up!",
        description: 'Timer is now in overtime — take your time to finish.',
      })
    }
  }, [timeElapsed, allocSecs, phase, timedOut, toast])

  // ── Close guard ────────────────────────────────────────────────────────────
  function handleOpenChange(next: boolean) {
    if (!next && (phase === 'active' || phase === 'review' || phase === 'results' || phase === 'missed_analysis')) {
      setConfirm({
        title:       'Close session?',
        description: 'Your progress will be lost and this session won\'t be recorded.',
        onConfirm:   () => onOpenChange(false),
      })
      return
    }
    onOpenChange(next)
  }

  // ── Reset on close ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) {
      setPhase('idle')
      setPhaseVisible(true)
      setRows([])
      setElapsed(0)
      setTimedOut(false)
      setSaving(false)
      setReplanResult(null)
      setMissedRows([])
      setSessionMetrics(null)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open])

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleStart() {
    transitionTo('active', () => {
      setRows(Array.from({ length: questionCount }, () => ({ yourAnswer: null, correctAnswer: null })))
      setElapsed(0)
      setTimedOut(false)
    })
  }

  function handleSubmit() {
    setConfirm({
      title:       'Submit answers?',
      description: 'Make sure you\'ve closed the Question Bank window. You won\'t be able to change your answers after submitting.',
      onConfirm:   () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        transitionTo('review')
      },
    })
  }

  function handleSeeResults() {
    setConfirm({
      title:       'See results?',
      description: 'Confirm you\'ve finished entering all correct answers from the Question Bank. You won\'t be able to go back.',
      onConfirm:   () => transitionTo('results'),
    })
  }

  async function handleContinueToMissedAnalysis() {
    const missed = rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) =>
        row.yourAnswer !== null &&
        row.correctAnswer !== null &&
        row.yourAnswer !== row.correctAnswer
      )

    if (missed.length === 0) {
      await handleSave([])
      return
    }

    const prefilledSubtopic = (filters?.skill as string | undefined) ?? null
    await transitionTo('missed_analysis', () => {
      setMissedRows(
        missed.map(({ i }) => ({
          questionIndex: i,
          subtopic:      prefilledSubtopic,
          mistakeType:   null,
          studentAnswer: rows[i].yourAnswer,
          correctAnswer: rows[i].correctAnswer,
        }))
      )
    })
  }

  async function handleSave(analysisRows: MissedAnalysisEntry[]) {
    setSaving(true)
    const attempted = rows.filter(r => r.yourAnswer !== null).length
    const correct   = rows.filter(r => r.yourAnswer !== null && r.yourAnswer === r.correctAnswer).length

    const notesPayload = JSON.stringify({
      answers: rows.map((r, i) => ({
        q:       i + 1,
        yours:   r.yourAnswer,
        correct: r.correctAnswer,
        right:   r.yourAnswer !== null && r.yourAnswer === r.correctAnswer,
      })),
      totalSeconds:     timeElapsed,
      allocatedSeconds: allocSecs,
      missedAnalysis:   analysisRows.filter(ma => ma.mistakeType !== null),
    })

    const result = await createQuestionSession(
      {
        calendar_task_id:      task.id,
        session_date:          task.task_date,
        subject:               task.subject === 'both' ? 'math' : task.subject,
        category:              task.category ?? '',
        subcategory:           (filters?.skill as string | undefined) ?? null,
        questions_attempted:   attempted,
        questions_correct:     correct,
        time_spent_minutes:    Math.round(timeElapsed / 60) || 1,
        college_board_filters: task.college_board_filters,
        notes:                 notesPayload,
      },
      analysisRows,
    )

    setSaving(false)

    if (result.error) {
      toast({ title: 'Error saving session', description: result.error, variant: 'destructive' })
      return
    }

    if (result.errorLogWarning) {
      toast({
        title:       'Error log not created',
        description: `Session saved, but mistakes could not be logged: ${result.errorLogWarning}`,
        variant:     'destructive',
      })
    }

    await toggleTaskComplete(task.id, true)

    await transitionTo('plan_updated', () => {
      if (result.replanner) setReplanResult(result.replanner)
      if (result.metrics)   setSessionMetrics(result.metrics)
    })
  }

  function setYourAnswer(idx: number, val: Letter) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, yourAnswer: val } : r))
  }

  function setCorrectAnswer(idx: number, val: Letter) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, correctAnswer: val } : r))
  }

  function updateMissedRow(questionIndex: number, patch: Partial<MissedAnalysisEntry>) {
    setMissedRows(prev => prev.map(r => r.questionIndex === questionIndex ? { ...r, ...patch } : r))
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const attempted   = rows.filter(r => r.yourAnswer !== null).length
  const correct     = rows.filter(r => r.yourAnswer !== null && r.yourAnswer === r.correctAnswer).length
  const accuracy    = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const timeLeft    = allocSecs - timeElapsed
  const missedCount = rows.filter(r =>
    r.yourAnswer !== null && r.correctAnswer !== null && r.yourAnswer !== r.correctAnswer
  ).length
  const taggedCount = missedRows.filter(r => r.mistakeType !== null).length

  const isWidePhase = phase === 'active' || phase === 'review' || phase === 'results' || phase === 'missed_analysis'

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        'flex flex-col gap-0 p-0 overflow-hidden transition-[max-width] duration-200',
        isWidePhase ? 'sm:max-w-2xl max-h-[90vh]' : 'sm:max-w-md'
      )}>
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Phase animation wrapper */}
        <div
          style={{
            opacity:    phaseVisible ? 1 : 0,
            transform:  phaseVisible ? 'none' : 'translateY(5px)',
            transition: 'opacity 160ms ease, transform 160ms ease',
          }}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >

          {/* ════════════════════════════════════════════════════════════
              IDLE — session overview before starting
              ════════════════════════════════════════════════════════════ */}
          {phase === 'idle' && (
            <>
              <DialogHeader className="flex-none px-6 pt-6 pb-2">
                <DialogTitle>Start Study Session</DialogTitle>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                  {task.category ?? task.title}
                </p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Task summary */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 space-y-2">
                  <p className="font-semibold text-sm leading-snug">{task.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={task.subject === 'math' ? 'math' : 'reading'} className="text-[10px]">
                      {task.subject === 'math' ? 'Math' : 'Reading & Writing'}
                    </Badge>
                    {filters?.difficulty && (
                      <Badge variant="outline" className="text-[10px] capitalize">{filters.difficulty}</Badge>
                    )}
                  </div>
                  {filters?.domain && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {filters.domain}{filters.skill ? ` · ${filters.skill}` : ''}
                    </p>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3 text-center">
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">Questions</p>
                    <p className="text-3xl font-bold tabular-nums">{questionCount}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3 text-center">
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">Time Budget</p>
                    <p className="text-3xl font-bold tabular-nums font-mono">{formatClock(allocSecs)}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      {SECS_PER_Q[task.subject] ?? 71}s per question
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Enter your answers as you complete each question on the College Board Question Bank.
                  After submitting, enter the correct answers to see your results.
                </p>

                <a
                  href={COLLEGE_BOARD_QB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  Open College Board Question Bank
                </a>

                {task.subject === 'math' && (
                  <a
                    href="https://www.desmos.com/calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-sunken)] transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    Open Desmos Graphing Calculator
                  </a>
                )}
              </div>

              <DialogFooter className="flex-none px-6 py-4 border-t border-[var(--border)]">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleStart}>Start Session</Button>
              </DialogFooter>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              ACTIVE — enter your answers while practising
              ════════════════════════════════════════════════════════════ */}
          {phase === 'active' && (
            <>
              <PhaseBar
                left={
                  <div>
                    <p className="text-sm font-semibold leading-tight">{task.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {rows.filter(r => r.yourAnswer !== null).length}/{questionCount} answered
                    </p>
                  </div>
                }
                right={<TimerPill elapsed={timeElapsed} allocated={allocSecs} />}
              />

              <div className="flex-1 overflow-y-auto px-6 py-3">
                <div className="space-y-0.5">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-2 border-b border-[var(--border)]/40 last:border-0"
                    >
                      <span className="w-10 text-xs text-[var(--muted-foreground)] font-mono shrink-0 select-none">
                        Q{i + 1}
                      </span>
                      <div className="flex gap-1.5">
                        {LETTERS.map(l => (
                          <LetterBtn
                            key={l}
                            letter={l}
                            selected={row.yourAnswer === l}
                            onClick={() => setYourAnswer(i, l)}
                            color="accent"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-[var(--border)]">
                <Progress
                  value={(rows.filter(r => r.yourAnswer !== null).length / questionCount) * 100}
                  className="h-1.5 w-32"
                />
                <Button onClick={handleSubmit}>Submit Answers</Button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              REVIEW — enter the correct answers from the QB
              ════════════════════════════════════════════════════════════ */}
          {phase === 'review' && (
            <>
              <PhaseBar
                left={
                  <div>
                    <p className="text-sm font-semibold">Enter Correct Answers</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Check each answer against the Question Bank results
                    </p>
                  </div>
                }
                right={
                  <div className="text-right text-xs">
                    <p className="text-[var(--muted-foreground)]">
                      Time used: <span className="font-mono font-semibold text-[var(--foreground)]">{formatClock(timeElapsed)}</span>
                    </p>
                    {timeLeft >= 0
                      ? <p className="text-emerald-600 dark:text-emerald-400">{formatClock(timeLeft)} remaining</p>
                      : <p className="text-red-500">+{formatClock(Math.abs(timeLeft))} overtime</p>
                    }
                  </div>
                }
              />

              <div className="flex-1 overflow-y-auto px-6 py-3">
                {/* Column labels */}
                <div className="flex items-end gap-4 pb-1 border-b border-[var(--border)] mb-1">
                  <span className="w-10 shrink-0" />
                  <div className="w-8 shrink-0">
                    <ColLabel>Yours</ColLabel>
                  </div>
                  <div className="flex-1">
                    <ColLabel>Correct Answer</ColLabel>
                  </div>
                </div>

                <div className="space-y-0.5">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-2 border-b border-[var(--border)]/40 last:border-0"
                    >
                      <span className="w-10 text-xs text-[var(--muted-foreground)] font-mono shrink-0 select-none">
                        Q{i + 1}
                      </span>
                      <AnswerBadge letter={row.yourAnswer} variant="neutral" />
                      <div className="flex gap-1.5">
                        {LETTERS.map(l => (
                          <LetterBtn
                            key={l}
                            letter={l}
                            selected={row.correctAnswer === l}
                            onClick={() => setCorrectAnswer(i, l)}
                            color="emerald"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-none flex justify-end px-6 py-3 border-t border-[var(--border)]">
                <Button onClick={handleSeeResults}>See Results</Button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              RESULTS — accuracy + per-question breakdown
              ════════════════════════════════════════════════════════════ */}
          {phase === 'results' && (
            <>
              <DialogHeader className="flex-none px-6 pt-5 pb-4 border-b border-[var(--border)]">
                <DialogTitle>Session Results</DialogTitle>
              </DialogHeader>

              {/* Stat cards */}
              <div className="flex-none px-6 py-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-center">
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Score</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {correct}/{attempted}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-center">
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Accuracy</p>
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      accuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400'
                        : accuracy >= 70 ? 'text-amber-500'
                        : 'text-red-500'
                    )}>
                      {accuracy}%
                    </p>
                  </div>
                  <div className={cn(
                    'rounded-xl border p-3 text-center',
                    timeLeft >= 0
                      ? 'border-[var(--border)] bg-[var(--surface-sunken)]'
                      : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                  )}>
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                      {timeLeft >= 0 ? 'Time Left' : 'Overtime'}
                    </p>
                    <p className={cn(
                      'text-2xl font-bold font-mono tabular-nums',
                      timeLeft >= 0 ? 'text-[var(--foreground)]' : 'text-red-500'
                    )}>
                      {timeLeft >= 0 ? formatClock(timeLeft) : `+${formatClock(Math.abs(timeLeft))}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--muted-foreground)]">Mastery target: 90%</span>
                    <span className={cn(
                      'font-semibold',
                      accuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400'
                        : accuracy >= 70 ? 'text-amber-500'
                        : 'text-red-500'
                    )}>
                      {accuracy}%{accuracy >= 90 ? ' — target reached' : ''}
                    </span>
                  </div>
                  <Progress value={accuracy} className="h-2" />
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="flex-1 overflow-y-auto px-6 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                  Question Breakdown
                </p>
                <div className="space-y-0.5">
                  {rows.map((row, i) => {
                    const answered = row.yourAnswer !== null
                    const isRight  = answered && row.correctAnswer !== null && row.yourAnswer === row.correctAnswer
                    const isWrong  = answered && row.correctAnswer !== null && row.yourAnswer !== row.correctAnswer
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-4 py-2 rounded-lg px-2 -mx-2',
                          isRight && 'bg-emerald-50/60 dark:bg-emerald-950/10',
                          isWrong && 'bg-red-50/60 dark:bg-red-950/10',
                        )}
                      >
                        <span className="w-10 text-xs text-[var(--muted-foreground)] font-mono shrink-0 select-none">
                          Q{i + 1}
                        </span>
                        <AnswerBadge letter={row.yourAnswer} variant={isRight ? 'correct' : isWrong ? 'wrong' : 'neutral'} />
                        {row.correctAnswer && row.yourAnswer !== row.correctAnswer && (
                          <>
                            <span className="text-xs text-[var(--muted-foreground)]">→</span>
                            <AnswerBadge letter={row.correctAnswer} variant="correct" />
                          </>
                        )}
                        <div className="ml-auto">
                          {isRight && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {isWrong && <XCircle    className="h-4 w-4 text-red-500"     />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Total time: <span className="font-mono font-semibold text-[var(--foreground)]">{formatClock(timeElapsed)}</span>
                </p>
                <Button onClick={handleContinueToMissedAnalysis} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {missedCount > 0 ? 'Continue' : 'Save & Complete'}
                </Button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              MISSED ANALYSIS — tag each wrong answer
              ════════════════════════════════════════════════════════════ */}
          {phase === 'missed_analysis' && (
            <>
              <PhaseBar
                left={
                  <div>
                    <p className="text-sm font-semibold">Review Missed Questions</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Tag each miss to auto-populate your Error Log
                    </p>
                  </div>
                }
                right={
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-bold',
                      accuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400'
                        : accuracy >= 70 ? 'text-amber-500'
                        : 'text-red-500'
                    )}>{accuracy}%</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {missedRows.length} missed
                    </p>
                  </div>
                }
              />

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {missedRows.map(mr => (
                  <div
                    key={mr.questionIndex}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 space-y-3"
                  >
                    {/* Question number + answer comparison */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Question {mr.questionIndex + 1}</span>
                      <div className="flex items-center gap-2">
                        <AnswerBadge letter={rows[mr.questionIndex].yourAnswer} variant="wrong" />
                        <span className="text-xs text-[var(--muted-foreground)]">→</span>
                        <AnswerBadge letter={rows[mr.questionIndex].correctAnswer} variant="correct" />
                      </div>
                    </div>

                    {/* Subtopic + mistake type selectors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] mb-1 font-medium">Subtopic</p>
                        <Select
                          value={mr.subtopic ?? '__none__'}
                          onValueChange={v => updateMissedRow(mr.questionIndex, { subtopic: v === '__none__' ? null : v })}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="— subtopic —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs text-[var(--muted-foreground)]">— subtopic —</SelectItem>
                            {domainSkills.map(skill => (
                              <SelectItem key={skill} value={skill} className="text-xs">{skill}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] mb-1 font-medium">Mistake Type</p>
                        <Select
                          value={mr.mistakeType ?? '__none__'}
                          onValueChange={v => updateMissedRow(mr.questionIndex, { mistakeType: v === '__none__' ? null : v as MistakeType })}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="— type —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs text-[var(--muted-foreground)]">— type —</SelectItem>
                            {MISTAKE_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {taggedCount > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {taggedCount} question{taggedCount !== 1 ? 's' : ''} tagged — will be added to Error Log automatically.
                  </p>
                )}
              </div>

              <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-[var(--border)]">
                <Button variant="outline" onClick={() => handleSave([])} disabled={saving}>
                  Skip
                </Button>
                <Button onClick={() => handleSave(missedRows)} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save &amp; Complete Task
                </Button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              PLAN UPDATED — confirmation + adaptive changes
              ════════════════════════════════════════════════════════════ */}
          {phase === 'plan_updated' && (
            <>
              <DialogHeader className="flex-none px-6 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <DialogTitle>Plan Updated</DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
                {/* Score recap */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-0.5">Session Score</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {correct}/{attempted}
                      <span className="text-sm font-semibold ml-2 opacity-80">{accuracy}%</span>
                    </p>
                  </div>
                  {replanResult?.predictedScore ? (
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-0.5">Projected Score</p>
                      <p className="text-xl font-bold">{replanResult.predictedScore}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">if plan fully executed</p>
                    </div>
                  ) : null}
                </div>

                {/* Improvement + mastery metrics */}
                {sessionMetrics && (
                  <div className={cn(
                    'grid gap-3',
                    sessionMetrics.improvementPct !== null ? 'grid-cols-2' : 'grid-cols-1'
                  )}>
                    {sessionMetrics.improvementPct !== null && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-center">
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">vs. Prior Sessions</p>
                        <p className={cn(
                          'text-2xl font-bold',
                          sessionMetrics.improvementPct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        )}>
                          {sessionMetrics.improvementPct > 0 ? '+' : ''}{sessionMetrics.improvementPct}%
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">accuracy change</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-center">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Topic Mastery</p>
                      <p className="text-2xl font-bold">{sessionMetrics.topicMastery}%</p>
                      <Progress value={sessionMetrics.topicMastery} className="h-1.5 mt-2" />
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1">5-session rolling avg</p>
                    </div>
                  </div>
                )}

                {/* Error log notice */}
                {taggedCount > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs">
                      {taggedCount} missed question{taggedCount !== 1 ? 's' : ''} added to your Error Log
                    </p>
                  </div>
                )}

                {/* Replanner changes */}
                {replanResult && replanResult.tasksUpdated > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      {replanResult.tasksUpdated} upcoming task{replanResult.tasksUpdated !== 1 ? 's' : ''} adjusted
                    </p>
                    {replanResult.taskChanges.length > 0 && (
                      <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                        {replanResult.taskChanges.map(change => (
                          <div key={change.domainLabel} className="flex items-start justify-between px-4 py-2.5 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{change.domainLabel}</p>
                              <p className="text-[11px] text-[var(--muted-foreground)]">
                                {change.tasksAffected} task{change.tasksAffected !== 1 ? 's' : ''}
                                {change.difficultyChange && (
                                  <span className="text-amber-600 dark:text-amber-400"> · {change.difficultyChange}</span>
                                )}
                                {change.questionChange && (
                                  <span className="text-[var(--accent)]"> · {change.questionChange}</span>
                                )}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Priority</p>
                              <p className="text-xs font-bold">{change.newPriorityScore}/100</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No upcoming tasks to adjust — you may be close to your test date.
                  </div>
                )}
              </div>

              <DialogFooter className="flex-none px-6 py-4 border-t border-[var(--border)]">
                <Button onClick={() => { onOpenChange(false); onSuccess?.() }}>Done</Button>
              </DialogFooter>
            </>
          )}

        </div>{/* end animation wrapper */}

        {/* ── In-app confirmation overlay ── */}
        {confirm && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-overlay)]/90 backdrop-blur-sm p-6">
            <div className="w-full max-w-xs space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{confirm.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{confirm.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => { confirm.onConfirm(); setConfirm(null) }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}

        </div>{/* end relative wrapper */}
      </DialogContent>
    </Dialog>
  )
}
