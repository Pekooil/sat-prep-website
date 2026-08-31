'use client'

import { createClient } from '@/lib/supabase/client'

export async function v2Fetch<T>(path: string, init: RequestInit = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again to continue.')
  const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message ?? 'SaturnPath could not complete that request.')
  return payload as T
}

export function idempotencyKey() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-saturnpath`
}
