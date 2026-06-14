'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { validateAgeConsent } from '@/lib/legal/config'

export async function signIn(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/home')
}

export async function signUp(formData: FormData) {
  'use server'
  const email    = formData.get('email')     as string
  const password = formData.get('password')  as string
  const fullName = formData.get('full_name') as string

  // ── Age gate + consent (authoritative server-side check) ──────────────────
  const birthYear   = Number(formData.get('birth_year'))
  const agreedTerms = formData.get('agree_terms') === 'on' || formData.get('agree_terms') === 'true'
  const parentalAck = formData.get('parental_ack') === 'on' || formData.get('parental_ack') === 'true'

  const consentError = validateAgeConsent({ birthYear, agreedToTerms: agreedTerms, parentalAck })
  if (consentError) return { error: consentError }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getAppUrl()}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }
  if (!data.user) {
    return { error: 'Account creation failed. Please try again.' }
  }

  // Persist age/consent records onto the users row. When email confirmation is
  // pending there is no session, so RLS would block the write — use the
  // service-role admin client in that case (same pattern as onboarding). Upsert
  // so it works even before the on_auth_user_created trigger materializes the row.
  const needsConfirmation = !data.session
  const db = needsConfirmation ? createAdminClient() : supabase
  const { error: profileErr } = await db
    .from('users')
    .upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        birth_year: birthYear,
        terms_accepted_at: new Date().toISOString(),
        parental_ack: parentalAck,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (profileErr) return { error: profileErr.message }

  // Email confirmation is enabled in Supabase — session won't exist yet.
  // Redirect to login with a flag so the page shows a "check your email" message.
  if (needsConfirmation) {
    return { needsConfirmation: true }
  }

  redirect('/home')
}

export async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function saveGoogleConsent(formData: FormData) {
  'use server'
  const birthYear   = Number(formData.get('birth_year'))
  const agreedTerms = formData.get('agree_terms') === 'true'
  const parentalAck = formData.get('parental_ack') === 'true'

  const consentError = validateAgeConsent({ birthYear, agreedToTerms: agreedTerms, parentalAck })
  if (consentError) return { error: consentError }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Session expired. Please sign in again.' }

  const { error: profileErr } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          '',
        birth_year:        birthYear,
        terms_accepted_at: new Date().toISOString(),
        parental_ack:      parentalAck,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (profileErr) return { error: profileErr.message }

  redirect('/onboarding')
}

export async function upgradeGuestAccount(formData: FormData) {
  'use server'
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    email,
    password,
    data: { full_name: fullName },
  })

  if (error) return { error: error.message }
  return { needsConfirmation: true }
}
