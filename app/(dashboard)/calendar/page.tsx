import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'View and manage your daily SAT study tasks, drag-and-drop rescheduling, and session logging.',
}

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold">Study Calendar</h1>
        </div>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your daily study tasks and College Board practice sessions.
        </p>
      </div>
      <CalendarClient />
    </div>
  )
}
