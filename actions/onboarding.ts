'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { generateRecommendations } from '@/lib/sat-planner'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import { StudyPlanEngine } from '@/lib/study-plan-engine'
import { validateAgeConsent } from '@/lib/legal/config'
import { buildConfirmationEmail } from '@/lib/email/confirmation-template'
import type { TopicPerformance } from '@/lib/study-plan-engine/types'
import type {
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingAnalysis,
  AIOnboardingRec,
} from '@/types'

// ─── Recommendations (deterministic engine) ───────────────────────────────────

export async function getOnboardingRecommendations(
  step1: OnboardingStep1Data,
  analysis: OnboardingAnalysis,
): Promise<{ data?: AIOnboardingRec; error?: string }> {
  try {
    const data = generateRecommendations(
      {
        currentScore: step1.currentScore,
        targetScore: step1.targetScore,
        testDate: step1.testDate,
        dailyStudyMinutes: step1.dailyStudyMinutes,
      },
      analysis,
    )
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to generate recommendations' }
  }
}

// ─── Save Onboarding Data ─────────────────────────────────────────────────────

export async function saveOnboarding(
  step1: OnboardingStep1Data,
  step2: OnboardingStep2Data,
  analysis: OnboardingAnalysis,
  recs: AIOnboardingRec | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const hoursPerWeek = Math.round((step1.dailyStudyMinutes * 7) / 60)
  const today = new Date().toISOString().split('T')[0]

  // 1. Update user profile
  const { error: profileErr } = await supabase
    .from('users')
    .update({
      current_score: step1.currentScore,
      target_score: step1.targetScore,
      test_date: step1.testDate,
      study_hours_per_week: hoursPerWeek,
      daily_study_minutes: step1.dailyStudyMinutes,
      has_completed_onboarding: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileErr) return { error: profileErr.message }

  // 2. Question sessions per domain (only domains with real data)
  // Note: diagnostic_tests insert removed — question_sessions is the single source of truth
  // for all per-domain performance data read by the study plan engine and analytics.
  const DOMAIN_MAP = [
    { key: 'informationIdeas', label: 'Information and Ideas',        subject: 'reading_writing' as const, get: () => step2.reading_writing.informationIdeas },
    { key: 'craftStructure',   label: 'Craft and Structure',          subject: 'reading_writing' as const, get: () => step2.reading_writing.craftStructure },
    { key: 'expressionIdeas',  label: 'Expression of Ideas',          subject: 'reading_writing' as const, get: () => step2.reading_writing.expressionIdeas },
    { key: 'standardEnglish',  label: 'Standard English Conventions', subject: 'reading_writing' as const, get: () => step2.reading_writing.standardEnglish },
    { key: 'algebra',          label: 'Algebra',                       subject: 'math' as const, get: () => step2.math.algebra },
    { key: 'advancedMath',     label: 'Advanced Math',                 subject: 'math' as const, get: () => step2.math.advancedMath },
    { key: 'problemSolving',   label: 'Problem-Solving and Data Analysis', subject: 'math' as const, get: () => step2.math.problemSolving },
    { key: 'geometry',         label: 'Geometry and Trigonometry',    subject: 'math' as const, get: () => step2.math.geometry },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions: any[] = DOMAIN_MAP
    .map(d => {
      const { attempted, correct } = d.get()
      if (attempted <= 0) return null
      return {
        user_id: user.id,
        session_date: today,
        subject: d.subject,
        category: d.label,
        subcategory: null,
        questions_attempted: attempted,
        questions_correct: Math.min(correct, attempted),
        time_spent_minutes: null,
        college_board_filters: { domain: d.label },
        notes: 'From onboarding diagnostic',
      }
    })
    .filter(Boolean)

  if (sessions.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sessErr } = await (supabase.from('question_sessions') as any).insert(sessions)
    if (sessErr) return { error: sessErr.message }
  }

  // Diagnostic data entered → seed initial replanning pass (runs after plan is saved below)
  // Deferred to after the study plan insert so the active plan exists to query against.

  // 4. Study plan — run the engine so calendar_tasks rows are created alongside the plan
  //
  // For domains the user skipped (0 attempted), inject a synthetic 40 % seed so the engine
  // treats them as weak areas and schedules them. This matches the behaviour of
  // generatePlanFromForm's weakAreaKeys path.
  // Note: synthetic entries are NOT written to question_sessions — analytics only surfaces
  // real session rows, so charts stay honest.
  const topicPerformance: TopicPerformance[] = DOMAIN_MAP
    .map(d => {
      const { attempted, correct } = d.get()
      if (attempted <= 0) {
        // Skipped domain → treat as weak area at 40 % accuracy
        return { domainKey: d.key, attempted: 10, correct: 4, accuracy: 40 }
      }
      const clamped = Math.min(correct, attempted)
      return {
        domainKey: d.key,
        attempted,
        correct: clamped,
        accuracy: Math.round((clamped / attempted) * 100),
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine = new StudyPlanEngine(supabase as any)
  const planResult = await engine.generate({
    userId: user.id,
    currentScore: step1.currentScore,
    targetScore: step1.targetScore,
    testDate: step1.testDate,
    dailyStudyMinutes: step1.dailyStudyMinutes,
    topicPerformance,
  })

  if (planResult.error) return { error: planResult.error }

  // Set default inventory mode based on practice test count (non-fatal)
  const defaultMode = (planResult.practiceTestDays ?? 0) >= 5 ? 'exclude_active' : 'include_active'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('users') as any).update({ inventory_mode: defaultMode }).eq('id', user.id)

  // 5. Baseline score history
  const mathEstimate = Math.round(step1.currentScore * 0.5)
  const { error: scoreErr } = await supabase.from('score_history').insert({
    user_id: user.id,
    test_type: 'diagnostic',
    test_date: today,
    math_score: mathEstimate,
    reading_writing_score: step1.currentScore - mathEstimate,
    notes: 'Baseline score from onboarding',
  })
  if (scoreErr) return { error: scoreErr.message }

  // 6. Welcome notification (non-fatal — does not block onboarding completion)
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id: user.id,
    title: '🎉 Welcome to SAT Study Planner!',
    message: `Your study plan is ready. You have ${analysis.studyDays} days to reach ${step1.targetScore}. Let's get started!`,
    type: 'system',
    is_read: false,
  })
  if (notifErr) console.error('[saveOnboarding] notification insert failed:', notifErr.message)

  // Seed default notification preferences so the daily cron picks this user up
  // immediately. Upsert so it never overwrites preferences a user already saved.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notification_preferences') as any).upsert(
    {
      user_id: user.id,
      email_reminders_enabled:   true,
      inapp_reminders_enabled:   true,
      daily_assignment_reminder: true,
      overdue_reminder:          true,
      practice_test_reminder:    true,
      timezone:                  'America/New_York',
    },
    { onConflict: 'user_id' },
  )

  // Trigger initial replanning pass now that diagnostic sessions and plan exist.
  // Fire-and-forget — onboarding completion should not block on this.
  runAdaptiveReplanner(supabase, user.id, 'question_session').catch(() => { /* non-fatal */ })

  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/calendar')
  return {}
}

// ─── Sign Up + Save Onboarding (single action for unauthenticated onboarding) ──

export async function signUpAndSaveOnboarding(
  credentials: {
    email: string
    password: string
    fullName: string
    birthYear: number
    agreedToTerms: boolean
    parentalAck: boolean
  },
  step1: OnboardingStep1Data,
  step2: OnboardingStep2Data,
  analysis: OnboardingAnalysis,
  recs: AIOnboardingRec | null,
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  // Age gate + consent (authoritative server-side check) — block before any
  // account is created for under-13 / missing consent.
  const consentError = validateAgeConsent({
    birthYear: credentials.birthYear,
    agreedToTerms: credentials.agreedToTerms,
    parentalAck: credentials.parentalAck,
  })
  if (consentError) return { error: consentError }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // 1. Create the account via generateLink — this creates the user and returns
  //    the confirmation URL without triggering Supabase's own email service.
  //    We send a branded email via Resend instead.
  const { data: linkData, error: signUpError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: credentials.email,
    password: credentials.password,
    options: {
      data: { full_name: credentials.fullName },
      redirectTo: `${getAppUrl()}/auth/confirm`,
    },
  })
  if (signUpError) return { error: signUpError.message }
  if (!linkData.user) return { error: 'Account creation failed. Please try again.' }

  // User is unconfirmed (no session). Use admin client for all writes so RLS
  // doesn't block them. Once the user confirms their email and signs in, their
  // plan is already in the DB and they land straight on the dashboard.
  const db = admin
  const user = linkData.user
  const hoursPerWeek = Math.round((step1.dailyStudyMinutes * 7) / 60)
  const today = new Date().toISOString().split('T')[0]

  // 2. Create/update the user profile. Upsert (not update) so it succeeds even
  // if the on_auth_user_created trigger has not yet materialised the row.
  const { error: profileErr } = await db
    .from('users')
    .upsert(
      {
        id: user.id,
        email: credentials.email,
        full_name: credentials.fullName,
        birth_year: credentials.birthYear,
        terms_accepted_at: new Date().toISOString(),
        parental_ack: credentials.parentalAck,
        current_score: step1.currentScore,
        target_score: step1.targetScore,
        test_date: step1.testDate,
        study_hours_per_week: hoursPerWeek,
        daily_study_minutes: step1.dailyStudyMinutes,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (profileErr) return { error: profileErr.message }

  // 3. Question sessions per domain
  const DOMAIN_MAP = [
    { key: 'informationIdeas', label: 'Information and Ideas',            subject: 'reading_writing' as const, get: () => step2.reading_writing.informationIdeas },
    { key: 'craftStructure',   label: 'Craft and Structure',              subject: 'reading_writing' as const, get: () => step2.reading_writing.craftStructure },
    { key: 'expressionIdeas',  label: 'Expression of Ideas',              subject: 'reading_writing' as const, get: () => step2.reading_writing.expressionIdeas },
    { key: 'standardEnglish',  label: 'Standard English Conventions',     subject: 'reading_writing' as const, get: () => step2.reading_writing.standardEnglish },
    { key: 'algebra',          label: 'Algebra',                          subject: 'math' as const,            get: () => step2.math.algebra },
    { key: 'advancedMath',     label: 'Advanced Math',                    subject: 'math' as const,            get: () => step2.math.advancedMath },
    { key: 'problemSolving',   label: 'Problem-Solving and Data Analysis', subject: 'math' as const,           get: () => step2.math.problemSolving },
    { key: 'geometry',         label: 'Geometry and Trigonometry',        subject: 'math' as const,            get: () => step2.math.geometry },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions: any[] = DOMAIN_MAP
    .map(d => {
      const { attempted, correct } = d.get()
      if (attempted <= 0) return null
      return {
        user_id: user.id,
        session_date: today,
        subject: d.subject,
        category: d.label,
        subcategory: null,
        questions_attempted: attempted,
        questions_correct: Math.min(correct, attempted),
        time_spent_minutes: null,
        college_board_filters: { domain: d.label },
        notes: 'From onboarding diagnostic',
      }
    })
    .filter(Boolean)

  if (sessions.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sessErr } = await (db.from('question_sessions') as any).insert(sessions)
    if (sessErr) return { error: sessErr.message }
  }

  // 4. Study plan
  const topicPerformance: TopicPerformance[] = DOMAIN_MAP.map(d => {
    const { attempted, correct } = d.get()
    if (attempted <= 0) return { domainKey: d.key, attempted: 10, correct: 4, accuracy: 40 }
    const clamped = Math.min(correct, attempted)
    return { domainKey: d.key, attempted, correct: clamped, accuracy: Math.round((clamped / attempted) * 100) }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine = new StudyPlanEngine(db as any)
  const planResult = await engine.generate({
    userId: user.id,
    currentScore: step1.currentScore,
    targetScore: step1.targetScore,
    testDate: step1.testDate,
    dailyStudyMinutes: step1.dailyStudyMinutes,
    topicPerformance,
  })
  if (planResult.error) return { error: planResult.error }

  // Set default inventory mode based on practice test count (non-fatal)
  const defaultSignupMode = (planResult.practiceTestDays ?? 0) >= 5 ? 'exclude_active' : 'include_active'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('users') as any).update({ inventory_mode: defaultSignupMode }).eq('id', user.id)

  // 5. Baseline score history
  const mathEstimate = Math.round(step1.currentScore * 0.5)
  const { error: scoreErr } = await db.from('score_history').insert({
    user_id: user.id,
    test_type: 'diagnostic',
    test_date: today,
    math_score: mathEstimate,
    reading_writing_score: step1.currentScore - mathEstimate,
    notes: 'Baseline score from onboarding',
  })
  if (scoreErr) return { error: scoreErr.message }

  // 6. Welcome notification (non-fatal)
  await db.from('notifications').insert({
    user_id: user.id,
    title: '🎉 Welcome to SaturnPath!',
    message: `Your study plan is ready. You have ${analysis.studyDays} days to reach ${step1.targetScore}. Let's get started!`,
    type: 'system',
    is_read: false,
  })

  // 7. Seed default notification preferences so the daily reminder cron picks
  //    this user up immediately. All channels on, Eastern timezone. Non-fatal.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('notification_preferences') as any).upsert(
    {
      user_id: user.id,
      email_reminders_enabled:   true,
      inapp_reminders_enabled:   true,
      daily_assignment_reminder: true,
      overdue_reminder:          true,
      practice_test_reminder:    true,
      timezone:                  'America/New_York',
    },
    { onConflict: 'user_id' },
  )

  // Seed the initial replanning pass (fire-and-forget — never blocks signup).
  runAdaptiveReplanner(db, user.id, 'question_session').catch(() => { /* non-fatal */ })

  // Send branded confirmation email via Resend.
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'SaturnPath <onboarding@resend.dev>'
  if (resendKey && linkData.properties?.action_link) {
    try {
      const resend = new Resend(resendKey)
      const firstName = credentials.fullName.split(' ')[0] || 'there'
      const { subject, html } = buildConfirmationEmail({
        firstName,
        confirmUrl: linkData.properties.action_link,
        appUrl,
      })
      await resend.emails.send({ from: fromEmail, to: credentials.email, subject, html })
    } catch (emailErr) {
      console.error('[signUpAndSaveOnboarding] Resend error:', emailErr)
      // Non-fatal — plan is saved; user can request a new confirmation email.
    }
  } else if (!resendKey) {
    console.warn('[signUpAndSaveOnboarding] RESEND_API_KEY not set — confirmation email not sent.')
  }

  // Plan is already saved. Once the user confirms and signs in they land
  // straight on the dashboard (no re-onboarding).
  return { needsConfirmation: true }
}


// ─── Guest Onboarding (anonymous sign-in + save) ──────────────────────────────

export async function guestOnboarding(
  step1: OnboardingStep1Data,
  step2: OnboardingStep2Data,
  analysis: OnboardingAnalysis,
  recs: AIOnboardingRec | null,
): Promise<{ error?: string }> {
  // Anonymous sign-in is a spam / cost-amplification vector: each call creates a
  // permanent auth user AND runs the full plan engine + adaptive replanner
  // (100+ row writes). With no rate limiting or CAPTCHA in front, leave this
  // OFF by default. Re-enable only once abuse protection (Supabase Auth CAPTCHA /
  // Cloudflare Turnstile) and an anonymous-user cleanup job are in place.
  if (process.env.ENABLE_GUEST_ONBOARDING !== 'true') {
    return { error: 'Guest access is disabled. Please create a free account to save your plan.' }
  }

  const supabase = await createClient()

  const { error: anonError } = await supabase.auth.signInAnonymously()
  if (anonError) return { error: anonError.message }

  return saveOnboarding(step1, step2, analysis, recs)
}


// ─── Guest Preview (anonymous session + disposable demo plan) ──────────────────

/**
 * Starts an anonymous session and seeds a sample study plan so a visitor can
 * explore the real dashboard without creating an account. Nothing personal is
 * collected: the throwaway anonymous user holds only demo data, and the
 * `GuestUpgradeBanner` on the dashboard makes clear it isn't saved across
 * devices. Requires "Allow anonymous sign-ins" to be enabled in Supabase.
 *
 * NOTE (abuse): like any anonymous-auth entry point this is a spam/cost vector.
 * Put Supabase Auth CAPTCHA / Turnstile in front and run a periodic
 * anonymous-user cleanup job before opening it to significant traffic.
 */
export async function guestPreview(): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data, error: anonError } = await supabase.auth.signInAnonymously()
  if (anonError) {
    return {
      error:
        'Guest preview is currently unavailable. (Anonymous sign-ins must be enabled in Supabase.)',
    }
  }
  const user = data.user
  if (!user) return { error: 'Could not start a guest session. Please try again.' }

  const today = new Date().toISOString().split('T')[0]
  const testDate = new Date(Date.now() + 84 * 86_400_000).toISOString().split('T')[0]

  // Demo profile so the dashboard shows real numbers; mark onboarding complete
  // so the dashboard layout doesn't redirect the guest into the setup wizard.
  const { error: profileErr } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        full_name: 'Guest',
        current_score: 1050,
        target_score: 1350,
        test_date: testDate,
        study_hours_per_week: 7,
        daily_study_minutes: 60,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (profileErr) return { error: profileErr.message }

  // Seed a sample study plan so the calendar + home dashboard are populated.
  // Every domain is seeded as a weak area (40%) so the engine builds a full plan.
  const DEMO_DOMAIN_KEYS = [
    'informationIdeas', 'craftStructure', 'expressionIdeas', 'standardEnglish',
    'algebra', 'advancedMath', 'problemSolving', 'geometry',
  ]
  const topicPerformance: TopicPerformance[] = DEMO_DOMAIN_KEYS.map(domainKey => ({
    domainKey,
    attempted: 10,
    correct: 4,
    accuracy: 40,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine = new StudyPlanEngine(supabase as any)
  const planResult = await engine.generate({
    userId: user.id,
    currentScore: 1050,
    targetScore: 1350,
    testDate,
    dailyStudyMinutes: 60,
    topicPerformance,
  })
  if (planResult.error) return { error: planResult.error }

  // Baseline score so the score cards/trend have a starting point (non-fatal).
  const mathEstimate = Math.round(1050 * 0.5)
  await supabase.from('score_history').insert({
    user_id: user.id,
    test_type: 'diagnostic',
    test_date: today,
    math_score: mathEstimate,
    reading_writing_score: 1050 - mathEstimate,
    notes: 'Guest preview baseline',
  })

  revalidatePath('/home')
  revalidatePath('/calendar')
  revalidatePath('/data')
  return {}
}
