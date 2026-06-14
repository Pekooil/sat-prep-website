'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { signUp } from '@/actions/auth'
import { guestPreview } from '@/actions/onboarding'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear } from '@/lib/legal/config'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

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

export default function SignupPage() {
  const [pending,       setPending]       = React.useState(false)
  const [guestPending,  setGuestPending]  = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)
  const [confirmed,     setConfirmed]     = React.useState(false)
  const [birthYear,     setBirthYear]     = React.useState('')
  const [agree,         setAgree]         = React.useState(false)
  const [parental,      setParental]      = React.useState(false)

  async function handleGoogleSignUp() {
    setGooglePending(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGooglePending(false)
    }
  }

  const age = birthYear ? ageFromBirthYear(Number(birthYear)) : null
  const needsParental = age !== null && age < LEGAL.parentalConsentBelowAge
  const isUnderMin = age !== null && age < LEGAL.minAge

  async function handleGuest() {
    setGuestPending(true)
    setError(null)
    try {
      const result = await guestPreview()
      if (result?.error) {
        setError(result.error)
        setGuestPending(false)
        return
      }
      // Hard navigation so the new anonymous session cookie is applied before
      // the dashboard (and its proxy session check) loads.
      window.location.assign('/home')
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Could not start the guest preview.')
      setGuestPending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('password') !== fd.get('confirm_password')) {
      setError('Passwords do not match')
      return
    }
    // ── Age gate + consent (client-side mirror of the server check) ──────────
    if (!birthYear) {
      setError('Please select your birth year.')
      return
    }
    if (isUnderMin) {
      setError(`You must be at least ${LEGAL.minAge} years old to create an account.`)
      return
    }
    if (!agree) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    if (needsParental && !parental) {
      setError('Because you are under 18, please confirm you have a parent or guardian’s permission.')
      return
    }
    fd.set('birth_year', birthYear)
    fd.set('agree_terms', agree ? 'true' : '')
    fd.set('parental_ack', parental ? 'true' : '')

    setPending(true)
    setError(null)
    try {
      const result = await signUp(fd)
      if (result?.error) {
        setError(result.error)
        setPending(false)
      } else if (result?.needsConfirmation) {
        setConfirmed(true)
        setPending(false)
      }
    } catch (err) {
      // A successful sign-up (confirmation disabled) throws NEXT_REDIRECT.
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPending(false)
    }
  }

  if (confirmed) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="sp-display text-xl">Check your email</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          We sent a confirmation link to your email address. Click it to activate your account, then sign in.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="sp-display text-2xl">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Start your personalized SAT prep journey today</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Alex Johnson"
            required
            autoComplete="name"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            placeholder="Repeat password"
            required
            autoComplete="new-password"
            disabled={pending}
          />
        </div>

        {/* Age gate */}
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

        {/* Consent */}
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
              I am under 18 and have my parent or guardian’s permission to use {LEGAL.appName}.
            </Label>
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending || guestPending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? 'Creating account…' : 'Create free account'}
        </Button>
      </form>

      {/* Google sign-up + Guest preview */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--surface-base)] px-3 text-[var(--text-muted)]">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignUp}
        disabled={pending || guestPending || googlePending}
        className="h-11 w-full text-sm font-semibold gap-2"
      >
        {googlePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--surface-base)] px-3 text-[var(--text-muted)]">or</span>
        </div>
      </div>

      <div className="space-y-1.5 text-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleGuest}
          disabled={pending || guestPending || googlePending}
          className="h-11 w-full text-sm font-semibold"
        >
          {guestPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {guestPending ? 'Starting preview…' : 'Preview the dashboard as a guest'}
        </Button>
        <p className="text-xs text-[var(--text-muted)]">No account needed — nothing is saved.</p>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
