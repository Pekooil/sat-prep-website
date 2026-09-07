import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { v2Fetch } from '@/components/v2-product/v2-api'

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

describe('V2 browser requests', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stops waiting and gives the user a retryable error when the API stalls', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_path, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))

    const request = v2Fetch('/api/v2/sessions', { timeoutMs: 25 })
    const expectation = expect(request).rejects.toThrow(
      'SaturnPath is taking longer than expected. Please try again.',
    )
    await vi.advanceTimersByTimeAsync(25)
    await expectation
  })

  it('also times out if restoring the browser session stalls', async () => {
    vi.useFakeTimers()
    mockGetSession.mockReturnValue(new Promise(() => {}))

    const request = v2Fetch('/api/v2/sessions', { timeoutMs: 25 })
    const expectation = expect(request).rejects.toThrow(
      'SaturnPath is taking longer than expected. Please try again.',
    )
    await vi.advanceTimersByTimeAsync(25)
    await expectation
  })
})
