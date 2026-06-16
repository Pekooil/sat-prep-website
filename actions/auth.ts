'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { buildConfirmationEmail } from '@/lib/email/confirmation-template'
import { validateAgeConsent } from '@/lib/legal/config'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { rateLimit } from '@/lib/security/rate-limit'

export async function signIn(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('has_completed_onboarding')
    .eq('id', data.user.id)
    .single()

  if (!profile?.has_completed_onboarding) {
    redirect('/onboarding')
  }

  redirect('/home')
}

export async function signUp(formData: FormData) {
  'use server'

  // ── Abuse protection ────────────────────────────────────────────────────────
  // signUp() creates accounts via the service-role admin client, which bypasses
  // Supabase's own auth rate-limit + CAPTCHA. Guard the endpoint ourselves:
  // (1) per-IP rate limit, (2) Cloudflare Turnstile verification. Both are
  // no-ops until their env vars are configured (see lib/security/*).
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
  const rl = rateLimit(`signup:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return { error: `Too many sign-up attempts. Please try again in about ${Math.ceil(rl.retryAfterSec / 60)} minute(s).` }
  }
  const captcha = await verifyTurnstile(formData.get('cf_turnstile_token') as string | null, ip)
  if (!captcha.ok) return { error: captcha.error ?? 'Captcha verification failed.' }

  const email    = formData.get('email')     as string
  const password = formData.get('password')  as string
  const fullName = formData.get('full_name') as string
  const birthYear     = Number(formData.get('birth_year'))
  const agreedToTerms = formData.get('agreed_to_terms') === 'on'
  const parentalAck   = formData.get('parental_ack') === 'on'

  // Age gate + consent (authoritative server-side check) — block before any
  // account is created for under-13 / missing consent.
  const consentError = validateAgeConsent({ birthYear, agreedToTerms, parentalAck })
  if (consentError) return { error: consentError }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // generateLink creates the user and returns the confirmation URL without
  // triggering Supabase's own email service. We send the email via Resend so
  // it arrives from our verified domain with our branded template.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { full_name: fullName },
      redirectTo: `${getAppUrl()}/auth/confirm`,
    },
  })
  if (linkError) return { error: linkError.message }
  if (!linkData.user) return { error: 'Account creation failed. Please try again.' }

  // Profile row — user is unconfirmed, so RLS blocks writes; use admin client.
  const { error: profileErr } = await admin.from('users').upsert(
    {
      id: linkData.user.id,
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

  // Seed default notification preferences so the daily cron picks this user up
  // immediately. All channels on, Eastern timezone. Non-fatal if it fails.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('notification_preferences') as any).upsert(
    {
      user_id: linkData.user.id,
      email_reminders_enabled:   true,
      inapp_reminders_enabled:   true,
      daily_assignment_reminder: true,
      overdue_reminder:          true,
      practice_test_reminder:    true,
      timezone:                  'America/New_York',
    },
    { onConflict: 'user_id' },
  )

  // Send branded confirmation email via Resend.
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'SaturnPath <onboarding@resend.dev>'
  if (resendKey && linkData.properties?.action_link) {
    try {
      const resend = new Resend(resendKey)
      const firstName = fullName.split(' ')[0] || 'there'
      const { subject, html } = buildConfirmationEmail({
        firstName,
        confirmUrl: linkData.properties.action_link,
        appUrl,
      })
      await resend.emails.send({ from: fromEmail, to: email, subject, html })
    } catch (emailErr) {
      console.error('[signUp] Resend error:', emailErr)
      // Non-fatal — account is created; user can request a new link.
    }
  } else if (!resendKey) {
    console.warn('[signUp] RESEND_API_KEY not set — confirmation email not sent.')
  }

  return { needsConfirmation: true }
}

export async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function saveGoogleConsent(input: {
  birthYear: number
  agreedToTerms: boolean
  parentalAck: boolean
}) {
  'use server'
  // Age gate + consent (authoritative server-side check) — same gate as email
  // signup. A first-time Google user has an auth.users row but no profile
  // consent yet; block them here until they pass the age gate.
  const consentError = validateAgeConsent({
    birthYear: input.birthYear,
    agreedToTerms: input.agreedToTerms,
    parentalAck: input.parentalAck,
  })
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
        birth_year:        input.birthYear,
        terms_accepted_at: new Date().toISOString(),
        parental_ack:      input.parentalAck,
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
