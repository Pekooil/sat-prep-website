'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/sat-planner'
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

  // 2. Diagnostic test entry
  const { error: diagErr } = await supabase.from('diagnostic_tests').insert({
    user_id: user.id,
    test_date: today,
    math_score: estimateSectionScore(step2, 'math'),
    reading_writing_score: estimateSectionScore(step2, 'reading_writing'),
    notes: 'Initial diagnostic from onboarding',
  })

  if (diagErr) return { error: diagErr.message }

  // 3. Question sessions per domain (only domains with data)
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

  // 4. Study plan (from deterministic recs, or generate fresh ones)
  const planRecs = recs ?? generateRecommendations(
    {
      currentScore: step1.currentScore,
      targetScore: step1.targetScore,
      testDate: step1.testDate,
      dailyStudyMinutes: step1.dailyStudyMinutes,
    },
    analysis,
  )

  await supabase.from('study_plans').insert({
    user_id: user.id,
    title: `${analysis.studyDays}-Day SAT Study Plan`,
    description: planRecs.weeklyPlanSummary,
    start_date: today,
    end_date: step1.testDate,
    is_active: true,
    ai_generated: false,
    plan_data: { recs: planRecs, analysis, generatedAt: new Date().toISOString() },
  })

  // 5. Baseline score history
  const mathEstimate = Math.round(step1.currentScore * 0.5)
  await supabase.from('score_history').insert({
    user_id: user.id,
    test_type: 'diagnostic',
    test_date: today,
    math_score: mathEstimate,
    reading_writing_score: step1.currentScore - mathEstimate,
    notes: 'Baseline score from onboarding',
  })

  // 6. Welcome notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: '🎉 Welcome to SAT Study Planner!',
    message: `Your study plan is ready. You have ${analysis.studyDays} days to reach ${step1.targetScore}. Let's get started!`,
    type: 'system',
    is_read: false,
  })

  revalidatePath('/home')
  revalidatePath('/data')
  revalidatePath('/calendar')
  return {}
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function estimateSectionScore(step2: OnboardingStep2Data, section: 'math' | 'reading_writing'): number {
  const cats = section === 'math'
    ? Object.values(step2.math)
    : Object.values(step2.reading_writing)

  const totAttempted = cats.reduce((s, c) => s + c.attempted, 0)
  const totCorrect   = cats.reduce((s, c) => s + c.correct, 0)
  if (totAttempted === 0) return 550

  const accuracy = totCorrect / totAttempted
  return Math.round(200 + accuracy * 600)
}
