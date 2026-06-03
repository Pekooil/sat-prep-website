'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarTask } from '@/types'

export function useCalendarTasksRange(startDate: string, endDate: string) {
  const [tasks, setTasks] = React.useState<CalendarTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  const load = React.useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('calendar_tasks')
      .select('*')
      .gte('task_date', startDate)
      .lte('task_date', endDate)
      .order('task_date')
    setTasks(data ?? [])
    setLoading(false)
  }, [startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

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
