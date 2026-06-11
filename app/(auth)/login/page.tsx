'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/actions/auth'

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
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  // Surface the result of the email-confirmation flow (set by /auth/confirm).
  // One-shot read of browser-only URL flags on mount — intentionally sets state.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    /* eslint-disable react-hooks/set-state-in-effect -- one-time URL flag read on mount */
    if (params.get('confirmed') === '1') {
      setNotice('Your email is confirmed. Sign in to continue.')
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
          <span className="bg-[var(--surface-base)] px-3 text-[var(--text-muted)]">New here?</span>
        </div>
      </div>

      <p className="text-sm text-center text-[var(--text-muted)]">
        Don&apos;t have an account?{' '}
        <Link href="/onboarding" className="font-semibold text-[var(--accent)] hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  )
}
