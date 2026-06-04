'use client'
import { ErrorBoundaryUI } from '@/components/ui/error-boundary'
export default function DataError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryUI error={error} reset={reset} page="Analytics" />
}
