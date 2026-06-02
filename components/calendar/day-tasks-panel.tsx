'use client'

import { Plus, Trash2, CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toggleTaskComplete, deleteCalendarTask } from '@/actions/calendar'
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

export function DayTasksPanel({ date, tasks, onReload, onAddTask }: DayTasksPanelProps) {
  async function handleToggle(id: string, current: boolean) {
    await toggleTaskComplete(id, !current)
    onReload()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    await deleteCalendarTask(id)
    onReload()
  }

  return (
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
            const filters = task.college_board_filters as CollegeBoardFilter | null
            return (
              <div
                key={task.id}
                className={cn(
                  'rounded-lg border border-[var(--border)] p-3 space-y-2',
                  task.is_completed && 'opacity-60 bg-slate-50 dark:bg-slate-800/30'
                )}
              >
                <div className="flex items-start gap-2">
                  <button onClick={() => handleToggle(task.id, task.is_completed)} className="mt-0.5 shrink-0">
                    {task.is_completed
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <Circle className="h-4 w-4 text-[var(--muted-foreground)]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', task.is_completed && 'line-through text-[var(--muted-foreground)]')}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant={task.subject === 'math' ? 'math' : task.subject === 'reading_writing' ? 'reading' : 'default'} className="text-[10px] py-0">
                        {subjectLabel(task.subject)}
                      </Badge>
                      {task.duration_minutes && (
                        <span className="text-xs text-[var(--muted-foreground)]">{task.duration_minutes}m</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
