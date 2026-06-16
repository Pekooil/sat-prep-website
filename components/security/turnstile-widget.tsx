'use client'

import * as React from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'auto' | 'light' | 'dark'
        },
      ) => string
      reset: (id?: string) => void
    }
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    if (window.turnstile) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('turnstile script failed')))
      return
    }
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile script failed'))
    document.head.appendChild(s)
  })
}

/**
 * Renders the Cloudflare Turnstile widget and reports its token via `onVerify`.
 * Renders nothing when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, so signup works
 * unchanged in environments where Turnstile isn't provisioned (e.g. local dev).
 *
 * Pass a STABLE `onVerify` (e.g. a `useState` setter) — it's an effect dep.
 */
export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const widgetId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile || widgetId.current) return
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          theme: 'auto',
          callback: (token: string) => onVerify(token),
          'expired-callback': () => onVerify(''),
          'error-callback': () => onVerify(''),
        })
      })
      .catch(() => {
        /* script blocked/offline — token stays empty, server rejects (fail closed) */
      })
    return () => {
      cancelled = true
    }
  }, [onVerify])

  if (!SITE_KEY) return null
  return <div ref={ref} className="flex justify-center" />
}
