/**
 * Cloudflare Turnstile — server-side verification.
 *
 * Why this exists: the self-serve `signUp()` action creates accounts via the
 * service-role admin client (`generateLink`), which BYPASSES Supabase's own auth
 * rate-limiting and CAPTCHA. Without an app-layer check, that endpoint can be
 * scripted to flood the DB with users and email-bomb arbitrary addresses through
 * Resend. Verifying a Turnstile token here closes that path.
 *
 * Activation: enforcement is ON only when `TURNSTILE_SECRET_KEY` is set. When it
 * is unset (e.g. local dev), `verifyTurnstile()` returns ok so the flow is
 * unchanged. Set `TURNSTILE_SECRET_KEY` (server) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
 * (client) in production to turn protection on. Free keys: Cloudflare dashboard →
 * Turnstile → Add site.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** True when a secret is configured (i.e. verification is enforced). */
export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  // Disabled when no secret is configured (local dev / not yet provisioned).
  if (!secret) return { ok: true }

  if (!token) {
    return { ok: false, error: 'Please complete the captcha to continue.' }
  }

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success: boolean }
    if (!data.success) {
      return { ok: false, error: 'Captcha verification failed. Please try again.' }
    }
    return { ok: true }
  } catch {
    // Fail CLOSED — this is a security control. Cloudflare siteverify is highly
    // available; a transient failure rejecting a signup is the safer default.
    return { ok: false, error: 'Could not verify the captcha. Please try again.' }
  }
}
