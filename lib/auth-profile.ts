import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthProfile = {
  has_completed_onboarding: boolean
  terms_accepted_at: string | null
  birth_year: number | null
}

export type AuthProfileSource = 'v1' | 'v2'

export function isMissingProfileTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || /schema cache|relation .* does not exist/i.test(error.message ?? '')
}

/** Read the profile projection available in the current Supabase environment. */
export async function getAuthProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ profile: AuthProfile | null; source: AuthProfileSource }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v2 = await (client as any)
    .from('v2_profiles')
    .select('onboarding_complete, terms_accepted_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!v2.error) {
    return {
      source: 'v2',
      profile: v2.data
        ? {
            has_completed_onboarding: v2.data.onboarding_complete ?? false,
            terms_accepted_at: v2.data.terms_accepted_at ?? null,
            // V2 validates birth year at onboarding but intentionally does not
            // store a full date of birth in the profile projection.
            birth_year: null,
          }
        : null,
    }
  }

  if (!isMissingProfileTable(v2.error)) throw new Error(v2.error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v1 = await (client as any)
    .from('users')
    .select('has_completed_onboarding, terms_accepted_at, birth_year')
    .eq('id', userId)
    .maybeSingle()
  if (v1.error) throw new Error(v1.error.message)

  return { source: 'v1', profile: v1.data ?? null }
}
