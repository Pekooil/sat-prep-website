export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'FEATURE_DISABLED'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED'

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fieldErrors?: FieldErrors
  readonly retryAfterSec?: number

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    options: { fieldErrors?: FieldErrors; retryAfterSec?: number } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = options.fieldErrors
    this.retryAfterSec = options.retryAfterSec
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError('FORBIDDEN', message, 403)
  }

  static notFound(message = 'The requested resource was not found') {
    return new ApiError('NOT_FOUND', message, 404)
  }

  static conflict(message = 'The request conflicts with the current state') {
    return new ApiError('CONFLICT', message, 409)
  }

  static validation(message = 'The request could not be validated', fieldErrors?: FieldErrors) {
    return new ApiError('VALIDATION_ERROR', message, 422, { fieldErrors })
  }

  static rateLimited(retryAfterSec: number) {
    return new ApiError('RATE_LIMITED', 'Too many requests. Try again shortly.', 429, {
      retryAfterSec,
    })
  }

  static featureDisabled(message = 'This SaturnPath feature is temporarily unavailable') {
    return new ApiError('FEATURE_DISABLED', message, 503)
  }

  static notImplemented(operation: string) {
    return new ApiError('NOT_IMPLEMENTED', `${operation} is not available yet`, 501)
  }

  static internal(message = 'An unexpected server error occurred') {
    return new ApiError('INTERNAL_ERROR', message, 500)
  }
}
