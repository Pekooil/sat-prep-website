/**
 * The canonical production origin. Email-confirmation and OAuth links must
 * always resolve here so users never land on a per-deployment *.vercel.app URL
 * (e.g. sat-prep-website-gold.vercel.app).
 */
export const CANONICAL_APP_URL = 'https://saturnpath.app'

/**
 * Absolute origin used to build email-confirmation and OAuth redirect links.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_APP_URL   — explicit override (the stable production URL)
 *   2. CANONICAL_APP_URL     — whenever running on Vercel *production*, so we
 *                              never emit the per-deployment *.vercel.app host
 *   3. VERCEL_URL            — per-deployment URL (preview deploys only)
 *   4. http://localhost:3000 — local development
 *
 * IMPORTANT: this uses a truthy/`.trim()` check rather than `??`. A Vercel env
 * var can be present but empty (""), and `"" ?? fallback` evaluates to "" — that
 * is what produced a relative `"/auth/confirm"` redirect (no origin) and broke
 * the signup confirmation link in production. Treat empty strings as unset.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  // Production must never use the volatile *.vercel.app deployment URL.
  if (process.env.VERCEL_ENV === 'production') return CANONICAL_APP_URL

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}
