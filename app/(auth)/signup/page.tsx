'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/actions/auth'

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
  const [pending,   setPending]   = React.useState(false)
  const [error,     setError]     = React.useState<string | null>(null)
  const [confirmed, setConfirmed] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('password') !== fd.get('confirm_password')) {
      setError('Passwords do not match')
      return
    }
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

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? 'Creating account…' : 'Create free account'}
        </Button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>
        </p>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
