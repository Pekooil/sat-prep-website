'use client'
import { ErrorBoundaryUI } from '@/components/ui/error-boundary'
export default function TutorialError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryUI error={error} reset={reset} page="Tutorial" />
}
