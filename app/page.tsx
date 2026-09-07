import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/landing-page'
import { getAuthProfile } from '@/lib/auth-profile'
import { V2_STAGING_HOST } from '@/lib/app-url'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Free Adaptive SAT Prep',
  description: 'Short, adaptive SAT practice sessions that change after every answer. Personalized planning, review, and progress—completely free.',
}

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
    const { profile, source } = await getAuthProfile(supabase, user.id)

    if (source === 'v2') {
      redirect(profile?.has_completed_onboarding ? '/home' : '/onboarding')
    }

    // Age gate + consent must be on file before entering the app.
    if (!profile?.terms_accepted_at || profile.birth_year == null) {
      redirect('/auth/google-consent')
    }
    redirect(profile?.has_completed_onboarding ? '/home' : '/onboarding')
  }

  // The V2 staging hostname is an app environment, not the public marketing
  // site. Send logged-out visitors to the real auth entry point instead of the
  // retired front-end-only design preview route.
  const host = (await headers()).get('host')?.split(':')[0]
  if (host === V2_STAGING_HOST) redirect('/login')

  return <LandingPage />
}
