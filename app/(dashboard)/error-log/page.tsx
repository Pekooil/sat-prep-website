import type { Metadata } from 'next'
import { ErrorLogClient } from '@/components/error-log/error-log-client'

export const metadata: Metadata = {
  title: 'Error Log',
  description: 'Track mistakes, categorise error types, analyse patterns, and monitor topic mastery progress.',
}

export default function ErrorLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Error Log</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your mistakes, understand patterns, and monitor mastery progress.
        </p>
      </div>
      <ErrorLogClient />
    </div>
  )
}
