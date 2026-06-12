'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type WaitlistInsert = Database['public']['Tables']['waitlist_signups']['Insert']

// Basic, permissive server-side shape check. We intentionally keep this loose —
// the goal is to reject obvious garbage, not to fully validate deliverability.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface JoinWaitlistResult {
  success?: true
  error?: string
}

/**
 * joinWaitlist — the ONLY live backend interaction on the landing page.
 *
 * Inserts an email into the isolated `waitlist_signups` table. Requires no auth
 * and triggers no app logic (no planner, no replanner, no user records). A
 * duplicate email is treated as a friendly success ("you're already on the list")
 * rather than an error.
 */
export async function joinWaitlist(formData: FormData): Promise<JoinWaitlistResult> {
  'use server'

  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email) return { error: 'Please enter your email.' }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const supabase = await createClient()

  const payload: WaitlistInsert = { email, source: 'landing' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('waitlist_signups') as any).insert(payload)

  if (error) {
    // 23505 = unique_violation → already signed up. Treat as success.
    if (error.code === '23505') return { success: true }
    return { error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
