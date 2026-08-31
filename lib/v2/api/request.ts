import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { rateLimit } from '@/lib/security/rate-limit'
import { ApiError, type FieldErrors } from './errors'
import type { ApiRequestContext } from './response'

export type AuthenticatedRequestContext = ApiRequestContext & {
  user: User
  accessToken: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function requireBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization')?.trim()
  if (!authorization) throw ApiError.unauthorized()

  const match = /^Bearer\s+(\S+)$/i.exec(authorization)
  if (!match || match[1].length < 20 || match[1].length > 4096) {
    throw ApiError.unauthorized('A valid bearer token is required')
  }
  return match[1]
}

export async function authenticateRequest(
  request: Request,
  context: ApiRequestContext,
): Promise<AuthenticatedRequestContext> {
  const accessToken = requireBearerToken(request)
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) throw ApiError.unauthorized('Your session is invalid or expired')

  return { ...context, user: data.user, accessToken }
}

export function requireIdempotencyKey(request: Request): string {
  const value = request.headers.get('idempotency-key')?.trim()
  if (!value || value.length < 16 || value.length > 128 || /[^\x21-\x7e]/.test(value)) {
    throw ApiError.validation('A valid Idempotency-Key header is required', {
      'Idempotency-Key': ['Use 16–128 printable characters.'],
    })
  }
  return value
}

export function requireClientVersion(request: Request): string {
  const value = request.headers.get('x-client-version')?.trim()
  if (!value || value.length > 64 || /[^\x20-\x7e]/.test(value)) {
    throw ApiError.validation('A valid X-Client-Version header is required', {
      'X-Client-Version': ['Use 1–64 printable characters.'],
    })
  }
  return value
}

export function requireUuid(value: string, fieldName: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw ApiError.validation('The request contains an invalid identifier', {
      [fieldName]: ['Must be a UUID.'],
    })
  }
  return value
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > 1_000_000) {
    throw ApiError.validation('Request body is too large')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.validation('Request body must be valid JSON')
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.validation('Request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

export function requireAdmin(user: User) {
  const allowedEmails = new Set(
    (process.env.V2_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  const email = user.email?.toLowerCase()
  if (!email || !allowedEmails.has(email)) throw ApiError.forbidden('Admin access required')
}

export function enforceRateLimit(
  request: Request,
  key: string,
  limit: number,
  windowMs: number,
) {
  const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const result = rateLimit(`${key}:${source}`, limit, windowMs)
  if (!result.allowed) throw ApiError.rateLimited(result.retryAfterSec)
}

export function requireFields(
  body: Record<string, unknown>,
  requiredFields: string[],
): FieldErrors | undefined {
  const missing = requiredFields.filter((field) => body[field] === undefined)
  return missing.length ? Object.fromEntries(missing.map((field) => [field, ['This field is required.']])) : undefined
}

export function requireFeature(enabled: boolean, message?: string) {
  if (!enabled) throw ApiError.featureDisabled(message)
}

