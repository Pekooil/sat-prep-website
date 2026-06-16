/**
 * Minimal in-memory fixed-window rate limiter (zero-dependency).
 *
 * ⚠️ Best-effort only: state lives in a single server instance's memory, so on
 * serverless / Fluid Compute it does not coordinate across instances. It
 * meaningfully slows naive single-source floods but is NOT a substitute for
 * Cloudflare Turnstile (the primary control on signup) or a shared store
 * (Upstash Redis). If you provision Upstash, swap this for `@upstash/ratelimit`.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  const b = buckets.get(key)

  if (!b || now >= b.resetAt) {
    // Opportunistic prune so the Map can't grow unbounded.
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k)
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (b.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }

  b.count++
  return { allowed: true, retryAfterSec: 0 }
}
