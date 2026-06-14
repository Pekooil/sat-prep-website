'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { saveGoogleConsent } from '@/actions/auth'

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

export default function GoogleConsentPage() {
  const [pending, setPending] = React.useState(false)
  const [error,   setError]   = React.useState<string | null>(null)

  async function handleContinue() {
    setPending(true)
    setError(null)
    try {
      const result = await saveGoogleConsent()
      if (result?.error) {
        setError(result.error)
        setPending(false)
      }
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-base)] p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <SaturnPathLogo size="sm" />
        </div>

        <div className="text-center">
          <h1 className="sp-display text-2xl">One more step</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Click Continue to finish setting up your account.
          </p>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={pending}
          className="h-11 w-full text-sm font-semibold"
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? 'Saving…' : 'Continue'}
        </Button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          By continuing you confirm you are at least 13 years old and agree to our{' '}
          <Link href="/terms" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
        </p>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Wrong account?{' '}
          <Link href="/login" className="underline hover:text-[var(--text-heading)]">Sign in with a different account</Link>
        </p>
      </div>
    </div>
  )
}
