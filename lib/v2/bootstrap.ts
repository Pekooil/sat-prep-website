import { createV2AdminClient } from './db'
import { getV2FeatureFlags } from './config/feature-flags'

type ProfileRow = {
  user_id: string
  full_name: string | null
  current_score: number | null
  target_score: number | null
  test_date: string | null
  onboarding_complete: boolean
  scratch_analysis_enabled: boolean
  timing_accommodation_multiplier: number
}

type RecommendationRow = {
  id: string
  recommendation_date: string
  total_minutes: number
  new_minutes: number
  review_minutes: number
}

type SessionRow = {
  id: string
  state: 'active' | 'paused' | 'completed' | 'abandoned'
  recommended_minutes: number
  actual_minutes: number
  current_micro_set: number
  started_at: string
  ended_at: string | null
}

function profileResponse(userId: string, row: ProfileRow | null) {
  return {
    id: userId,
    fullName: row?.full_name ?? null,
    currentScore: row?.current_score ?? null,
    targetScore: row?.target_score ?? null,
    testDate: row?.test_date ?? null,
    onboardingComplete: row?.onboarding_complete ?? false,
    scratchAnalysisEnabled: row?.scratch_analysis_enabled ?? false,
    timingAccommodationMultiplier: row?.timing_accommodation_multiplier ?? 1,
  }
}

export async function getBootstrap(userId: string) {
  const supabase = createV2AdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [profileResult, recommendationResult, sessionResult] = await Promise.all([
    supabase
      .from('v2_profiles')
      .select('user_id, full_name, current_score, target_score, test_date, onboarding_complete, scratch_analysis_enabled, timing_accommodation_multiplier')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('v2_daily_recommendations')
      .select('id, recommendation_date, total_minutes, new_minutes, review_minutes')
      .eq('user_id', userId)
      .eq('recommendation_date', today)
      .maybeSingle(),
    supabase
      .from('v2_practice_sessions')
      .select('id, state, recommended_minutes, actual_minutes, current_micro_set, started_at, ended_at')
      .eq('user_id', userId)
      .in('state', ['active', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const databaseError = profileResult.error ?? recommendationResult.error ?? sessionResult.error
  if (databaseError) throw new Error(`V2 bootstrap query failed: ${databaseError.message}`)

  const profile = profileResponse(userId, profileResult.data as ProfileRow | null)
  const recommendation = recommendationResult.data as RecommendationRow | null
  const session = sessionResult.data as SessionRow | null

  return {
    profile,
    featureFlags: getV2FeatureFlags(),
    recommendation: recommendation
      ? {
          id: recommendation.id,
          date: recommendation.recommendation_date,
          totalMinutes: recommendation.total_minutes,
          newMinutes: recommendation.new_minutes,
          reviewMinutes: recommendation.review_minutes,
          whySelected: ['Based on your latest practice signals'],
        }
      : null,
    resumableSession: session
      ? {
          id: session.id,
          state: session.state,
          recommendedMinutes: session.recommended_minutes,
          actualMinutes: session.actual_minutes,
          currentMicroSet: session.current_micro_set,
          startedAt: session.started_at,
          endedAt: session.ended_at,
        }
      : null,
  }
}

