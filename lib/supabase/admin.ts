/**
 * createAdminClient
 *
 * Returns a Supabase client that uses the service-role key and bypasses RLS.
 * Only call this from server-side code (API routes, server actions).
 * Never expose the service-role key to the client.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. ' +
      'Add them to .env.local — find the service role key in your Supabase project → Settings → API.'
    )
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
