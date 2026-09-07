import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { V2Onboarding } from '@/components/v2/onboarding/v2-onboarding'
import { getAuthProfile } from '@/lib/auth-profile'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Proxy guarantees auth; this is a fallback safety net.
  if (!user) redirect('/signup')

  const { profile, source } = await getAuthProfile(supabase, user.id)

  // Age gate + consent must be on file before onboarding.
  if (source === 'v1' && (!profile?.terms_accepted_at || profile.birth_year == null)) {
    redirect('/auth/google-consent')
  }

  if (profile?.has_completed_onboarding) {
    redirect('/home')
  }

  return <V2Onboarding />
}
