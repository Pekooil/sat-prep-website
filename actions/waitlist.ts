'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export interface LandingStats {
  userCount: number
  questionCount: number
}

/**
 * getLandingStats — public stats for the landing page stats strip.
 * Uses the admin client (service role) so it can read both tables without
 * requiring a user session. Safe to call from a server component.
 */
export async function getLandingStats(): Promise<LandingStats> {
  try {
    const admin = createAdminClient()
    const [waitlistRes, inventoryRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('waitlist_signups').select('id', { count: 'exact', head: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('question_inventory').select('available_count'),
    ])
    const userCount = waitlistRes.count ?? 0
    const questionCount = (inventoryRes.data as Array<{ available_count: number }> | null)
      ?.reduce((sum: number, r: { available_count: number }) => sum + (r.available_count ?? 0), 0) ?? 0
    return { userCount, questionCount }
  } catch {
    return { userCount: 0, questionCount: 0 }
  }
}
