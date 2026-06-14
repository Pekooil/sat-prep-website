'use server'

import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { buildConfirmationEmail } from '@/lib/email/confirmation-template'

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
  const email    = formData.get('email')     as string
  const password = formData.get('password')  as string
  const fullName = formData.get('full_name') as string

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
      terms_accepted_at: new Date().toISOString(),
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

export async function saveGoogleConsent() {
  'use server'
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
        terms_accepted_at: new Date().toISOString(),
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
