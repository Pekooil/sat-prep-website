import { authenticateRequest, enforceRateLimit, readJsonObject, requireAdmin, requireClientVersion, requireIdempotencyKey, type AuthenticatedRequestContext } from './request'
import { notImplemented, runApiRoute, type ApiRequestContext } from './response'

type RouteOptions = {
  mutation?: boolean
  clientVersion?: boolean
  rateLimit?: { limit: number; windowMs: number }
  before?: (context: ApiRequestContext) => Promise<unknown> | unknown
  handler?: (context: AuthenticatedRequestContext, body?: Record<string, unknown>) => Promise<Response>
}

export function studentApiRoute(request: Request, operation: string, options: RouteOptions = {}) {
  return runApiRoute(request, operation, async (context) => {
    const auth = await authenticateRequest(request, context)
    if (options.mutation) requireIdempotencyKey(request)
    if (options.clientVersion) requireClientVersion(request)
    const body = options.mutation ? await readJsonObject(request) : undefined
    if (options.rateLimit) {
      enforceRateLimit(request, `v2:${operation}:${auth.user.id}`, options.rateLimit.limit, options.rateLimit.windowMs)
    }
    await options.before?.(context)
    if (options.handler) return options.handler(auth, body)
    return notImplemented(context)
  })
}

export function adminApiRoute(request: Request, operation: string, options: RouteOptions = {}) {
  return runApiRoute(request, operation, async (context) => {
    const auth = await authenticateRequest(request, context)
    requireAdmin(auth.user)
    if (options.mutation) requireIdempotencyKey(request)
    if (options.clientVersion) requireClientVersion(request)
    const body = options.mutation ? await readJsonObject(request) : undefined
    if (options.rateLimit) {
      enforceRateLimit(request, `v2:${operation}:${auth.user.id}`, options.rateLimit.limit, options.rateLimit.windowMs)
    }
    await options.before?.(context)
    if (options.handler) return options.handler(auth, body)
    return notImplemented(context)
  })
}
