import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Proxy guarantees auth; this is a fallback safety net.
  if (!user) redirect('/signup')

  const { data: profile } = await supabase
    .from('users')
    .select('has_completed_onboarding, terms_accepted_at')
    .eq('id', user.id)
    .single()

  if (!profile?.terms_accepted_at) {
    redirect('/auth/google-consent')
  }

  if (profile?.has_completed_onboarding) {
    redirect('/home')
  }

  return <OnboardingWizard isAuthenticated={true} />
}
