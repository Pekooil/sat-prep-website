import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/env'
import type { Database } from '@/types/database'
import { getAuthProfile } from '@/lib/auth-profile'
import { safeAuthPath } from '@/lib/auth/redirect-path'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeAuthPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing+auth+code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=Authentication+failed`)
  }

  const { profile, source } = await getAuthProfile(supabase, user.id)

  // New Google user — no profile row yet or no terms acceptance
  if (source === 'v2') {
    if (!profile?.terms_accepted_at || !profile.has_completed_onboarding) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (!profile || !profile.terms_accepted_at) {
    return NextResponse.redirect(`${origin}/auth/google-consent`)
  }

  if (!profile.has_completed_onboarding) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
