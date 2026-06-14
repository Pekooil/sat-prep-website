'use client'

import * as React from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const STORAGE_KEY = 'sp-cookie-notice'

/**
 * Non-blocking cookie / analytics notice.
 *
 * The app uses cookieless, privacy-preserving analytics (Vercel Analytics +
 * Speed Insights) and is US-only, so a blocking consent gate is not required.
 * This is a one-time informational notice with a link to the Privacy Policy;
 * dismissal is remembered in localStorage. Analytics are unaffected either way.
 */
export function CookieNotice() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount read
        setVisible(true)
      }
    } catch {
      /* localStorage unavailable (private mode) — just don't show the notice */
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
          We use privacy-friendly, cookieless analytics to understand how SaturnPath is used — no
          advertising or cross-site tracking. See our{' '}
          <Link href="/privacy" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss cookie notice"
          className="-m-1 shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
