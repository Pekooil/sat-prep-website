'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { saveGoogleConsent } from '@/actions/auth'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear } from '@/lib/legal/config'

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from(
  { length: CURRENT_YEAR - MIN_BIRTH_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
)

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
  const [pending,   setPending]   = React.useState(false)
  const [error,     setError]     = React.useState<string | null>(null)
  const [birthYear, setBirthYear] = React.useState('')
  const [agree,     setAgree]     = React.useState(false)
  const [parental,  setParental]  = React.useState(false)

  const age           = birthYear ? ageFromBirthYear(Number(birthYear)) : null
  const needsParental = age !== null && age < LEGAL.parentalConsentBelowAge
  const isUnderMin    = age !== null && age < LEGAL.minAge

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!birthYear) { setError('Please select your birth year.'); return }
    if (isUnderMin) { setError(`You must be at least ${LEGAL.minAge} years old to create an account.`); return }
    if (!agree)     { setError('Please agree to the Terms of Service and Privacy Policy to continue.'); return }
    if (needsParental && !parental) {
      setError("Because you are under 18, please confirm you have a parent or guardian’s permission.")
      return
    }

    const fd = new FormData()
    fd.set('birth_year',  birthYear)
    fd.set('agree_terms', 'true')
    fd.set('parental_ack', parental ? 'true' : '')

    setPending(true)
    setError(null)
    try {
      const result = await saveGoogleConsent(fd)
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
            To finish setting up your account, we need a couple of details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="birth_year">Birth year</Label>
            <select
              id="birth_year"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              disabled={pending}
              className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select your birth year</option>
              {BIRTH_YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {isUnderMin && (
              <p className="text-xs text-red-700 dark:text-red-300">
                You must be at least {LEGAL.minAge} years old to create an account.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="agree_terms"
              checked={agree}
              onCheckedChange={v => setAgree(v === true)}
              disabled={pending}
              className="mt-0.5"
            />
            <Label htmlFor="agree_terms" className="text-xs font-normal leading-relaxed text-[var(--text-muted)]">
              I agree to the{' '}
              <Link href="/terms" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
            </Label>
          </div>

          {needsParental && !isUnderMin && (
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="parental_ack"
                checked={parental}
                onCheckedChange={v => setParental(v === true)}
                disabled={pending}
                className="mt-0.5"
              />
              <Label htmlFor="parental_ack" className="text-xs font-normal leading-relaxed text-[var(--text-muted)]">
                I am under 18 and have my parent or guardian&apos;s permission to use {LEGAL.appName}.
              </Label>
            </div>
          )}

          {error && (
            <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-sm font-semibold"
            disabled={pending || isUnderMin}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Saving…' : 'Continue'}
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Wrong account?{' '}
          <Link href="/login" className="underline hover:text-[var(--text-heading)]">Sign in with a different account</Link>
        </p>
      </div>
    </div>
  )
}
