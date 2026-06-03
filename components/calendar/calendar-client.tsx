'use client'

import * as React from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List, AlignLeft,
  CheckCircle2, Circle,
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCalendarTasksRange } from '@/hooks/use-calendar-tasks-range'
import { TaskFormDialog } from './task-form-dialog'
import { TaskDrawer } from './task-drawer'
import { SessionWorkflowDialog } from './session-workflow-dialog'
import { PracticeTestScoreDialog } from './practice-test-score-dialog'
import { rescheduleCalendarTask, toggleTaskComplete } from '@/actions/calendar'
import { useToast } from '@/components/ui/use-toast'
import { getCategoryColor } from './task-colors'
import { cn, subjectLabel } from '@/lib/utils'
import type { CalendarTask } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = 'month' | 'week' | 'agenda'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function parseQuestionCount(title: string): number | null {
  const m = title.match(/·\s*(\d+)q/i)
  return m ? parseInt(m[1], 10) : null
}

function dateRangeForView(view: CalendarView, anchor: Date): { start: Date; end: Date } {
  if (view === 'month') {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
  }
  if (view === 'week') {
    return { start: startOfWeek(anchor, { weekStartsOn: 0 }), end: endOfWeek(anchor, { weekStartsOn: 0 }) }
  }
  // agenda: today → +90 days
  const today = new Date()
  return { start: today, end: addDays(today, 90) }
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { dot: 'bg-blue-500',   label: 'Algebra' },
  { dot: 'bg-violet-500', label: 'Advanced Math' },
  { dot: 'bg-orange-500', label: 'Problem-Solving' },
  { dot: 'bg-teal-500',   label: 'Geometry' },
  { dot: 'bg-green-500',  label: 'Information & Ideas' },
  { dot: 'bg-rose-500',   label: 'Craft & Structure' },
  { dot: 'bg-amber-500',  label: 'Expression' },
  { dot: 'bg-cyan-500',   label: 'Standard English' },
  { dot: 'bg-slate-500',  label: 'Practice Test' },
]

// ─── Compact task chip (month view) ──────────────────────────────────────────

function TaskChip({
  task,
  onOpen,
  onDragStart,
}: {
  task: CalendarTask
  onOpen: (t: CalendarTask) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
}) {
  const c = getCategoryColor(task.category)
  const qCount = parseQuestionCount(task.title)
  const label = task.category ?? task.title

  return (
    <button
      draggable={!task.is_completed}
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={(e) => { e.stopPropagation(); onOpen(task) }}
      title={task.title}
      className={cn(
        'w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded',
        'border-l-2 truncate transition-opacity',
        c.bg, c.leftBar, c.text,
        task.is_completed && 'opacity-50 line-through',
        !task.is_completed && 'hover:opacity-80 cursor-grab active:cursor-grabbing',
        task.is_completed && 'cursor-default',
      )}
    >
      <span className="font-medium truncate block">
        {label}
        {qCount ? ` · ${qCount}q` : ''}
      </span>
    </button>
  )
}

// ─── Full task card (week + agenda) ──────────────────────────────────────────

function TaskCard({
  task,
  onOpen,
  onDragStart,
  compact = false,
}: {
  task: CalendarTask
  onOpen: (t: CalendarTask) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
  compact?: boolean
}) {
  const c = getCategoryColor(task.category)
  const qCount = parseQuestionCount(task.title)
  const isPracticeTest = task.category === 'Full Practice Test'

  return (
    <button
      draggable={!task.is_completed}
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      className={cn(
        'w-full text-left rounded-lg border-l-4 p-2 transition-all',
        'hover:shadow-sm active:scale-[0.98]',
        c.bg, c.leftBar, c.border,
        'border border-l-4',
        task.is_completed && 'opacity-50',
        !task.is_completed && 'cursor-grab active:cursor-grabbing',
        task.is_completed && 'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-semibold leading-snug',
            c.text,
            task.is_completed && 'line-through',
          )}>
            {task.category ?? task.title}
          </p>
          {!compact && (
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate">
              {subjectLabel(task.subject)}
              {qCount ? ` · ${qCount}q` : ''}
              {task.duration_minutes ? ` · ${task.duration_minutes}m` : ''}
            </p>
          )}
          {compact && qCount && (
            <p className="text-[10px] text-[var(--muted-foreground)]">{qCount}q</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isPracticeTest && (
            <span className="text-[8px] font-semibold uppercase tracking-wide bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded">
              Test
            </span>
          )}
          {task.is_completed
            ? <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            : <Circle className="h-3 w-3 text-[var(--muted-foreground)] flex-shrink-0" />}
        </div>
      </div>
    </button>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  anchor,
  tasksByDate,
  dragOverDate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenTask,
}: {
  anchor: Date
  tasksByDate: Record<string, CalendarTask[]>
  dragOverDate: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, d: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, d: string) => void
  onOpenTask: (t: CalendarTask) => void
}) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = isoDate(new Date())

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-[var(--muted-foreground)] py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="bg-[var(--background)] min-h-[100px] sm:min-h-[110px]" />
          }
          const ds = dateStr(day)
          const dayTasks = tasksByDate[ds] ?? []
          const todayCell = ds === todayStr
          const isOver = dragOverDate === ds

          return (
            <div
              key={ds}
              className={cn(
                'bg-[var(--card)] min-h-[100px] sm:min-h-[110px] p-1.5 flex flex-col transition-colors',
                isOver && 'bg-blue-50 dark:bg-blue-900/20',
              )}
              onDragOver={(e) => onDragOver(e, ds)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, ds)}
            >
              {/* Day number */}
              <span className={cn(
                'self-start flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1',
                todayCell ? 'bg-blue-600 text-white' : 'text-[var(--foreground)]',
              )}>
                {day}
              </span>

              {/* Task chips */}
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map(t => (
                  <TaskChip key={t.id} task={t} onOpen={onOpenTask} onDragStart={onDragStart} />
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] text-[var(--muted-foreground)] pl-1">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <span className={cn('h-2 w-2 rounded-full', item.dot)} />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
          Completed
        </div>
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  anchor,
  tasksByDate,
  dragOverDate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenTask,
}: {
  anchor: Date
  tasksByDate: Record<string, CalendarTask[]>
  dragOverDate: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, d: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, d: string) => void
  onOpenTask: (t: CalendarTask) => void
}) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr = isoDate(new Date())

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="min-w-[600px] px-1">
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const ds = isoDate(day)
            const dayTasks = tasksByDate[ds] ?? []
            const todayCell = ds === todayStr
            const isOver = dragOverDate === ds

            return (
              <div
                key={ds}
                className={cn(
                  'flex flex-col rounded-xl border border-[var(--border)] transition-colors overflow-hidden',
                  isOver && 'ring-2 ring-blue-400 border-blue-400 bg-blue-50 dark:bg-blue-900/20',
                )}
                onDragOver={(e) => onDragOver(e, ds)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, ds)}
              >
                {/* Column header */}
                <div className={cn(
                  'px-2 py-1.5 text-center border-b border-[var(--border)]',
                  todayCell ? 'bg-blue-600' : 'bg-[var(--muted)]',
                )}>
                  <p className={cn(
                    'text-[10px] font-medium',
                    todayCell ? 'text-white' : 'text-[var(--muted-foreground)]',
                  )}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    'text-sm font-bold',
                    todayCell ? 'text-white' : 'text-[var(--foreground)]',
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-1 space-y-1 min-h-[120px]">
                  {dayTasks.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[9px] text-[var(--muted-foreground)]">—</span>
                    </div>
                  )}
                  {dayTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onOpen={onOpenTask}
                      onDragStart={onDragStart}
                      compact
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Agenda View ──────────────────────────────────────────────────────────────

function AgendaView({
  tasks,
  onOpenTask,
  onDragStart,
}: {
  tasks: CalendarTask[]
  onOpenTask: (t: CalendarTask) => void
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const todayStr = isoDate(new Date())

  // Group tasks by date
  const byDate = React.useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    for (const t of tasks) {
      if (!map[t.task_date]) map[t.task_date] = []
      map[t.task_date].push(t)
    }
    return map
  }, [tasks])

  const sortedDates = Object.keys(byDate).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--muted-foreground)]">
        <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No upcoming tasks</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(dateStr => {
        const dayTasks = byDate[dateStr]
        const isToday_ = dateStr === todayStr
        const date = parseISO(dateStr)

        return (
          <div key={dateStr}>
            {/* Date heading */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'text-sm font-semibold',
                isToday_ ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--foreground)]',
              )}>
                {isToday_ ? 'Today' : format(date, 'EEEE')}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {format(date, 'MMM d, yyyy')}
              </span>
              {isToday_ && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {dayTasks.map(task => {
                const c = getCategoryColor(task.category)
                const qCount = parseQuestionCount(task.title)
                const filters = task.college_board_filters as { domain?: string; skill?: string; difficulty?: string } | null

                return (
                  <button
                    key={task.id}
                    draggable={false}
                    onClick={() => onOpenTask(task)}
                    className={cn(
                      'w-full text-left rounded-xl border border-l-4 p-4 transition-all hover:shadow-sm',
                      c.bg, c.leftBar, c.border,
                      task.is_completed && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0', c.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-semibold text-[var(--foreground)]',
                              task.is_completed && 'line-through',
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge
                                variant={task.subject === 'math' ? 'math' : task.subject === 'reading_writing' ? 'reading' : 'default'}
                                className="text-[10px] py-0"
                              >
                                {subjectLabel(task.subject)}
                              </Badge>
                              {qCount && (
                                <span className="text-xs text-[var(--muted-foreground)]">{qCount} questions</span>
                              )}
                              {task.duration_minutes && (
                                <span className="text-xs text-[var(--muted-foreground)]">{task.duration_minutes} min</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {task.is_completed
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <Circle className="h-4 w-4 text-[var(--muted-foreground)]" />}
                          </div>
                        </div>

                        {/* Filter preview */}
                        {filters && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {filters.domain && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                {filters.domain}
                              </span>
                            )}
                            {filters.skill && (
                              <span className="text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded truncate max-w-[200px]">
                                {filters.skill}
                              </span>
                            )}
                            {filters.difficulty && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded capitalize',
                                filters.difficulty === 'easy'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : filters.difficulty === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                              )}>
                                {filters.difficulty}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main CalendarClient ──────────────────────────────────────────────────────

export function CalendarClient() {
  const today = new Date()
  const { toast } = useToast()

  // View & navigation
  const [view, setView] = React.useState<CalendarView>('month')
  const [anchor, setAnchor] = React.useState<Date>(today)

  // Dialogs / drawer
  const [drawerTask, setDrawerTask]                     = React.useState<CalendarTask | null>(null)
  const [drawerOpen, setDrawerOpen]                     = React.useState(false)
  const [sessionWorkflowTask, setSessionWorkflowTask]   = React.useState<CalendarTask | null>(null)
  const [practiceScoreTask, setPracticeScoreTask]       = React.useState<CalendarTask | null>(null)
  const [addOpen, setAddOpen]                           = React.useState(false)

  // Drag-and-drop
  const [dragOverDate, setDragOverDate] = React.useState<string | null>(null)
  const dragTaskRef = React.useRef<string | null>(null)

  // Date range for data fetch
  const { start, end } = dateRangeForView(view, anchor)
  const startStr = isoDate(start)
  const endStr = isoDate(end)

  const { tasks, tasksByDate, reload } = useCalendarTasksRange(startStr, endStr)

  // ── Navigation ──
  function navigate(dir: 1 | -1) {
    setAnchor(prev => {
      if (view === 'month') {
        const d = new Date(prev)
        d.setMonth(d.getMonth() + dir)
        return d
      }
      if (view === 'week') {
        return addDays(prev, dir * 7)
      }
      return addDays(prev, dir * 30)
    })
  }

  function goToday() {
    setAnchor(today)
  }

  function headerTitle(): string {
    if (view === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    if (view === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 })
      const we = endOfWeek(anchor, { weekStartsOn: 0 })
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
    }
    return 'Upcoming Tasks'
  }

  // ── Task interaction ──
  function openDrawer(task: CalendarTask) {
    setDrawerTask(task)
    setDrawerOpen(true)
  }

  function handleStartSession(task: CalendarTask) {
    if (task.category === 'Full Practice Test' && task.study_plan_id) {
      setPracticeScoreTask(task)
    } else if (task.study_plan_id) {
      setSessionWorkflowTask(task)
    } else {
      handleMarkComplete(task)
    }
  }

  async function handleMarkComplete(task: CalendarTask) {
    await toggleTaskComplete(task.id, true)
    reload()
    toast({ title: 'Task marked complete' })
  }

  // ── Drag-and-drop ──
  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragTaskRef.current = taskId
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateStr)
  }

  function handleDragLeave() {
    setDragOverDate(null)
  }

  async function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault()
    setDragOverDate(null)
    const taskId = e.dataTransfer.getData('taskId') || dragTaskRef.current
    if (!taskId) return

    // Find the task to check its current date
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.task_date === dateStr) return

    const result = await rescheduleCalendarTask(taskId, dateStr)
    if (result.error) {
      toast({ title: 'Reschedule failed', description: result.error, variant: 'destructive' })
    } else {
      reload()
      toast({ title: 'Task rescheduled', description: `Moved to ${format(parseISO(dateStr), 'MMM d')}` })
    }
    dragTaskRef.current = null
  }

  // ── Default date for task form ──
  const defaultDate = view === 'month' || view === 'week'
    ? isoDate(anchor)
    : isoDate(today)

  const sharedDndProps = { dragOverDate, onDragStart: handleDragStart, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop }

  return (
    <div>
      {/* ── Calendar Header ── */}
      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {/* Title + navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold min-w-[160px] text-center">
                {headerTitle()}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs ml-1" onClick={goToday}>
                Today
              </Button>
            </div>

            {/* View switcher + add */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                <ViewTab
                  active={view === 'month'}
                  onClick={() => setView('month')}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Month"
                />
                <ViewTab
                  active={view === 'week'}
                  onClick={() => setView('week')}
                  icon={<AlignLeft className="h-3.5 w-3.5" />}
                  label="Week"
                />
                <ViewTab
                  active={view === 'agenda'}
                  onClick={() => setView('agenda')}
                  icon={<List className="h-3.5 w-3.5" />}
                  label="Agenda"
                />
              </div>
              <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Task</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── View ── */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          {view === 'month' && (
            <MonthView
              anchor={anchor}
              tasksByDate={tasksByDate}
              onOpenTask={openDrawer}
              {...sharedDndProps}
            />
          )}
          {view === 'week' && (
            <WeekView
              anchor={anchor}
              tasksByDate={tasksByDate}
              onOpenTask={openDrawer}
              {...sharedDndProps}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              tasks={tasks}
              onOpenTask={openDrawer}
              onDragStart={handleDragStart}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Task Drawer ── */}
      <TaskDrawer
        task={drawerTask}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStartSession={handleStartSession}
        onMarkComplete={handleMarkComplete}
      />

      {/* ── Session Workflow Dialog ── */}
      {sessionWorkflowTask && (
        <SessionWorkflowDialog
          open={!!sessionWorkflowTask}
          onOpenChange={open => { if (!open) setSessionWorkflowTask(null) }}
          task={sessionWorkflowTask}
          onSuccess={() => { setSessionWorkflowTask(null); reload() }}
        />
      )}

      {/* ── Practice Test Score Dialog ── */}
      {practiceScoreTask && (
        <PracticeTestScoreDialog
          open={!!practiceScoreTask}
          onOpenChange={open => { if (!open) setPracticeScoreTask(null) }}
          task={practiceScoreTask}
          onSuccess={() => { setPracticeScoreTask(null); reload() }}
        />
      )}

      {/* ── Add Task Form ── */}
      <TaskFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultDate={defaultDate}
        onSuccess={reload}
      />
    </div>
  )
}

// ─── ViewTab ──────────────────────────────────────────────────────────────────

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
        'border-r border-[var(--border)] last:border-r-0',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
