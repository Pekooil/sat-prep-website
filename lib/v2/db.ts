import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/supabase/env'

/**
 * V2 server data access. The service-role client is created only after the
 * request has authenticated through Supabase Auth, and is never imported by
 * client components or sent to the browser.
 */
export function createV2AdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

