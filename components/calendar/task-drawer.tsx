'use client'

import * as React from 'react'
import {
  X, ExternalLink, Clock, BookOpen, Target, ClipboardList,
  CheckCircle2, Zap, BarChart2, ChevronRight, AlertCircle, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, subjectLabel } from '@/lib/utils'
import { COLLEGE_BOARD_QB_URL } from '@/lib/constants'
import type { CalendarTask, CollegeBoardFilter } from '@/types'
import { getCategoryColor } from './task-colors'
import { getSessionForTask } from '@/actions/question-sessions'
import type { SessionSummary } from '@/actions/question-sessions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseQuestionCount(title: string): number | null {
  const m = title.match(/·\s*(\d+)q/i)
  return m ? parseInt(m[1], 10) : null
}

/** Maps a per-domain mastery target to a short contextual tier label. */
function masteryTierLabel(target: number | null | undefined): string {
  if (!target) return 'Mastery Goal'
  if (target <= 65) return 'Entry Goal'
  if (target <= 75) return 'Step-Up Goal'
  if (target <= 82) return 'Stretch Goal'
  if (target <= 90) return 'Near-Mastery'
  return 'Peak Target'
}

/** Card surface for the mastery target panel — calm neutral, accent reserved for the value. */
function masteryTierColor(_target: number | null | undefined): string {
  return 'bg-[var(--surface-sunken)] border border-[var(--border)]'
}

function masteryTierIconColor(_target: number | null | undefined): string {
  return 'text-[var(--accent)]'
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

const QB_STEPS = [
  'Sign in to your College Board account at collegeboard.org.',
  'Navigate to the Digital SAT Question Bank using the link above.',
  'In the Domain filter, select the domain shown above.',
  'In the Skill filter, select the skill shown above.',
  'In the Difficulty filter, select the difficulty shown above.',
  'Set the number of questions to the target count, then begin.',
  'When finished, return here and click "Start Session" to record your results and update your plan.',
]

const PRACTICE_TEST_STEPS = [
  'Download the Bluebook app from the College Board website if you haven\'t already.',
  'Open Bluebook and select a full-length practice test.',
  'Set aside a full, uninterrupted ~2 hr 14 min block for the test.',
  'Complete all four modules: two Reading & Writing, two Math.',
  'Score your test using the provided answer key in Bluebook.',
  'Return here and click "Enter Score" to log your results. Your plan will be updated automatically.',
]

// ─── Session Results Panel ────────────────────────────────────────────────────

function SessionResultsPanel({
  session,
  masteryTarget,
}: {
  session: SessionSummary
  masteryTarget: number | null | undefined
}) {
  const { questions_attempted: attempted, questions_correct: correct, time_spent_minutes: timeSpent } = session
  const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const goalMet   = masteryTarget != null && masteryTarget > 0 && accuracy >= masteryTarget
  const gap       = masteryTarget != null && masteryTarget > 0 ? accuracy - masteryTarget : null
  const hasGoal   = masteryTarget != null && masteryTarget > 0

  return (
    <div className="space-y-3">

      {/* Score + accuracy cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--muted)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--foreground)] tabular-nums">
            {correct}<span className="text-sm font-normal text-[var(--muted-foreground)]">/{attempted}</span>
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Questions Correct</p>
        </div>
        <div className={cn(
          'rounded-lg p-3 text-center border',
          hasGoal
            ? goalMet
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
            : 'bg-[var(--muted)] border-[var(--border)]',
        )}>
          <p className={cn(
            'text-xl font-bold tabular-nums',
            hasGoal
              ? goalMet
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
              : 'text-[var(--foreground)]',
          )}>
            {accuracy}%
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Accuracy</p>
        </div>
      </div>

      {/* vs Mastery Goal */}
      {hasGoal && (
        <div className={cn(
          'rounded-xl border p-3.5 space-y-3',
          goalMet
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
        )}>
          {/* Met / Not Met header */}
          <div className={cn(
            'flex items-center gap-2 text-sm font-semibold',
            goalMet
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-amber-700 dark:text-amber-300',
          )}>
            {goalMet
              ? <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Goal Reached!</>
              : <><AlertCircle className="h-4 w-4 flex-shrink-0" /> Goal Not Yet Reached</>}
          </div>

          {/* Progress bar with goal marker */}
          <div className="space-y-1">
            <div className="relative h-2.5">
              {/* Track */}
              <div className="absolute inset-0 rounded-full bg-[var(--border)]" />
              {/* Accuracy fill */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all',
                  goalMet ? 'bg-emerald-500' : 'bg-amber-500',
                )}
                style={{ width: `${Math.min(100, accuracy)}%` }}
              />
              {/* Goal marker */}
              <div
                className="absolute inset-y-0 w-0.5 rounded-full bg-[var(--accent)]"
                style={{ left: `${Math.min(99, masteryTarget!)}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            {/* Labels */}
            <div className="flex items-center justify-between text-[10px]">
              <span className={cn(
                'font-medium',
                goalMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )}>
                Your score: {accuracy}%
              </span>
              <span className="text-[var(--accent)] font-medium flex items-center gap-0.5">
                <span className="inline-block h-2 w-0.5 rounded-full bg-[var(--accent)]" />
                Goal: {masteryTarget}%
              </span>
            </div>
          </div>

          {/* Gap description */}
          <p className={cn(
            'text-xs leading-relaxed',
            goalMet ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300',
          )}>
            {goalMet
              ? gap === 0
                ? `You hit the target exactly. Great consistency!`
                : `You exceeded the goal by ${gap}%. Excellent work — consider advancing to harder questions.`
              : `You're ${Math.abs(gap!)}% below the ${masteryTarget}% goal. Keep practicing — log more sessions in this domain to close the gap.`}
          </p>
        </div>
      )}

      {/* Time spent */}
      {timeSpent != null && timeSpent > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{timeSpent} min spent on this session</span>
        </div>
      )}

    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskDrawerProps {
  task: CalendarTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartSession: (task: CalendarTask) => void
  onMarkComplete: (task: CalendarTask) => void
}

export function TaskDrawer({
  task,
  open,
  onOpenChange,
  onStartSession,
  onMarkComplete,
}: TaskDrawerProps) {
  // Trap focus & keyboard dismiss
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  // Prevent body scroll while open
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Fetch session results for completed non-practice-test tasks
  const [sessionData, setSessionData]       = React.useState<SessionSummary | null>(null)
  const [sessionLoading, setSessionLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !task?.is_completed || task.category === 'Full Practice Test') {
      setSessionData(null)
      return
    }
    let cancelled = false
    setSessionLoading(true)
    getSessionForTask(task.id).then(({ data }) => {
      if (!cancelled) { setSessionData(data); setSessionLoading(false) }
    })
    return () => { cancelled = true }
  }, [task?.id, open, task?.is_completed, task?.category])

  const colors = getCategoryColor(task?.category)
  const filters = task?.college_board_filters as CollegeBoardFilter | null
  const questionCount = task ? parseQuestionCount(task.title) : null
  const isPracticeTest = task?.category === 'Full Practice Test'
  const isPlanTask = !!(task?.study_plan_id)
  const examPaceMinutes = questionCount && task
    ? Math.ceil(questionCount * (task.subject === 'math' ? 95 : 71) / 60)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task?.title ?? 'Task details'}
        className={cn(
          'fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col',
          'bg-[var(--card)] border-l border-[var(--border)] shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {task && (
          <>
            {/* ── Header ── */}
            <div className={cn('p-5 border-b border-[var(--border)]', colors.bg)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', colors.dot)} />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', colors.text)}>
                      {task.category ?? 'Study Task'}
                    </span>
                    {task.is_completed && (
                      <Badge variant="success" className="text-[10px] py-0 ml-1">Done</Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-[var(--foreground)] leading-snug">
                    {task.title}
                  </h2>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-sm p-1 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick stats strip */}
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>{subjectLabel(task.subject)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{task.duration_minutes ?? 60} min</span>
                </div>
                {questionCount && (
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>{questionCount} questions</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* ── Session Results (completed tasks only) ── */}
              {task.is_completed && !isPracticeTest && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Session Results
                  </h3>
                  {sessionLoading ? (
                    <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 animate-pulse">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-14 rounded-lg bg-[var(--muted)]" />
                        <div className="h-14 rounded-lg bg-[var(--muted)]" />
                      </div>
                      <div className="h-20 rounded-lg bg-[var(--muted)]" />
                    </div>
                  ) : sessionData ? (
                    <SessionResultsPanel
                      session={sessionData}
                      masteryTarget={task.mastery_target}
                    />
                  ) : (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      No session data found. This task may have been marked complete without logging a session.
                    </div>
                  )}
                </section>
              )}

              {/* QB Filters */}
              {filters && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                    College Board Question Bank Filters
                  </h3>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--accent-soft)] p-4 space-y-3">
                    {filters.domain && (
                      <FilterRow label="Domain" value={filters.domain} />
                    )}
                    {filters.skill && (
                      <FilterRow label="Skill" value={filters.skill} />
                    )}
                    {filters.difficulty && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted-foreground)]">Difficulty</span>
                        <Badge className={cn(
                          'text-[10px] capitalize',
                          filters.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : filters.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                        )}>
                          {filters.difficulty}
                        </Badge>
                      </div>
                    )}
                    {questionCount && (
                      <div className="flex items-center justify-between text-sm border-t border-[var(--border)] pt-2">
                        <span className="text-[var(--muted-foreground)]">Target questions</span>
                        <span className="font-semibold text-[var(--accent-soft-foreground)]">{questionCount}</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={COLLEGE_BOARD_QB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium"
                  >
                    Open College Board Question Bank
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </section>
              )}

              {/* Instructions — hidden for completed tasks (already done) */}
              {!task.is_completed && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                    {isPracticeTest ? 'How to Complete This Test' : 'How to Obtain Your Questions'}
                  </h3>
                  {isPracticeTest ? (
                    <ol className="space-y-2.5">
                      {PRACTICE_TEST_STEPS.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-[var(--muted-foreground)]">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[var(--muted)] text-[var(--foreground)] text-[10px] font-semibold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Link
                      href="/tutorial"
                      className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline font-medium"
                    >
                      View the Tutorial for step-by-step instructions
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </section>
              )}

              {/* Expected Completion Time */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                  Expected Completion Time
                </h3>
                <div className="rounded-xl bg-[var(--muted)] p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {task.duration_minutes ?? 60} minutes allocated
                    </p>
                    {examPaceMinutes && !isPracticeTest && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        ~{examPaceMinutes} min at exam pace ({task.subject === 'math' ? '95' : '71'}s/question)
                      </p>
                    )}
                    {isPracticeTest && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        ~2 hr 14 min for a full Digital SAT
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Adaptive Planner metadata */}
              {!isPracticeTest && task.priority_score != null && task.priority_score > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                    Adaptive Planner
                  </h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <MetaStat
                      label="Priority"
                      value={String(task.priority_score)}
                      colorClass="bg-[var(--surface-sunken)] border border-[var(--border)]"
                      icon={<Zap className="h-3 w-3 text-[var(--warning)]" />}
                    />
                    <MetaStat
                      label="Score Impact"
                      value={`+${task.estimated_score_impact ?? 0} pts`}
                      colorClass="bg-[var(--surface-sunken)] border border-[var(--border)]"
                      icon={<BarChart2 className="h-3 w-3 text-[var(--success)]" />}
                    />
                    <MetaStat
                      label={masteryTierLabel(task.mastery_target)}
                      value={`${task.mastery_target ?? 90}%`}
                      colorClass={masteryTierColor(task.mastery_target)}
                      icon={<Target className={cn('h-3 w-3', masteryTierIconColor(task.mastery_target))} />}
                    />
                  </div>
                  {/* Mastery target context bar */}
                  {task.mastery_target != null && task.mastery_target > 0 && (
                    <div className={cn(
                      'rounded-lg px-3 py-2.5 text-xs',
                      masteryTierColor(task.mastery_target),
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-[var(--foreground)]">
                          {masteryTierLabel(task.mastery_target)}
                        </span>
                        <span className={cn('font-bold', masteryTierIconColor(task.mastery_target))}>
                          {task.mastery_target}% target
                        </span>
                      </div>
                      <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${task.mastery_target}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[var(--muted-foreground)] leading-relaxed">
                        {task.mastery_target <= 65
                          ? 'A first achievable milestone — reach this accuracy before moving on.'
                          : task.mastery_target <= 75
                          ? 'A step-up goal — shows real progress from where you started.'
                          : task.mastery_target <= 82
                          ? 'A stretch goal — you\'re developing; push toward consistent accuracy.'
                          : task.mastery_target <= 90
                          ? 'Near-mastery — one strong push to reach the top tier.'
                          : 'Peak target — maintain elite accuracy and refine edge cases.'}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Task description */}
              {task.description && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {task.description}
                  </p>
                </section>
              )}
            </div>

            {/* ── Footer actions ── */}
            <div className="p-4 border-t border-[var(--border)] flex gap-2">
              {task.is_completed ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Task completed
                </div>
              ) : (
                <>
                  {isPlanTask && !isPracticeTest && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => { onStartSession(task); onOpenChange(false) }}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Start Session
                    </Button>
                  )}
                  {isPlanTask && isPracticeTest && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => { onStartSession(task); onOpenChange(false) }}
                    >
                      <ChevronRight className="h-4 w-4" />
                      Enter Score
                    </Button>
                  )}
                  {!isPlanTask && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { onMarkComplete(task); onOpenChange(false) }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Mark Complete
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[var(--muted-foreground)] flex-shrink-0">{label}</span>
      <span className="font-medium text-[var(--accent-soft-foreground)] text-right">{value}</span>
    </div>
  )
}

function MetaStat({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string
  value: string
  colorClass: string
  icon: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg p-2 text-center space-y-1', colorClass)}>
      <div className="flex justify-center">{icon}</div>
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
      <p className="text-xs font-bold text-[var(--foreground)]">{value}</p>
    </div>
  )
}
