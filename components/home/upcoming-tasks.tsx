'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, ArrowRight, CalendarDays, ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SessionWorkflowDialog } from '@/components/calendar/session-workflow-dialog'
import { PracticeTestScoreDialog } from '@/components/calendar/practice-test-score-dialog'
import { toggleTaskComplete } from '@/actions/calendar'
import { getCategoryColor } from '@/components/calendar/task-colors'
import type { CalendarTask, CollegeBoardFilter } from '@/types'
import { formatDate, subjectLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UpcomingTasksProps {
  tasks: CalendarTask[]
}

export function UpcomingTasks({ tasks: initialTasks }: UpcomingTasksProps) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState(initialTasks)
  const [sessionTaskId, setSessionTaskId] = React.useState<string | null>(null)
  const [practiceTaskId, setPracticeTaskId] = React.useState<string | null>(null)

  const sessionTask = tasks.find(t => t.id === sessionTaskId) ?? null
  const practiceTask = tasks.find(t => t.id === practiceTaskId) ?? null

  function handleTaskClick(task: CalendarTask) {
    if (task.is_completed) {
      // Un-complete directly, no session required
      toggleTaskComplete(task.id, false)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: false } : t))
      return
    }

    const isPracticeTest = task.category === 'Full Practice Test'
    const isPlanTask = !!task.study_plan_id

    if (isPracticeTest && isPlanTask) {
      setPracticeTaskId(task.id)
    } else if (isPlanTask && !isPracticeTest) {
      setSessionTaskId(task.id)
    } else {
      // Manually-created task — complete directly
      toggleTaskComplete(task.id, true)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t))
    }
  }

  function handleSuccess(taskId: string) {
    setSessionTaskId(null)
    setPracticeTaskId(null)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: true } : t))
    router.refresh()
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-violet-500" />
            Upcoming Tasks
          </CardTitle>
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="pt-0 flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CalendarDays className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">No upcoming tasks</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Generate an AI study plan or add tasks manually
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map(task => {
                const colors = getCategoryColor(task.category)
                const filters = task.college_board_filters as CollegeBoardFilter | null
                const isPracticeTest = task.category === 'Full Practice Test'
                const isPlanTask = !!task.study_plan_id

                return (
                  <li
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={cn(
                      'rounded-lg border border-[var(--border)] border-l-4 p-3 space-y-2',
                      'cursor-pointer transition-colors select-none',
                      colors.leftBar,
                      task.is_completed
                        ? 'opacity-60 bg-slate-50 dark:bg-slate-800/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    )}
                  >
                    {/* Row: title + session icon */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* "Domain — Skill" as primary title when both are available */}
                        {(() => {
                          const hasBoth = filters?.domain && filters?.skill
                          const primaryTitle = hasBoth
                            ? `${filters!.domain} — ${filters!.skill}`
                            : task.title
                          // Strip domain prefix from task.title so subtitle is e.g. "Easy · 19q"
                          const subtitle = hasBoth
                            ? task.title.replace(`${filters!.domain} — `, '').trim()
                            : null
                          return (
                            <>
                              <p className={cn(
                                'text-sm font-semibold leading-tight',
                                task.is_completed && 'line-through text-[var(--muted-foreground)]',
                              )}>
                                {primaryTitle}
                              </p>
                              {subtitle && (
                                <p className={cn(
                                  'text-xs text-[var(--muted-foreground)] mt-0.5',
                                  task.is_completed && 'line-through',
                                )}>
                                  {subtitle}
                                </p>
                              )}
                            </>
                          )
                        })()}

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {formatDate(task.task_date)}
                          </span>
                          <Badge
                            variant={task.subject === 'math' ? 'math' : task.subject === 'reading_writing' ? 'reading' : 'default'}
                            className="text-[10px] py-0"
                          >
                            {subjectLabel(task.subject)}
                          </Badge>
                          {task.duration_minutes && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {task.duration_minutes}m
                            </span>
                          )}
                          {isPracticeTest && (
                            <Badge className="text-[10px] py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              Practice Test
                            </Badge>
                          )}
                          {task.is_completed && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>

                      {/* Session indicator for incomplete plan tasks */}
                      {!task.is_completed && isPlanTask && (
                        <span className="shrink-0 mt-0.5" title="Click to start practice session">
                          <ClipboardList className="h-4 w-4 text-violet-400" />
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Session Workflow Dialog */}
      {sessionTask && (
        <SessionWorkflowDialog
          open={!!sessionTaskId}
          onOpenChange={open => { if (!open) setSessionTaskId(null) }}
          task={sessionTask}
          onSuccess={() => handleSuccess(sessionTask.id)}
        />
      )}

      {/* Practice Test Score Dialog */}
      {practiceTask && (
        <PracticeTestScoreDialog
          open={!!practiceTaskId}
          onOpenChange={open => { if (!open) setPracticeTaskId(null) }}
          task={practiceTask}
          onSuccess={() => handleSuccess(practiceTask.id)}
        />
      )}
    </>
  )
}
