'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarTask } from '@/types'

export function useCalendarTasks(year: number, month: number) {
  const [tasks, setTasks] = React.useState<CalendarTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  const load = React.useCallback(async () => {
    setLoading(true)
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('calendar_tasks')
      .select('*')
      .gte('task_date', startDate)
      .lte('task_date', endDate)
      .order('task_date')

    setTasks(data ?? [])
    setLoading(false)
  }, [year, month])

  React.useEffect(() => { load() }, [load])

  const tasksByDate = React.useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    for (const task of tasks) {
      if (!map[task.task_date]) map[task.task_date] = []
      map[task.task_date].push(task)
    }
    return map
  }, [tasks])

  return { tasks, tasksByDate, loading, reload: load }
}
