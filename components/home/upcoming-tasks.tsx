'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toggleTaskComplete } from '@/actions/calendar'
import type { CalendarTask } from '@/types'
import { formatDate, subjectLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UpcomingTasksProps {
  tasks: CalendarTask[]
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  async function handleToggle(id: string, current: boolean) {
    await toggleTaskComplete(id, !current)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          Upcoming Tasks
        </CardTitle>
        <Link href="/calendar">
          <Button variant="ghost" size="sm" className="text-xs gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
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
            {tasks.map(task => (
              <li
                key={task.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3 transition-colors',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  task.is_completed && 'opacity-60'
                )}
              >
                <button
                  className="mt-0.5 shrink-0"
                  onClick={() => handleToggle(task.id, task.is_completed)}
                  aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium leading-tight', task.is_completed && 'line-through text-[var(--muted-foreground)]')}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDate(task.task_date)}</span>
                    <Badge variant={task.subject === 'math' ? 'math' : task.subject === 'reading_writing' ? 'reading' : 'default'} className="text-[10px] py-0">
                      {subjectLabel(task.subject)}
                    </Badge>
                    {task.duration_minutes && (
                      <span className="text-xs text-[var(--muted-foreground)]">{task.duration_minutes}m</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
