import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { V2Shell } from '@/components/v2-product/v2-shell'
import { getAuthProfile } from '@/lib/auth-profile'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { profile, source } = await getAuthProfile(supabase, user.id)

  // Age gate + consent must be on file before accessing the app. This catches
  // first-time Google users (no terms_accepted_at yet) AND legacy accounts
  // created before the age gate existed (birth_year IS NULL) — closing the
  // COPPA gap for pre-existing users, not just new signups.
  if (source === 'v1' && profile && (!profile.terms_accepted_at || profile.birth_year == null)) {
    redirect('/auth/google-consent')
  }

  if (source === 'v2' && !profile) {
    redirect('/onboarding')
  }

  // First-time users must complete onboarding
  if (profile && !profile.has_completed_onboarding) {
    redirect('/onboarding')
  }

  return <V2Shell>{children}</V2Shell>
}
