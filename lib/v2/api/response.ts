import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ApiError } from './errors'

export type ApiRequestContext = {
  requestId: string
  operation: string
}

function requestIdFrom(request: Request): string {
  const supplied = request.headers.get('x-request-id')?.trim()
  if (supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)) return supplied
  return randomUUID()
}

function responseHeaders(requestId: string, retryAfterSec?: number): HeadersInit {
  return {
    'Cache-Control': 'private, no-store',
    'X-Request-Id': requestId,
    ...(retryAfterSec ? { 'Retry-After': String(retryAfterSec) } : {}),
  }
}

export function jsonResponse<T>(body: T, status = 200, requestId?: string) {
  return NextResponse.json(body, {
    status,
    headers: responseHeaders(requestId ?? randomUUID()),
  })
}

export function errorResponse(error: unknown, requestId: string) {
  const apiError = error instanceof ApiError
    ? error
    : new ApiError('INTERNAL_ERROR', 'An unexpected server error occurred', 500)

  if (!(error instanceof ApiError)) {
    console.error(JSON.stringify({
      event: 'v2_api_error',
      requestId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }

  return NextResponse.json(
    {
      code: apiError.code,
      message: apiError.message,
      requestId,
      ...(apiError.fieldErrors ? { fieldErrors: apiError.fieldErrors } : {}),
    },
    {
      status: apiError.status,
      headers: responseHeaders(requestId, apiError.retryAfterSec),
    },
  )
}

export async function runApiRoute(
  request: Request,
  operation: string,
  handler: (context: ApiRequestContext) => Promise<Response>,
) {
  const context = { requestId: requestIdFrom(request), operation }
  try {
    return await handler(context)
  } catch (error) {
    return errorResponse(error, context.requestId)
  }
}

export function notImplemented(context: ApiRequestContext) {
  return errorResponse(ApiError.notImplemented(context.operation), context.requestId)
}

