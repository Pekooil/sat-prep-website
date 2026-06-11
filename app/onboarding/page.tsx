import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already logged in and already onboarded, send to dashboard
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('has_completed_onboarding')
      .eq('id', user.id)
      .single()

    if (profile?.has_completed_onboarding) {
      redirect('/home')
    }
  }

  // Allow unauthenticated users — account creation is step 5 of the wizard.
  // The anonymous "Continue as guest" path is gated behind ENABLE_GUEST_ONBOARDING.
  const allowGuest = process.env.ENABLE_GUEST_ONBOARDING === 'true'
  return <OnboardingWizard isAuthenticated={!!user} allowGuest={allowGuest} />
}
