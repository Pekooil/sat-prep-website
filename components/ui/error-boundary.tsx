'use client'

import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryUIProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Page-specific label shown in the heading, e.g. "Home" */
  page?: string
}

export function ErrorBoundaryUI({ error, reset, page }: ErrorBoundaryUIProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center px-4"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-semibold">
          {page ? `${page} failed to load` : 'Something went wrong'}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-[11px] text-[var(--muted-foreground)] font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/home" className="gap-2 flex items-center">
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
}
