'use client'

import * as React from 'react'
import { UserPlus, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upgradeGuestAccount } from '@/actions/auth'

export function GuestUpgradeBanner() {
  const [open, setOpen]         = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [pending, setPending]   = React.useState(false)
  const [error, setError]       = React.useState<string | null>(null)
  const [done, setDone]         = React.useState(false)

  if (dismissed) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('password') !== fd.get('confirm_password')) {
      setError('Passwords do not match')
      return
    }
    setPending(true)
    setError(null)
    const result = await upgradeGuestAccount(fd)
    setPending(false)
    if (result?.error) { setError(result.error); return }
    setDone(true)
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
      {!open ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <UserPlus className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <p className="text-sm text-violet-800 dark:text-violet-200">
              <span className="font-semibold">You're browsing as a guest.</span>
              {' '}Your plan and progress won't be saved across devices.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
              onClick={() => setOpen(true)}
            >
              Save my progress
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 p-0.5"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : done ? (
        <div className="flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Check your email to confirm your address, then your account will be fully saved.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Create your account to save progress</p>
            <button onClick={() => setOpen(false)} className="text-violet-400 hover:text-violet-600 p-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="gu-name" className="text-xs">Full Name</Label>
              <Input id="gu-name" name="full_name" placeholder="Alex Johnson" required disabled={pending} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gu-email" className="text-xs">Email</Label>
              <Input id="gu-email" name="email" type="email" placeholder="you@example.com" required disabled={pending} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gu-pw" className="text-xs">Password</Label>
              <Input id="gu-pw" name="password" type="password" placeholder="Min 8 characters" required minLength={8} disabled={pending} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gu-cpw" className="text-xs">Confirm</Label>
              <Input id="gu-cpw" name="confirm_password" type="password" placeholder="Repeat password" required disabled={pending} className="h-8 text-xs" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700" disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            {pending ? 'Saving…' : 'Create Account'}
          </Button>
        </form>
      )}
    </div>
  )
}
