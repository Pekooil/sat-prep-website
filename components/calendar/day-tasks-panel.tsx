'use client'

import * as React from 'react'
import { Plus, Trash2, CheckCircle2, Circle, ExternalLink, ClipboardList, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toggleTaskComplete, deleteCalendarTask } from '@/actions/calendar'
import { SessionWorkflowDialog } from './session-workflow-dialog'
import { PracticeTestScoreDialog } from './practice-test-score-dialog'
import type { CalendarTask } from '@/types'
import { formatDate, subjectLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { COLLEGE_BOARD_QB_URL } from '@/lib/constants'
import type { CollegeBoardFilter } from '@/types'

interface DayTasksPanelProps {
  date: string
  tasks: CalendarTask[]
  onReload: () => void
  onAddTask: () => void
}

function ReplannerBadge({ value, label, unit = '' }: { value: number | null; label: string; unit?: string }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex flex-col items-center min-w-0">
      <span className="text-[10px] text-[var(--muted-foreground)] leading-none">{label}</span>
      <span className="text-xs font-semibold mt-0.5 text-[var(--foreground)]">
        {unit}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}{unit === '' && label === 'Weight' ? '' : ''}
      </span>
    </div>
  )
}

function ReplannerMetadata({ task }: { task: CalendarTask }) {
  const hasData = task.priority_score != null && task.priority_score > 0
  if (!hasData) return null

  const isPracticeTest = task.category === 'Full Practice Test'

  return (
    <div className="pl-6 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-2 space-y-2">
      <div className="flex items-center gap-1">
        <RefreshCw className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          AI Replanner Info
        </p>
        {task.last_replanned_at && (
          <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
            updated {formatDistanceToNow(new Date(task.last_replanned_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {!isPracticeTest && (
        <div className="grid grid-cols-4 gap-2 divide-x divide-amber-200 dark:divide-amber-900">
          <ReplannerBadge value={task.priority_score} label="Priority" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--muted-foreground)] leading-none">Mastery</span>
            <span className="text-xs font-semibold mt-0.5">{task.mastery_target}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--muted-foreground)] leading-none">Impact</span>
            <span className="text-xs font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">
              +{task.estimated_score_impact ?? 0} pts
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--muted-foreground)] leading-none">Weight</span>
            <span className="text-xs font-semibold mt-0.5">
              {Math.round((task.replanning_weight ?? 0) * 100)}%
            </span>
          </div>
        </div>
      )}

      {isPracticeTest && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">
          Practice tests are protected — the replanner never removes or reschedules them.
        </p>
      )}
    </div>
  )
}

export function DayTasksPanel({ date, tasks, onReload, onAddTask }: DayTasksPanelProps) {
  const [sessionWorkflowTaskId, setSessionWorkflowTaskId] = React.useState<string | null>(null)
  const [practiceScoreTaskId, setPracticeScoreTaskId]     = React.useState<string | null>(null)

  const sessionWorkflowTask = tasks.find(t => t.id === sessionWorkflowTaskId) ?? null
  const practiceTestTask    = tasks.find(t => t.id === practiceScoreTaskId)   ?? null

  async function handleCompleteClick(task: CalendarTask) {
    if (task.is_completed) {
      // Un-completing: do it directly (removes replan_locked)
      await toggleTaskComplete(task.id, false)
      onReload()
      return
    }

    const isPracticeTest = task.category === 'Full Practice Test'
    const isPlanTask     = !!task.study_plan_id

    if (isPracticeTest && isPlanTask) {
      setPracticeScoreTaskId(task.id)
    } else if (isPlanTask && !isPracticeTest) {
      setSessionWorkflowTaskId(task.id)
    } else {
      // Manually-created task — complete directly
      await toggleTaskComplete(task.id, true)
      onReload()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    await deleteCalendarTask(id)
    onReload()
  }

  return (
    <>
      <Card className="sticky top-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">{formatDate(date)}</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              {tasks.filter(t => t.is_completed).length > 0 && ` · ${tasks.filter(t => t.is_completed).length} done`}
            </p>
          </div>
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={onAddTask}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>

        <CardContent className="pt-0 space-y-3 max-h-[70vh] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No tasks for this day</p>
              <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2" onClick={onAddTask}>
                Add a task
              </button>
            </div>
          ) : (
            tasks.map(task => {
              const filters        = task.college_board_filters as CollegeBoardFilter | null
              const isPracticeTest = task.category === 'Full Practice Test'
              const isPlanTask     = !!task.study_plan_id

              return (
                <div
                  key={task.id}
                  className={cn(
                    'rounded-lg border border-[var(--border)] p-3 space-y-2',
                    task.is_completed && 'opacity-60 bg-slate-50 dark:bg-slate-800/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleCompleteClick(task)}
                      className="mt-0.5 shrink-0"
                      title={task.is_completed ? 'Mark incomplete' : isPlanTask ? 'Log results & complete' : 'Mark complete'}
                    >
                      {task.is_completed
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <Circle className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', task.is_completed && 'line-through text-[var(--muted-foreground)]')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          variant={task.subject === 'math' ? 'math' : task.subject === 'reading_writing' ? 'reading' : 'default'}
                          className="text-[10px] py-0"
                        >
                          {subjectLabel(task.subject)}
                        </Badge>
                        {task.duration_minutes && (
                          <span className="text-xs text-[var(--muted-foreground)]">{task.duration_minutes}m</span>
                        )}
                        {isPracticeTest && (
                          <Badge variant="default" className="text-[10px] py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            Practice Test
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Log session button for incomplete plan tasks */}
                      {!task.is_completed && isPlanTask && !isPracticeTest && (
                        <button
                          onClick={() => setSessionWorkflowTaskId(task.id)}
                          className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[var(--muted-foreground)] hover:text-blue-500"
                          title="Start session"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-500"
                        title="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-[var(--muted-foreground)] pl-6">{task.description}</p>
                  )}

                  {filters && (
                    <div className="pl-6 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-2 space-y-1">
                      <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                        📋 College Board QB Filters
                      </p>
                      <div className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
                        {filters.domain && <p>Domain: <span className="font-medium">{filters.domain}</span></p>}
                        {filters.skill && <p>Skill: <span className="font-medium">{filters.skill}</span></p>}
                        {filters.difficulty && <p>Difficulty: <span className="font-medium capitalize">{filters.difficulty}</span></p>}
                      </div>
                      <a
                        href={COLLEGE_BOARD_QB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Open College Board Question Bank
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}

                  <ReplannerMetadata task={task} />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Session Workflow Dialog */}
      {sessionWorkflowTask && (
        <SessionWorkflowDialog
          open={!!sessionWorkflowTaskId}
          onOpenChange={open => { if (!open) setSessionWorkflowTaskId(null) }}
          task={sessionWorkflowTask}
          onSuccess={() => { setSessionWorkflowTaskId(null); onReload() }}
        />
      )}

      {/* Practice Test Score Dialog */}
      {practiceTestTask && (
        <PracticeTestScoreDialog
          open={!!practiceScoreTaskId}
          onOpenChange={open => { if (!open) setPracticeScoreTaskId(null) }}
          task={practiceTestTask}
          onSuccess={() => { setPracticeScoreTaskId(null); onReload() }}
        />
      )}
    </>
  )
}
