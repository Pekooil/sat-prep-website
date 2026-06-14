import type { Metadata } from 'next'
import { ClipboardList } from 'lucide-react'
import { ErrorLogClient } from '@/components/error-log/error-log-client'

export const metadata: Metadata = {
  title: 'Error Log',
  description: 'Track mistakes, categorise error types, analyse patterns, and monitor topic mastery progress.',
}

export default function ErrorLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <ClipboardList className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold">Error Log</h1>
        </div>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your mistakes, understand patterns, and monitor mastery progress.
        </p>
      </div>
      <ErrorLogClient />
    </div>
  )
}
