/**
 * Absolute origin used to build email-confirmation and OAuth redirect links.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_APP_URL  — the stable, allow-listed production URL
 *   2. VERCEL_URL           — the per-deployment URL (auto-injected on Vercel)
 *   3. http://localhost:3000 — local development
 *
 * IMPORTANT: this uses a truthy/`.trim()` check rather than `??`. A Vercel env
 * var can be present but empty (""), and `"" ?? fallback` evaluates to "" — that
 * is what produced a relative `"/auth/confirm"` redirect (no origin) and broke
 * the signup confirmation link in production. Treat empty strings as unset.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}
