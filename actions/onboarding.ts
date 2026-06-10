'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/sat-planner'
import { runAdaptiveReplanner } from '@/lib/adaptive-replanner'
import { StudyPlanEngine } from '@/lib/study-plan-engine'
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
  credentials: { email: string; password: string; fullName: string },
  step1: OnboardingStep1Data,
  step2: OnboardingStep2Data,
  analysis: OnboardingAnalysis,
  recs: AIOnboardingRec | null,
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  const supabase = await createClient()

  // 1. Create the account
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: { full_name: credentials.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/auth/confirm`,
    },
  })
  if (signUpError) return { error: signUpError.message }
  if (!data.session) return { needsConfirmation: true }

  const user = data.user!
  const hoursPerWeek = Math.round((step1.dailyStudyMinutes * 7) / 60)
  const today = new Date().toISOString().split('T')[0]

  // 2. Update user profile
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
    const { error: sessErr } = await (supabase.from('question_sessions') as any).insert(sessions)
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

  // 6. Welcome notification (non-fatal)
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: '🎉 Welcome to SaturnPath!',
    message: `Your study plan is ready. You have ${analysis.studyDays} days to reach ${step1.targetScore}. Let's get started!`,
    type: 'system',
    is_read: false,
  })

  runAdaptiveReplanner(supabase, user.id, 'question_session').catch(() => { /* non-fatal */ })

  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/calendar')
  return {}
}


// ─── Guest Onboarding (anonymous sign-in + save) ──────────────────────────────

export async function guestOnboarding(
  step1: OnboardingStep1Data,
  step2: OnboardingStep2Data,
  analysis: OnboardingAnalysis,
  recs: AIOnboardingRec | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error: anonError } = await supabase.auth.signInAnonymously()
  if (anonError) return { error: anonError.message }

  return saveOnboarding(step1, step2, analysis, recs)
}
