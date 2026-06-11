/**
 * Admin authorization helper.
 *
 * The Question Inventory is GLOBAL, shared state (no `user_id`). Mutating it must
 * be restricted to operators, not any logged-in student. We gate writes behind an
 * allowlist of admin emails supplied via the `ADMIN_EMAILS` env var
 * (comma-separated, case-insensitive). If the var is unset, NO ONE is an admin —
 * a secure-by-default deny.
 *
 * Pair this with RLS that makes `question_inventory` SELECT-only for the
 * `authenticated` role; admin writes go through the service-role client
 * (`createAdminClient`) only after `assertAdmin()` passes.
 */
import { createClient } from '@/lib/supabase/server'

function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Resolves the current session user and returns whether they are an admin.
 * Returns `{ user: null }` when unauthenticated.
 */
export async function getAdminStatus(): Promise<{
  user: { id: string; email: string | null } | null
  isAdmin: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }

  const email = user.email?.toLowerCase() ?? null
  const isAdmin = email != null && adminEmailSet().has(email)
  return { user: { id: user.id, email: user.email ?? null }, isAdmin }
}

/**
 * Throws-by-return: returns an error string when the caller is not an admin,
 * or `null` when authorized. Use at the top of every inventory mutation.
 */
export async function assertAdmin(): Promise<string | null> {
  const { user, isAdmin } = await getAdminStatus()
  if (!user) return 'Unauthorized'
  if (!isAdmin) return 'Admin access required'
  return null
}
