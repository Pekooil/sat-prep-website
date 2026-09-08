'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { track } from '@vercel/analytics/react'
import { signUp } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear, validateAgeConsent } from '@/lib/legal/config'
import { TurnstileWidget } from '@/components/security/turnstile-widget'
import { safeAuthPath } from '@/lib/auth/redirect-path'
import styles from '../auth.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)
const CAPTCHA_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

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
  const [nextPath,      setNextPath]      = React.useState('/home')
  const [pending,       setPending]       = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)
  const [confirmed,     setConfirmed]     = React.useState(false)
  const [birthYear,     setBirthYear]     = React.useState('')
  const [agreedToTerms, setAgreedToTerms] = React.useState(false)
  const [parentalAck,   setParentalAck]   = React.useState(false)
  const [captchaToken,  setCaptchaToken]  = React.useState('')
  const emailStarted = React.useRef(false)

  const needsParental = birthYear
    ? ageFromBirthYear(Number(birthYear)) < LEGAL.parentalConsentBelowAge
    : false

  React.useEffect(() => {
    // Keep V1 as the default while preserving an explicitly requested V2 path.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time URL read on mount
    setNextPath(safeAuthPath(new URLSearchParams(window.location.search).get('next')))
  }, [])

  async function handleGoogleSignUp() {
    setGooglePending(true)
    setError(null)
    track('Signup Method Selected', { method: 'google' })
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    })
    if (oauthError) {
      setError(oauthError.message)
      track('Signup Error', { method: 'google', stage: 'oauth_start' })
      setGooglePending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    track('Signup Method Selected', { method: 'email' })
    const fd = new FormData(e.currentTarget)
    if (fd.get('password') !== fd.get('confirm_password')) {
      setError('Passwords do not match')
      track('Signup Error', { method: 'email', stage: 'client_validation' })
      return
    }
    // Age gate + consent — mirrors the authoritative server-side check for
    // instant feedback; signUp() re-validates before the account is created.
    const consentError = validateAgeConsent({
      birthYear: birthYear ? Number(birthYear) : null,
      agreedToTerms,
      parentalAck,
    })
    if (consentError) {
      setError(consentError)
      track('Signup Error', { method: 'email', stage: 'consent_validation' })
      return
    }
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError('Please complete the captcha to continue.')
      track('Signup Error', { method: 'email', stage: 'captcha_validation' })
      return
    }
    fd.set('birth_year', birthYear)
    fd.set('agreed_to_terms', agreedToTerms ? 'on' : '')
    fd.set('parental_ack', parentalAck ? 'on' : '')
    fd.set('cf_turnstile_token', captchaToken)
    fd.set('next', nextPath)
    setPending(true)
    setError(null)
    try {
      const result = await signUp(fd)
      if (result?.error) {
        setError(result.error)
        track('Signup Error', { method: 'email', stage: 'account_creation' })
        setPending(false)
      } else if (result?.needsConfirmation) {
        track('Signup Account Created', { method: 'email', confirmation_required: true })
        setConfirmed(true)
        setPending(false)
      }
    } catch (err) {
      // A successful sign-up (confirmation disabled) throws NEXT_REDIRECT.
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      track('Signup Error', { method: 'email', stage: 'unexpected' })
      setPending(false)
    }
  }

  if (confirmed) {
    return (
      <div className={styles.confirmation}>
        <span className={styles.confirmationIcon}><CheckCircle2 strokeWidth={1.75} /></span>
        <h2>Check your email</h2>
        <p>
          We sent a confirmation link to your email address. Click it to activate your account, then sign in.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className={styles.inlineLink}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className={`${styles.page} ${styles.signupPage}`}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" />
        Back to home
      </Link>

      <div className={styles.header}>
        <span className={styles.eyebrow}><Sparkles /> Start free</span>
        <h1 className={styles.title}>Build your path.</h1>
        <p className={styles.subtitle}>Create one account for your adaptive plan, focused practice, automatic review, and progress evidence.</p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={pending || googlePending}
        className={`${styles.button} ${styles.secondaryButton}`}
      >
        {googlePending ? <Loader2 className={styles.spin} aria-hidden="true" /> : <GoogleIcon />}
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className={styles.divider}><span>or sign up with email</span></div>

      <form
        onSubmit={handleSubmit}
        className={styles.form}
        onFocusCapture={() => {
          if (emailStarted.current) return
          emailStarted.current = true
          track('Signup Form Started', { method: 'email' })
        }}
      >
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="full_name">Full name</label>
          <input
            className={styles.input}
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Alex Johnson"
            required
            autoComplete="name"
            disabled={pending}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">Email</label>
          <input
            className={styles.input}
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={pending}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </div>

        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="password">Password</label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              placeholder="8+ characters"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={pending}
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="confirm_password">Confirm password</label>
            <input
              className={styles.input}
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Repeat password"
              required
              autoComplete="new-password"
              disabled={pending}
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="birth_year">Birth year</label>
          <select
            className={styles.select}
            id="birth_year"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            disabled={pending}
            required
            aria-describedby={error ? 'signup-error' : undefined}
          >
            <option value="" disabled>Select your birth year</option>
            {BIRTH_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className={styles.checkboxStack}>
          <label className={styles.checkboxLabel}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              disabled={pending}
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className={styles.inlineLink}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className={styles.inlineLink}>Privacy Policy</Link>.
            </span>
          </label>

          {needsParental && (
            <label className={styles.checkboxLabel}>
              <input
                className={styles.checkbox}
                type="checkbox"
                checked={parentalAck}
                onChange={e => setParentalAck(e.target.checked)}
                disabled={pending}
              />
              <span>I am under 18 and have my parent or guardian&apos;s permission to use {LEGAL.appName}.</span>
            </label>
          )}
        </div>

        <TurnstileWidget onVerify={setCaptchaToken} />

        {error && (
          <p className={styles.error} id="signup-error" role="alert">{error}</p>
        )}

        <button className={`${styles.button} ${styles.primaryButton}`} type="submit" disabled={pending}>
          {pending && <Loader2 className={styles.spin} aria-hidden="true" />}
          {pending ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <p className={styles.switchText}>
        Already have an account?{' '}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className={styles.inlineLink}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
