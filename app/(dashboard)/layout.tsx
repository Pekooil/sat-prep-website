import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { V2Shell } from '@/components/v2-product/v2-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('has_completed_onboarding, terms_accepted_at, birth_year')
    .eq('id', user.id)
    .single()

  // Age gate + consent must be on file before accessing the app. This catches
  // first-time Google users (no terms_accepted_at yet) AND legacy accounts
  // created before the age gate existed (birth_year IS NULL) — closing the
  // COPPA gap for pre-existing users, not just new signups.
  if (profile && (!profile.terms_accepted_at || profile.birth_year == null)) {
    redirect('/auth/google-consent')
  }

  // First-time users must complete onboarding
  if (profile && !profile.has_completed_onboarding) {
    redirect('/onboarding')
  }

  return <V2Shell>{children}</V2Shell>
}
