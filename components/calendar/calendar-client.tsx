'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCalendarTasks } from '@/hooks/use-calendar-tasks'
import { TaskFormDialog } from './task-form-dialog'
import { DayTasksPanel } from './day-tasks-panel'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function CalendarClient() {
  const today = new Date()
  const [year, setYear] = React.useState(today.getFullYear())
  const [month, setMonth] = React.useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = React.useState<string>(today.toISOString().split('T')[0])
  const [addOpen, setAddOpen] = React.useState(false)

  const { tasksByDate, reload } = useCalendarTasks(year, month)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {MONTHS[month - 1]} {year}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                  setYear(today.getFullYear())
                  setMonth(today.getMonth() + 1)
                  setSelectedDate(todayStr)
                }}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-[var(--muted-foreground)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
              {cells.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="bg-[var(--background)] h-16" />
                }
                const ds = dateStr(day)
                const dayTasks = tasksByDate[ds] ?? []
                const isToday = ds === todayStr
                const isSelected = ds === selectedDate
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={cn(
                      'relative h-16 p-1.5 text-left transition-colors text-sm',
                      'bg-[var(--card)] hover:bg-slate-50 dark:hover:bg-slate-800/70',
                      isSelected && 'ring-2 ring-inset ring-blue-500 bg-blue-50 dark:bg-blue-900/20',
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-blue-600 text-white',
                      !isToday && 'text-[var(--foreground)]',
                    )}>
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {dayTasks.slice(0, 3).map(t => (
                          <span
                            key={t.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              t.is_completed ? 'bg-emerald-400' :
                              t.subject === 'math' ? 'bg-blue-400' :
                              t.subject === 'reading_writing' ? 'bg-violet-400' : 'bg-indigo-400'
                            )}
                          />
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-[8px] text-[var(--muted-foreground)]">+{dayTasks.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Math</div>
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> Reading & Writing</div>
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Tasks Panel */}
      <div>
        <DayTasksPanel
          date={selectedDate}
          tasks={tasksByDate[selectedDate] ?? []}
          onReload={reload}
          onAddTask={() => setAddOpen(true)}
        />
      </div>

      <TaskFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultDate={selectedDate}
        onSuccess={reload}
      />
    </div>
  )
}
