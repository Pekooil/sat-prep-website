'use client'

import { createClient } from '@/lib/supabase/client'

type V2FetchOptions = RequestInit & { timeoutMs?: number }

const DEFAULT_TIMEOUT_MS = 15_000

export async function v2Fetch<T>(path: string, init: V2FetchOptions = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...requestInit } = init
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortFromCaller = () => controller.abort(callerSignal?.reason)
  let rejectForAbort: (() => void) | null = null
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectForAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (controller.signal.aborted) rejectForAbort()
    else controller.signal.addEventListener('abort', rejectForAbort, { once: true })
  })

  if (callerSignal?.aborted) abortFromCaller()
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const request = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Your session has expired. Sign in again to continue.')
      }

      const response = await fetch(path, {
        ...requestInit,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...(requestInit.headers ?? {}),
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message ?? 'SaturnPath could not complete that request.')
      }
      return payload as T
    }

    return await Promise.race([request(), aborted])
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) {
      throw new Error('SaturnPath is taking longer than expected. Please try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    if (rejectForAbort) controller.signal.removeEventListener('abort', rejectForAbort)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }
}

export function idempotencyKey() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-saturnpath`
}
