'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitBetaPassword } from '@/actions/beta'

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

export function BetaGateForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/login'
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/login'

  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('next', safePath)
      const result = await submitBetaPassword(fd)
      if (result?.error) {
        setError(result.error)
        setPending(false)
      }
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="next" value={safePath} />
      <div className="space-y-1.5">
        <Label htmlFor="beta-password">Beta access code</Label>
        <Input
          id="beta-password"
          name="password"
          type="password"
          placeholder="Enter your access code"
          autoComplete="off"
          autoFocus
          required
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'beta-error' : undefined}
        />
      </div>

      {error && (
        <div
          id="beta-error"
          role="alert"
          className="rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20"
        >
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  )
}
