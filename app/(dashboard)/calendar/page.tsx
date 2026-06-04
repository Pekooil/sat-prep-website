import type { Metadata } from 'next'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'View and manage your daily SAT study tasks, drag-and-drop rescheduling, and session logging.',
}

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Study Calendar</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your daily study tasks and College Board practice sessions.
        </p>
      </div>
      <CalendarClient />
    </div>
  )
}
