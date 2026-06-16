import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/landing-page'
import { getLandingStats } from '@/actions/waitlist'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // New users who haven't completed onboarding go directly to the wizard.
    const { data: profile } = await supabase
      .from('users')
      .select('has_completed_onboarding, terms_accepted_at, birth_year')
      .eq('id', user.id)
      .single()

    // Age gate + consent must be on file before entering the app.
    if (!profile?.terms_accepted_at || profile.birth_year == null) {
      redirect('/auth/google-consent')
    }
    redirect(profile?.has_completed_onboarding ? '/home' : '/onboarding')
  }

  const stats = await getLandingStats()
  return <LandingPage stats={stats} />
}
