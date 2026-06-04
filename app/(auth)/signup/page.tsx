'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/actions/auth'

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
    const result = await signUp(fd)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    } else if (result?.needsConfirmation) {
      setConfirmed(true)
      setPending(false)
    }
  }

  if (confirmed) {
    return (
      <Card className="shadow-xl border-0 bg-white dark:bg-slate-800">
        <CardContent className="p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            We sent a confirmation link to your email address. Click it to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl border-0 bg-white dark:bg-slate-800">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start your personalized SAT prep journey today</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Creating account…' : 'Create free account'}
          </Button>

          <p className="text-xs text-center text-[var(--muted-foreground)]">
            By signing up you agree to our{' '}
            <Link href="/info" className="underline hover:text-[var(--foreground)]">Terms & Privacy Policy</Link>
          </p>
        </form>
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-sm text-center w-full text-[var(--muted-foreground)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
