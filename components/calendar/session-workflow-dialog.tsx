'use client'

import * as React from 'react'
import { Loader2, Timer, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react'
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Letter = 'A' | 'B' | 'C' | 'D'
type WorkflowPhase = 'idle' | 'active' | 'review' | 'results' | 'missed_analysis' | 'plan_updated'

interface QuestionRow {
  yourAnswer: Letter | null
  correctAnswer: Letter | null
}

interface SessionWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: CalendarTask
  onSuccess?: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECS_PER_Q: Record<string, number> = {
  math:             95,
  reading_writing:  71,
  both:             71,
}

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

const LETTERS: Letter[] = ['A', 'B', 'C', 'D']

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimerDisplay({ elapsed, allocated }: { elapsed: number; allocated: number }) {
  const remaining = allocated - elapsed
  const overtime  = remaining <= 0

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold tabular-nums',
      overtime
        ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
    )}>
      <Timer className="h-4 w-4 shrink-0" />
      {overtime
        ? <span>+{formatClock(Math.abs(remaining))} overtime</span>
        : <span>{formatClock(remaining)}</span>
      }
    </div>
  )
}

function AnswerDropdown({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select',
}: {
  value: Letter | null
  onChange: (v: Letter) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <Select value={value ?? ''} onValueChange={v => onChange(v as Letter)} disabled={disabled}>
      <SelectTrigger className="h-8 w-20 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {LETTERS.map(l => (
          <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

  const questionCount  = React.useMemo(() => parseQuestionCount(task.title), [task.title])
  const allocSecs      = React.useMemo(() => allocatedSeconds(questionCount, task.subject), [questionCount, task.subject])
  const filters        = task.college_board_filters as CollegeBoardFilter | null

  // Skills for the task's domain — used in the missed-analysis subtopic selector
  const domainSkills = React.useMemo(() => {
    const domain = DOMAIN_CATALOG.find(d => d.label === task.category)
    return domain?.skills.map(s => s.label) ?? []
  }, [task.category])

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase]             = React.useState<WorkflowPhase>('idle')
  const [rows, setRows]               = React.useState<QuestionRow[]>([])
  const [timeElapsed, setElapsed]     = React.useState(0)
  const [timedOut, setTimedOut]       = React.useState(false)
  const [saving, setSaving]           = React.useState(false)
  const [missedRows, setMissedRows]   = React.useState<MissedAnalysisEntry[]>([])
  const [sessionMetrics, setSessionMetrics] = React.useState<SessionMetrics | null>(null)
  const [replanResult, setReplanResult] = React.useState<{
    tasksUpdated: number
    taskChanges: DomainChange[]
    predictedScore: number
  } | null>(null)

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Timer management ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'active') return
    intervalRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  // "Time's up" notification — fire once when timer expires
  React.useEffect(() => {
    if (phase === 'active' && !timedOut && timeElapsed >= allocSecs) {
      setTimedOut(true)
      toast({
        title: "⏰ Time's up!",
        description: "You can still finish — take your time. Timer is now in overtime.",
      })
    }
  }, [timeElapsed, allocSecs, phase, timedOut, toast])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setPhase('idle')
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
    setRows(Array.from({ length: questionCount }, () => ({ yourAnswer: null, correctAnswer: null })))
    setElapsed(0)
    setTimedOut(false)
    setPhase('active')
  }

  function handleSubmit() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPhase('review')
  }

  function handleSeeResults() {
    setPhase('results')
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
      // Perfect score — skip analysis and save immediately
      await handleSave([])
      return
    }

    const prefilledSubtopic = (filters?.skill as string | undefined) ?? null
    setMissedRows(
      missed.map(({ i }) => ({
        questionIndex: i,
        subtopic:      prefilledSubtopic,
        mistakeType:   null,
        studentAnswer: rows[i].yourAnswer,
        correctAnswer: rows[i].correctAnswer,
      }))
    )
    setPhase('missed_analysis')
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
        title: 'Error log not created',
        description: `Session saved, but mistakes could not be logged: ${result.errorLogWarning}`,
        variant: 'destructive',
      })
    }

    await toggleTaskComplete(task.id, true)

    if (result.replanner) setReplanResult(result.replanner)
    if (result.metrics)   setSessionMetrics(result.metrics)
    setPhase('plan_updated')
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
  const attempted    = rows.filter(r => r.yourAnswer !== null).length
  const correct      = rows.filter(r => r.yourAnswer !== null && r.yourAnswer === r.correctAnswer).length
  const accuracy     = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const timeLeft     = allocSecs - timeElapsed
  const missedCount  = rows.filter(r =>
    r.yourAnswer !== null && r.correctAnswer !== null && r.yourAnswer !== r.correctAnswer
  ).length
  const taggedCount  = missedRows.filter(r => r.mistakeType !== null).length

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'flex flex-col gap-0 p-0 overflow-hidden',
        phase === 'active' || phase === 'review' || phase === 'results' || phase === 'missed_analysis'
          ? 'sm:max-w-2xl max-h-[90vh]'
          : 'sm:max-w-md'
      )}>

        {/* ── IDLE ─────────────────────────────────────────────────────────── */}
        {phase === 'idle' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Start Study Session</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
                <p className="font-medium text-sm">{task.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={task.subject === 'math' ? 'math' : 'reading'} className="text-[10px]">
                    {task.subject === 'math' ? 'Math' : 'Reading & Writing'}
                  </Badge>
                  {filters?.difficulty && (
                    <Badge variant="outline" className="text-[10px] capitalize">{filters.difficulty}</Badge>
                  )}
                </div>
                {filters?.domain && (
                  <p className="text-xs text-[var(--muted-foreground)]">{filters.domain}{filters.skill ? ` · ${filters.skill}` : ''}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Questions</p>
                  <p className="text-2xl font-bold mt-0.5">{questionCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Time Budget</p>
                  <p className="text-2xl font-bold mt-0.5">{formatClock(allocSecs)}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {SECS_PER_Q[task.subject] ?? 71}s per question
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--muted-foreground)] text-center">
                Enter your answers as you complete each question on the College Board Question Bank.
                After submitting, enter the correct answers to see your results.
              </p>
            </div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleStart}>Start Session</Button>
            </DialogFooter>
          </>
        )}

        {/* ── ACTIVE ───────────────────────────────────────────────────────── */}
        {phase === 'active' && (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-10">
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{questionCount} questions</p>
              </div>
              <TimerDisplay elapsed={timeElapsed} allocated={allocSecs} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-12">#</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Your Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50">
                      <td className="py-1.5 text-xs text-[var(--muted-foreground)] font-mono">Q{i + 1}</td>
                      <td className="py-1.5">
                        <AnswerDropdown
                          value={row.yourAnswer}
                          onChange={v => setYourAnswer(i, v)}
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)]">
                {rows.filter(r => r.yourAnswer !== null).length}/{questionCount} answered
              </p>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </>
        )}

        {/* ── REVIEW ───────────────────────────────────────────────────────── */}
        {phase === 'review' && (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-medium">Enter Correct Answers</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Check your answers against the College Board QB results
                </p>
              </div>
              <div className="text-right text-xs text-[var(--muted-foreground)]">
                <p>Time used: <span className="font-mono font-medium">{formatClock(timeElapsed)}</span></p>
                {timeLeft >= 0
                  ? <p className="text-emerald-600 dark:text-emerald-400">Left: {formatClock(timeLeft)}</p>
                  : <p className="text-red-500">Overtime: +{formatClock(Math.abs(timeLeft))}</p>
                }
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-12">#</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Your Answer</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Correct Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50">
                      <td className="py-1.5 text-xs text-[var(--muted-foreground)] font-mono">Q{i + 1}</td>
                      <td className="py-1.5">
                        <span className={cn(
                          'inline-flex h-8 w-20 items-center justify-center rounded-md border text-xs font-medium',
                          row.yourAnswer
                            ? 'bg-slate-100 dark:bg-slate-800 border-[var(--border)]'
                            : 'text-[var(--muted-foreground)] border-dashed border-[var(--border)]'
                        )}>
                          {row.yourAnswer ?? '—'}
                        </span>
                      </td>
                      <td className="py-1.5">
                        <AnswerDropdown
                          value={row.correctAnswer}
                          onChange={v => setCorrectAnswer(i, v)}
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-[var(--border)] flex justify-end">
              <Button onClick={handleSeeResults}>See Results</Button>
            </div>
          </>
        )}

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        {phase === 'results' && (
          <>
            <DialogHeader className="px-6 pt-5 pb-3">
              <DialogTitle>Session Results</DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Score</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {correct}/{attempted}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Accuracy</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{accuracy}%</p>
                </div>
                <div className={cn(
                  'rounded-lg p-3',
                  timeLeft >= 0
                    ? 'bg-slate-50 dark:bg-slate-800/50'
                    : 'bg-red-50 dark:bg-red-950/30'
                )}>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {timeLeft >= 0 ? 'Time Left' : 'Overtime'}
                  </p>
                  <p className={cn(
                    'text-2xl font-bold font-mono',
                    timeLeft >= 0
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-red-500'
                  )}>
                    {timeLeft >= 0 ? formatClock(timeLeft) : `+${formatClock(Math.abs(timeLeft))}`}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Budget: {formatClock(allocSecs)}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Accuracy</span>
                  <span className={cn(
                    'font-medium',
                    accuracy >= 90 ? 'text-emerald-600' : accuracy >= 70 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {accuracy}% {accuracy >= 90 ? '✓ Mastery target reached' : `(target: 90%)`}
                  </span>
                </div>
                <Progress value={accuracy} className="h-2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-12">#</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Your Answer</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Correct</th>
                    <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const answered = row.yourAnswer !== null
                    const isRight  = answered && row.correctAnswer !== null && row.yourAnswer === row.correctAnswer
                    const isWrong  = answered && row.correctAnswer !== null && row.yourAnswer !== row.correctAnswer
                    return (
                      <tr key={i} className={cn(
                        'border-b border-[var(--border)]/50',
                        isRight && 'bg-emerald-50/50 dark:bg-emerald-950/10',
                        isWrong && 'bg-red-50/50 dark:bg-red-950/10',
                      )}>
                        <td className="py-1.5 text-xs text-[var(--muted-foreground)] font-mono">Q{i + 1}</td>
                        <td className="py-1.5 text-xs font-medium">{row.yourAnswer ?? <span className="text-[var(--muted-foreground)]">—</span>}</td>
                        <td className="py-1.5 text-xs font-medium">{row.correctAnswer ?? <span className="text-[var(--muted-foreground)]">—</span>}</td>
                        <td className="py-1.5">
                          {isRight && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          {isWrong && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-[var(--border)] flex justify-between items-center">
              <p className="text-xs text-[var(--muted-foreground)]">
                Total time: <span className="font-mono font-medium">{formatClock(timeElapsed)}</span>
              </p>
              <Button onClick={handleContinueToMissedAnalysis} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {missedCount > 0 ? 'Continue' : 'Save & Complete Task'}
              </Button>
            </div>
          </>
        )}

        {/* ── MISSED ANALYSIS ──────────────────────────────────────────────── */}
        {phase === 'missed_analysis' && (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-medium">Review Missed Questions</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {missedRows.length} missed · {task.category}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-bold',
                  accuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400' : accuracy >= 70 ? 'text-amber-500' : 'text-red-500'
                )}>{accuracy}%</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">accuracy</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-3">
                Tag each missed question with a subtopic and mistake type to auto-populate your Error Log.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-10">#</th>
                      <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-10">Yours</th>
                      <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium w-14">Correct</th>
                      <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Subtopic</th>
                      <th className="text-left py-2 text-xs text-[var(--muted-foreground)] font-medium">Mistake Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missedRows.map(mr => (
                      <tr key={mr.questionIndex} className="border-b border-[var(--border)]/50">
                        <td className="py-2 text-xs text-[var(--muted-foreground)] font-mono">Q{mr.questionIndex + 1}</td>
                        <td className="py-2">
                          <span className="inline-flex h-7 w-8 items-center justify-center rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-xs font-medium text-red-600 dark:text-red-400">
                            {rows[mr.questionIndex].yourAnswer}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex h-7 w-8 items-center justify-center rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {rows[mr.questionIndex].correctAnswer}
                          </span>
                        </td>
                        <td className="py-2 pr-2">
                          <Select
                            value={mr.subtopic ?? '__none__'}
                            onValueChange={v => updateMissedRow(mr.questionIndex, { subtopic: v === '__none__' ? null : v })}
                          >
                            <SelectTrigger className="h-8 text-xs w-[175px]">
                              <SelectValue placeholder="— subtopic —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs text-[var(--muted-foreground)]">— subtopic —</SelectItem>
                              {domainSkills.map(skill => (
                                <SelectItem key={skill} value={skill} className="text-xs">{skill}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2">
                          <Select
                            value={mr.mistakeType ?? '__none__'}
                            onValueChange={v => updateMissedRow(mr.questionIndex, { mistakeType: v === '__none__' ? null : v as MistakeType })}
                          >
                            <SelectTrigger className="h-8 text-xs w-[155px]">
                              <SelectValue placeholder="— mistake type —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs text-[var(--muted-foreground)]">— mistake type —</SelectItem>
                              {MISTAKE_TYPE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {taggedCount > 0 && (
                <p className="text-xs text-[var(--muted-foreground)] mt-3">
                  {taggedCount} question{taggedCount !== 1 ? 's' : ''} tagged — will be added to Error Log automatically.
                </p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[var(--border)] flex justify-between items-center">
              <Button variant="outline" onClick={() => handleSave([])} disabled={saving}>
                Skip Analysis
              </Button>
              <Button onClick={() => handleSave(missedRows)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Complete Task
              </Button>
            </div>
          </>
        )}

        {/* ── PLAN UPDATED ─────────────────────────────────────────────────── */}
        {phase === 'plan_updated' && (
          <>
            <DialogHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <DialogTitle>Plan Updated</DialogTitle>
              </div>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
              {/* Score recap */}
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Session Score</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {correct}/{attempted} &nbsp;·&nbsp; {accuracy}%
                  </p>
                </div>
                {replanResult?.predictedScore ? (
                  <div className="text-right">
                    <p className="text-xs text-[var(--muted-foreground)]">Potential Score</p>
                    <p className="text-lg font-bold">{replanResult.predictedScore}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">if plan is fully executed</p>
                  </div>
                ) : null}
              </div>

              {/* Session metrics: improvement + mastery */}
              {sessionMetrics && (
                <div className={cn(
                  'grid gap-3',
                  sessionMetrics.improvementPct !== null ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {sessionMetrics.improvementPct !== null && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                      <p className="text-xs text-[var(--muted-foreground)]">vs. Prior Sessions</p>
                      <p className={cn(
                        'text-xl font-bold',
                        sessionMetrics.improvementPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400'
                      )}>
                        {sessionMetrics.improvementPct > 0 ? '+' : ''}{sessionMetrics.improvementPct}%
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">improvement</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                    <p className="text-xs text-[var(--muted-foreground)]">Topic Mastery</p>
                    <p className="text-xl font-bold">{sessionMetrics.topicMastery}%</p>
                    <Progress value={sessionMetrics.topicMastery} className="h-1.5 mt-1" />
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">5-session rolling avg</p>
                  </div>
                </div>
              )}

              {/* Error log auto-entry notice */}
              {taggedCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs">
                    {taggedCount} missed question{taggedCount !== 1 ? 's' : ''} logged to Error Log with mistake types
                  </p>
                </div>
              )}

              {/* Replanner summary */}
              {replanResult && replanResult.tasksUpdated > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    {replanResult.tasksUpdated} upcoming task{replanResult.tasksUpdated !== 1 ? 's' : ''} adjusted
                  </p>

                  {replanResult.taskChanges.length > 0 && (
                    <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                      {replanResult.taskChanges.map(change => (
                        <div key={change.domainLabel} className="flex items-start justify-between px-3 py-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{change.domainLabel}</p>
                            <p className="text-[var(--muted-foreground)]">
                              {change.tasksAffected} task{change.tasksAffected !== 1 ? 's' : ''}
                              {change.difficultyChange && (
                                <span className="text-amber-600 dark:text-amber-400"> · {change.difficultyChange}</span>
                              )}
                              {change.questionChange && (
                                <span className="text-blue-600 dark:text-blue-400"> · {change.questionChange}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[var(--muted-foreground)]">Priority</p>
                            <p className="font-semibold">{change.newPriorityScore}/100</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm text-[var(--muted-foreground)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>No upcoming tasks to adjust — you may be close to your test date.</p>
                </div>
              )}
            </div>

            <DialogFooter className="px-6 pb-6">
              <Button onClick={() => { onOpenChange(false); onSuccess?.() }}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
