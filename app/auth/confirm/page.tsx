'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/**
 * Email confirmation landing page.
 *
 * Supabase verifies the email at its own `/auth/v1/verify` endpoint BEFORE
 * redirecting the user here, so by the time this page loads the account is
 * already confirmed. We deliberately do NOT keep the user signed in or forward
 * them into the dashboard — instead we clear any transient session the
 * redirect may have established and send them to the login landing page so they
 * can sign in cleanly. (Forwarding to /home would bounce a brand-new,
 * not-yet-onboarded user straight into the onboarding wizard.)
 */
export default function ConfirmPage() {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Supabase reports a failed/expired link via either the query string or the
    // URL hash fragment depending on the auth flow — check both.
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorDescription =
      search.get('error_description') ??
      hash.get('error_description') ??
      search.get('error') ??
      hash.get('error')

    if (errorDescription) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time URL flag read on mount
      setErrorMessage(errorDescription.replace(/\+/g, ' '))
      return
    }

    // Clear any session picked up from the confirmation redirect, then land on
    // the login page with a success flag.
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Non-fatal — proceed to login regardless.
      }
      if (!cancelled) {
        // Hard navigation so the proxy re-evaluates with cleared cookies.
        window.location.replace('/login?confirmed=1')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (errorMessage) {
    return (
      <main id="main-content" data-product-version="v2" className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-6 dark:bg-[#101012]">
        <div className="max-w-sm space-y-3 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          <Link href="/login" className="text-sm font-medium text-violet-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" data-product-version="v2" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f7f8] dark:bg-[#101012]">
      <Loader2 className="h-6 w-6 animate-spin text-violet-600 motion-reduce:animate-none" />
      <p className="text-sm text-[var(--text-muted)]">Confirming your email…</p>
    </main>
  )
}
