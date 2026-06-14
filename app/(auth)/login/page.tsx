'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/actions/auth'
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
  const [pending,       setPending]       = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)
  const [notice,        setNotice]        = React.useState<string | null>(null)

  async function handleGoogleSignIn() {
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
    // On success the browser navigates away — no need to reset state.
  }

  // Surface the result of the email-confirmation flow (set by /auth/confirm).
  // One-shot read of browser-only URL flags on mount — intentionally sets state.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    /* eslint-disable react-hooks/set-state-in-effect -- one-time URL flag read on mount */
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
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      {/* Header */}
      <div>
        <h1 className="sp-display text-2xl">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your SaturnPath account</p>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={pending}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--surface-base)] px-3 text-[var(--text-muted)]">or</span>
        </div>
      </div>

      {/* Google sign-in */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={pending || googlePending}
        className="w-full h-11 text-sm font-semibold gap-2"
      >
        {googlePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </Button>

      <p className="text-sm text-center text-[var(--text-muted)]">
        Don&apos;t have an account?{' '}
        <Link href="/onboarding" className="font-semibold text-[var(--accent)] hover:underline">
          Create one free
        </Link>
      </p>

      <p className="text-center text-xs text-[var(--text-muted)]">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
      </p>
    </div>
  )
}
