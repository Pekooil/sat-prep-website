import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'View and manage your daily SAT study tasks, drag-and-drop rescheduling, and session logging.',
}

export default function CalendarPage() {
  // Retired V1 compatibility URL. Never render the legacy calendar UI.
  redirect('/home')
}
