'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { signIn } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { safeAuthPath } from '@/lib/auth/redirect-path'
import styles from '../auth.module.css'

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

export default function LoginPage() {
  const [nextPath,      setNextPath]      = React.useState('/home')
  const [pending,       setPending]       = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)
  const [notice,        setNotice]        = React.useState<string | null>(null)

  async function handleGoogleSignIn() {
    setGooglePending(true)
    setError(null)
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGooglePending(false)
    }
    // On success the browser navigates away — no need to reset state.
  }

  // Surface the result of the email-confirmation flow (set by /auth/confirm).
  // One-shot read of browser-only URL flags on mount — intentionally sets state.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    /* eslint-disable react-hooks/set-state-in-effect -- one-time URL flag read on mount */
    setNextPath(safeAuthPath(params.get('next')))
    if (params.get('confirmed') === '1') {
      setNotice('Your email is confirmed. Sign in to continue.')
    } else if (params.get('deleted') === '1') {
      setNotice('Your account and all associated data have been deleted.')
    } else if (params.get('error')) {
      setError(params.get('error')!.replace(/\+/g, ' '))
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const result = await signIn(new FormData(e.currentTarget))
      if (result?.error) {
        setError(result.error)
        setPending(false)
      }
    } catch (err) {
      // A successful sign-in throws NEXT_REDIRECT — let the framework navigate.
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link
        href="/"
        className={styles.backLink}
      >
        <ArrowLeft aria-hidden="true" />
        Back to home
      </Link>

      <div className={styles.header}>
        <span className={styles.eyebrow}><Sparkles /> Your path continues</span>
        <h1 className={styles.title}>Welcome back.</h1>
        <p className={styles.subtitle}>Sign in to pick up your next adaptive session, review queue, and score trajectory.</p>
      </div>

      {notice && (
        <p className={styles.notice} role="status">{notice}</p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <input type="hidden" name="next" value={nextPath} />
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
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="password">Password</label>
          <input
            className={styles.input}
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={pending}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

      {error && (
          <p className={styles.error} id="login-error" role="alert">{error}</p>
        )}

        <button className={`${styles.button} ${styles.primaryButton}`} type="submit" disabled={pending}>
          {pending && <Loader2 className={styles.spin} aria-hidden="true" />}
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className={styles.divider}><span>or continue with</span></div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={pending || googlePending}
        className={`${styles.button} ${styles.secondaryButton}`}
      >
        {googlePending ? <Loader2 className={styles.spin} aria-hidden="true" /> : <GoogleIcon />}
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <p className={styles.switchText}>
        Don&apos;t have an account?{' '}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className={styles.inlineLink}>
          Create one free
        </Link>
      </p>

      <p className={styles.finePrint}>
        By continuing you confirm you are at least 13 years old and agree to our{' '}
        <Link href="/terms" className={styles.inlineLink}>Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className={styles.inlineLink}>Privacy Policy</Link>.
      </p>
    </div>
  )
}
