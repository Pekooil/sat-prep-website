import { describe, expect, it } from 'vitest'
import { formatSignInError } from '@/lib/auth-errors'

describe('formatSignInError', () => {
  it('explains how to confirm an existing staging user', () => {
    expect(formatSignInError({ code: 'email_not_confirmed', message: 'Email not confirmed' }))
      .toContain('Authentication → Users')
  })

  it('gives a safe password recovery hint for invalid credentials', () => {
    expect(formatSignInError({ code: 'invalid_credentials', message: 'Invalid login credentials' }))
      .toContain('reset the password')
  })

  it('preserves unexpected Supabase errors', () => {
    expect(formatSignInError({ code: 'over_email_send_rate_limit', message: 'Try again later' }))
      .toBe('Try again later')
  })
})
