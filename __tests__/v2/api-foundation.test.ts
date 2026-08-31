import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/v2/api/errors'
import {
  requireBearerToken,
  requireClientVersion,
  requireIdempotencyKey,
  requireUuid,
} from '@/lib/v2/api/request'
import { errorResponse, runApiRoute } from '@/lib/v2/api/response'
import { getV2FeatureFlags } from '@/lib/v2/config/feature-flags'

function request(headers: Record<string, string> = {}) {
  return new Request('https://saturnpath.app/api/v2/test', { headers })
}

describe('V2 API request guards', () => {
  it('accepts a bearer token without logging or exposing its value', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.test.signature'
    expect(requireBearerToken(request({ authorization: `Bearer ${token}` }))).toBe(token)
  })

  it('rejects malformed bearer authorization', () => {
    expect(() => requireBearerToken(request({ authorization: 'Basic secret' }))).toThrow(ApiError)
  })

  it('enforces contract header lengths and printable values', () => {
    expect(requireIdempotencyKey(request({ 'idempotency-key': 'client-request-0001' }))).toBe('client-request-0001')
    expect(requireClientVersion(request({ 'x-client-version': 'web-0.1.0' }))).toBe('web-0.1.0')
    expect(() => requireIdempotencyKey(request({ 'idempotency-key': 'too-short' }))).toThrow(ApiError)
    expect(() => requireClientVersion(request())).toThrow(ApiError)
  })

  it('validates UUID path parameters before resource access', () => {
    expect(requireUuid('123e4567-e89b-12d3-a456-426614174000', 'sessionId')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    )
    expect(() => requireUuid('not-a-uuid', 'sessionId')).toThrow(ApiError)
  })
})

describe('V2 API responses', () => {
  it('normalizes expected errors and includes a safe request id', async () => {
    const response = errorResponse(ApiError.validation('Invalid request', { answer: ['Invalid value.'] }), 'req-123')
    expect(response.status).toBe(422)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      requestId: 'req-123',
      fieldErrors: { answer: ['Invalid value.'] },
    })
  })

  it('does not leak unknown error details', async () => {
    const response = errorResponse(new Error('service-role secret or answer key'), 'req-safe')
    const body = await response.json()
    expect(response.status).toBe(500)
    expect(body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred',
      requestId: 'req-safe',
    })
    expect(JSON.stringify(body)).not.toContain('service-role')
  })

  it('returns a safe placeholder through the route wrapper', async () => {
    const response = await runApiRoute(request(), 'exampleOperation', async (context) =>
      errorResponse(ApiError.notImplemented(context.operation), context.requestId),
    )
    expect(response.status).toBe(501)
    expect(await response.json()).toMatchObject({
      code: 'NOT_IMPLEMENTED',
      message: 'exampleOperation is not available yet',
    })
  })
})

describe('V2 feature flags', () => {
  it('defaults all rollout switches to disabled', () => {
    const names = [
      'V2_PRACTICE_ENABLED',
      'V2_SCRATCH_ANALYSIS_ENABLED',
      'V2_PUSH_NOTIFICATIONS_ENABLED',
    ] as const
    const original = Object.fromEntries(names.map((name) => [name, process.env[name]]))
    for (const name of names) delete process.env[name]

    expect(getV2FeatureFlags()).toEqual({
      practiceEnabled: false,
      scratchAnalysisEnabled: false,
      pushNotificationsEnabled: false,
    })

    for (const name of names) {
      if (original[name] === undefined) delete process.env[name]
      else process.env[name] = original[name]
    }
  })
})

