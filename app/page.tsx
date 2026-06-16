import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/landing-page'
import { getLandingStats } from '@/actions/waitlist'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}) {
  const params = await searchParams

  // OAuth fallback: if a provider (e.g. Google via Supabase) bounced the user
  // back to the Site URL (this root page) with a PKCE `code` instead of hitting
  // `/auth/callback`, forward it to the callback handler so the session can be
  // exchanged. Without this the code sits unused in the URL and the visitor is
  // treated as logged out — landing them right back on this marketing page.
  // (A Server Component can't set the auth cookies itself; the route handler can.)
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`)
  }
  if (params.error) {
    const message = params.error_description ?? params.error
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

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
