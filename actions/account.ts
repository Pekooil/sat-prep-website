'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * deleteAccount — self-service account + data deletion (CCPA/CPRA right to delete).
 *
 * Deleting the auth user cascades through the entire schema: `public.users.id`
 * references `auth.users(id) ON DELETE CASCADE`, and every user-owned table
 * (study_plans, calendar_tasks, question_sessions, error_logs, score_history,
 * notifications, notification_preferences, replan_audit_logs, topic_mastery,
 * plan_versions, score_predictions, adaptive_recommendations, diagnostic_tests)
 * references `users(id) ON DELETE CASCADE`. So a single admin delete removes all
 * of the user's personal data. (waitlist_signups is intentionally unlinked and
 * holds only an email; it is not affected — a separate email request covers it.)
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to delete your account.' }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Server is not configured for account deletion.' }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  // Clear the local session cookie, then send them to the login landing.
  await supabase.auth.signOut()
  redirect('/login?deleted=1')
}
