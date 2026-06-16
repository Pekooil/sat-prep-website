'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { saveGoogleConsent } from '@/actions/auth'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear, validateAgeConsent } from '@/lib/legal/config'

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

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
  const [birthYear,     setBirthYear]     = React.useState('')
  const [agreedToTerms, setAgreedToTerms] = React.useState(false)
  const [parentalAck,   setParentalAck]   = React.useState(false)

  const needsParental = birthYear
    ? ageFromBirthYear(Number(birthYear)) < LEGAL.parentalConsentBelowAge
    : false

  async function handleContinue() {
    // Age gate + consent — mirrors the authoritative server-side check.
    const consentError = validateAgeConsent({
      birthYear: birthYear ? Number(birthYear) : null,
      agreedToTerms,
      parentalAck,
    })
    if (consentError) {
      setError(consentError)
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await saveGoogleConsent({
        birthYear: Number(birthYear),
        agreedToTerms,
        parentalAck,
      })
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
            Confirm your age and agree to our terms to finish setting up your account.
          </p>
        </div>

        {/* Age gate */}
        <div className="space-y-1.5">
          <label htmlFor="g-birth-year" className="text-sm font-medium text-[var(--text-heading)]">Birth year</label>
          <select
            id="g-birth-year"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-base)] px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <option value="" disabled>Select your birth year</option>
            {BIRTH_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Consent */}
        <div className="space-y-2">
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              disabled={pending}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
            </span>
          </label>

          {needsParental && (
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={parentalAck}
                onChange={e => setParentalAck(e.target.checked)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>I am under 18 and have my parent or guardian&apos;s permission to use {LEGAL.appName}.</span>
            </label>
          )}
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
          Wrong account?{' '}
          <Link href="/login" className="underline hover:text-[var(--text-heading)]">Sign in with a different account</Link>
        </p>
      </div>
    </div>
  )
}
