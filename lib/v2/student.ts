import type { SupabaseClient } from '@supabase/supabase-js'
import { createV2AdminClient } from './db'
import { ApiError } from './api/errors'

type V2ProfileRow = {
  user_id: string
  full_name: string | null
  current_score: number | null
  target_score: number | null
  test_date: string | null
  onboarding_complete: boolean
  scratch_analysis_enabled: boolean
  timing_accommodation_multiplier: number
}

type DailyRecommendationRow = {
  id: string
  recommendation_date: string
  total_minutes: number
  new_minutes: number
  review_minutes: number
  minutes_saved: number
}

function databaseFailure(error: { message?: string; code?: string } | null, fallback: string): never {
  const message = error?.message ?? ''
  if (/relation .*v2_|function .*v2_|schema .*v2_/i.test(message)) {
    throw ApiError.featureDisabled('V2 data is not configured in this environment yet')
  }
  const knownCode = message.match(/(?:P0001|[a-z_]+):?\s*([a-z_]+)/i)?.[1]?.toLowerCase()
  const details: Record<string, [string, string]> = {
    recommendation_not_found: ['NOT_FOUND', 'That daily recommendation is no longer available'],
    question_pool_empty: ['FEATURE_DISABLED', 'Practice is waiting for approved questions to be published'],
    session_not_found: ['NOT_FOUND', 'That practice session could not be found'],
    session_not_active: ['CONFLICT', 'That practice session is no longer active'],
    question_not_assigned: ['CONFLICT', 'That question is no longer assigned to this session'],
    question_unavailable: ['FEATURE_DISABLED', 'That question is no longer available'],
    answer_invalid: ['VALIDATION_ERROR', 'Choose an answer before submitting'],
    attempt_not_found: ['NOT_FOUND', 'That attempt could not be found'],
    classification_conflict: ['CONFLICT', 'That attempt was already classified'],
    classification_detail_required: ['VALIDATION_ERROR', 'Add a short detail when choosing Other'],
    classification_detail_not_allowed: ['VALIDATION_ERROR', 'A detail is only allowed for Other'],
    classification_detail_too_long: ['VALIDATION_ERROR', 'Keep the Other detail under 120 characters'],
    review_item_not_found: ['NOT_FOUND', 'That review item could not be found'],
    review_action_conflict: ['CONFLICT', 'That review action was already used'],
    review_action_invalid: ['VALIDATION_ERROR', 'That review action is not supported'],
  }
  if (knownCode && details[knownCode]) {
    const [apiCode, apiMessage] = details[knownCode]
    if (apiCode === 'NOT_FOUND') throw ApiError.notFound(apiMessage)
    if (apiCode === 'CONFLICT') throw ApiError.conflict(apiMessage)
    if (apiCode === 'VALIDATION_ERROR') throw ApiError.validation(apiMessage)
    throw ApiError.featureDisabled(apiMessage)
  }
  throw new Error(`${fallback}: ${message || error?.code || 'unknown database error'}`)
}

function profileResponse(row: V2ProfileRow) {
  return {
    id: row.user_id,
    fullName: row.full_name,
    currentScore: row.current_score,
    targetScore: row.target_score,
    testDate: row.test_date,
    onboardingComplete: row.onboarding_complete,
    scratchAnalysisEnabled: row.scratch_analysis_enabled,
    timingAccommodationMultiplier: row.timing_accommodation_multiplier,
  }
}

export async function ensureV2Profile(userId: string, client = createV2AdminClient()) {
  const existing = await client
    .from('v2_profiles')
    .select('user_id, full_name, current_score, target_score, test_date, onboarding_complete, scratch_analysis_enabled, timing_accommodation_multiplier')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing.error) databaseFailure(existing.error, 'V2 profile query failed')
  if (existing.data) return existing.data as V2ProfileRow

  const legacy = await client
    .from('users')
    .select('full_name, current_score, target_score, test_date, has_completed_onboarding')
    .eq('id', userId)
    .maybeSingle()
  // Isolated V2 staging deliberately has no legacy public.users table. A new
  // staging auth user should receive an empty V2 profile instead of failing
  // while we attempt a best-effort V1 import.
  const legacyTableMissing = legacy.error && (
    legacy.error.code === '42P01' ||
    legacy.error.code === 'PGRST205' ||
    /schema cache|relation .* does not exist/i.test(legacy.error.message ?? '')
  )
  if (legacy.error && !legacyTableMissing) databaseFailure(legacy.error, 'V1 profile import failed')

  const inserted = await client
    .from('v2_profiles')
    .insert({
      user_id: userId,
      full_name: legacy.data?.full_name ?? null,
      current_score: legacy.data?.current_score ?? null,
      target_score: legacy.data?.target_score ?? null,
      test_date: legacy.data?.test_date ?? null,
      onboarding_complete: legacy.data?.has_completed_onboarding ?? false,
      imported_from_v1_at: legacy.data ? new Date().toISOString() : null,
    })
    .select('user_id, full_name, current_score, target_score, test_date, onboarding_complete, scratch_analysis_enabled, timing_accommodation_multiplier')
    .single()
  if (inserted.error) databaseFailure(inserted.error, 'V2 profile creation failed')
  return inserted.data as V2ProfileRow
}

async function ensureDailyRecommendation(userId: string, profile: V2ProfileRow, client: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10)
  const existing = await client
    .from('v2_daily_recommendations')
    .select('id, recommendation_date, total_minutes, new_minutes, review_minutes, minutes_saved')
    .eq('user_id', userId)
    .eq('recommendation_date', today)
    .maybeSingle()
  if (existing.error) databaseFailure(existing.error, 'Daily recommendation query failed')
  if (existing.data) return existing.data as DailyRecommendationRow

  const totalMinutes = 10
  const created = await client
    .from('v2_daily_recommendations')
    .upsert({
      user_id: userId,
      recommendation_date: today,
      total_minutes: totalMinutes,
      new_minutes: totalMinutes,
      review_minutes: 0,
      math_minutes: Math.ceil(totalMinutes / 2),
      reading_writing_minutes: Math.floor(totalMinutes / 2),
      input_snapshot: {
        currentScore: profile.current_score,
        targetScore: profile.target_score,
        source: 'v2-web-default',
      },
      algorithm_version: 'daily-default.v1',
    }, { onConflict: 'user_id,recommendation_date' })
    .select('id, recommendation_date, total_minutes, new_minutes, review_minutes, minutes_saved')
    .single()
  if (created.error) databaseFailure(created.error, 'Daily recommendation creation failed')
  return created.data as DailyRecommendationRow
}

function recommendationResponse(row: DailyRecommendationRow) {
  return {
    id: row.id,
    date: row.recommendation_date,
    totalMinutes: row.total_minutes,
    newMinutes: row.new_minutes,
    reviewMinutes: row.review_minutes,
    whySelected: ['A short focused session sized for today'],
  }
}

export async function getHome(userId: string) {
  const client = createV2AdminClient()
  const profile = await ensureV2Profile(userId, client)
  const recommendation = await ensureDailyRecommendation(userId, profile, client)
  const [attempts, recommendations] = await Promise.all([
    client.from('v2_attempts').select('is_correct').eq('user_id', userId),
    client.from('v2_daily_recommendations').select('minutes_saved').eq('user_id', userId),
  ])
  if (attempts.error) databaseFailure(attempts.error, 'Practice history query failed')
  if (recommendations.error) databaseFailure(recommendations.error, 'Recommendation history query failed')

  const attempted = attempts.data?.length ?? 0
  const correct = attempts.data?.filter((attempt) => attempt.is_correct).length ?? 0
  const minutesSaved = recommendations.data?.reduce((sum, row) => sum + (row.minutes_saved ?? 0), 0) ?? 0
  const targetScore = profile.target_score ?? 1600
  const estimate = profile.current_score
    ? Math.min(targetScore, profile.current_score + Math.round((correct / Math.max(attempted, 1)) * 20))
    : null

  return {
    scoreEstimate: estimate,
    scoreEstimateLow: estimate === null ? null : Math.max(400, estimate - 30),
    scoreEstimateHigh: estimate === null ? null : Math.min(1600, estimate + 30),
    targetScore,
    testDate: profile.test_date,
    minutesSaved,
    rings: [
      { id: 'score_growth', label: 'Score growth', completedValue: correct, targetValue: Math.max(attempted, 1), progress: attempted ? correct / attempted : 0, unit: 'correct' },
      { id: 'weakness_removed', label: 'Weakness removed', completedValue: 0, targetValue: 1, progress: 0, unit: 'skill' },
      { id: 'time_saved', label: 'Time saved', completedValue: minutesSaved, targetValue: Math.max(recommendation.total_minutes, 1), progress: Math.min(1, minutesSaved / Math.max(recommendation.total_minutes, 1)), unit: 'min' },
    ],
    recommendation: recommendationResponse(recommendation),
  }
}

export async function getProgress(userId: string) {
  const client = createV2AdminClient()
  const [skills, profile, recommendations, reviews] = await Promise.all([
    client.from('v2_user_skill_state').select('section, domain_key, subskill_key, mastery_estimate, confidence, lifetime_attempts, due_at').eq('user_id', userId).order('mastery_estimate'),
    ensureV2Profile(userId, client),
    client.from('v2_daily_recommendations').select('minutes_saved').eq('user_id', userId),
    client.from('v2_review_items').select('id, state').eq('user_id', userId).eq('state', 'resolved'),
  ])
  if (skills.error) databaseFailure(skills.error, 'Skill progress query failed')
  if (recommendations.error) databaseFailure(recommendations.error, 'Recommendation history query failed')
  if (reviews.error) databaseFailure(reviews.error, 'Review progress query failed')
  return {
    scoreEstimate: profile.current_score,
    scoreEstimateLow: profile.current_score === null ? null : Math.max(400, profile.current_score - 30),
    scoreEstimateHigh: profile.current_score === null ? null : Math.min(1600, profile.current_score + 30),
    minutesSaved: recommendations.data?.reduce((sum, row) => sum + (row.minutes_saved ?? 0), 0) ?? 0,
    resolvedErrors: reviews.data?.length ?? 0,
    skills: (skills.data ?? []).map((skill) => ({
      section: skill.section,
      domainKey: skill.domain_key,
      subskillKey: skill.subskill_key,
      mastery: skill.mastery_estimate,
      confidence: skill.confidence,
      attempts: skill.lifetime_attempts,
      dueAt: skill.due_at,
    })),
  }
}

export async function getReviewItems(userId: string, state: string | null) {
  const client = createV2AdminClient()
  const result = await client.rpc('v2_list_review_items', { p_user_id: userId, p_state: state })
  if (result.error) databaseFailure(result.error, 'Review query failed')
  return result.data ?? []
}

export async function updateProfile(userId: string, values: Record<string, unknown>) {
  const client = createV2AdminClient()
  const profile = await ensureV2Profile(userId, client)
  const columns: Record<string, unknown> = {}
  if (typeof values.fullName === 'string') columns.full_name = values.fullName.trim()
  if (typeof values.currentScore === 'number') columns.current_score = values.currentScore
  if (typeof values.targetScore === 'number') columns.target_score = values.targetScore
  if (typeof values.testDate === 'string') columns.test_date = values.testDate
  if (typeof values.scratchAnalysisEnabled === 'boolean') columns.scratch_analysis_enabled = values.scratchAnalysisEnabled
  if (typeof values.timingAccommodationMultiplier === 'number') columns.timing_accommodation_multiplier = values.timingAccommodationMultiplier
  const completesOnboarding =
    typeof (columns.full_name ?? profile.full_name) === 'string' &&
    Boolean(columns.full_name ?? profile.full_name) &&
    typeof (columns.current_score ?? profile.current_score) === 'number' &&
    typeof (columns.target_score ?? profile.target_score) === 'number' &&
    typeof (columns.test_date ?? profile.test_date) === 'string' &&
    Boolean(columns.test_date ?? profile.test_date)
  if (completesOnboarding) columns.onboarding_complete = true
  if (Object.keys(columns).length === 0) throw ApiError.validation('Provide at least one supported profile field')
  const result = await client.from('v2_profiles').update(columns).eq('user_id', userId).select('user_id, full_name, current_score, target_score, test_date, onboarding_complete, scratch_analysis_enabled, timing_accommodation_multiplier').single()
  if (result.error) databaseFailure(result.error, 'Profile update failed')
  return profileResponse((result.data ?? profile) as V2ProfileRow)
}

export async function startSession(userId: string, recommendationId: string | null, resumeIfAvailable: boolean, clientVersion: string, idempotencyKey: string) {
  const client = createV2AdminClient()
  const result = await client.rpc('v2_start_or_resume_session', {
    p_user_id: userId,
    p_daily_recommendation_id: recommendationId,
    p_resume_if_available: resumeIfAvailable,
    p_client_version: clientVersion,
    p_idempotency_key: idempotencyKey,
  })
  if (result.error) databaseFailure(result.error, 'Practice session start failed')
  const session = result.data as Record<string, unknown>
  return {
    id: session.id,
    state: session.state,
    recommendedMinutes: session.recommended_minutes,
    actualMinutes: session.actual_minutes,
    currentMicroSet: session.current_micro_set,
    startedAt: session.started_at,
    endedAt: session.ended_at ?? null,
  }
}

export async function nextQuestion(userId: string, sessionId: string) {
  const result = await createV2AdminClient().rpc('v2_get_next_question', { p_user_id: userId, p_session_id: sessionId })
  if (result.error) databaseFailure(result.error, 'Next question query failed')
  return result.data
}

export async function submitAttempt(userId: string, values: Record<string, unknown>, idempotencyKey: string) {
  const result = await createV2AdminClient().rpc('v2_submit_attempt', {
    p_user_id: userId,
    p_session_id: values.sessionId,
    p_question_id: values.questionId,
    p_version_id: values.versionId,
    p_selected_answer: values.selectedAnswer,
    p_client_response_seconds: values.clientResponseSeconds,
    p_answer_change_count: values.answerChangeCount,
    p_hint_used: values.hintUsed ?? false,
    p_events: values.events ?? [],
    p_scratch_summary: values.scratchSummary ?? null,
    p_idempotency_key: idempotencyKey,
  })
  if (result.error) databaseFailure(result.error, 'Answer submission failed')
  const response = result.data as Record<string, unknown>
  const attempt = (response.attempt ?? {}) as Record<string, unknown>
  const actualSeconds = Number(attempt.server_response_seconds ?? 0)
  const targetSeconds = Math.max(1, Number(attempt.expected_seconds ?? 1))
  const ratio = actualSeconds / targetSeconds
  return {
    attemptId: attempt.id,
    outcome: attempt.is_correct ? 'correct' : 'incorrect',
    correctAnswer: response.correctAnswer,
    explanation: response.explanation,
    pacing: {
      actualSeconds,
      targetSeconds,
      ratio,
      status: ratio < 0.9 ? 'faster' : ratio > 1.1 ? 'slower' : 'on_target',
    },
    pathChange: attempt.path_delta_snapshot ?? {
      beforeLabel: 'Current route', afterLabel: 'Route confirmed', impactMinutes: 0,
      impactQuestions: 0, impactDirection: 'unchanged', visualKind: 'no_change',
    },
    scratchSignal: null,
    reviewItemId: attempt.review_item_id ?? null,
    nextAction: response.nextAction,
  }
}

export async function classifyAttempt(userId: string, attemptId: string, classification: string, detail: string | null, idempotencyKey: string) {
  const result = await createV2AdminClient().rpc('v2_classify_attempt_v2', {
    p_user_id: userId,
    p_attempt_id: attemptId,
    p_classification: classification,
    p_detail: detail,
    p_idempotency_key: idempotencyKey,
  })
  if (result.error) databaseFailure(result.error, 'Attempt classification failed')
  const attempt = result.data as Record<string, unknown>
  return {
    attemptId: attempt.id,
    classification: attempt.mistake_classification,
    classifiedAt: attempt.classified_at,
  }
}

export async function endSession(userId: string, sessionId: string, reason: string, idempotencyKey: string) {
  const result = await createV2AdminClient().rpc('v2_end_session', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  })
  if (result.error) databaseFailure(result.error, 'Practice session end failed')
  return result.data
}

export async function actOnReviewItem(userId: string, reviewItemId: string, action: string, idempotencyKey: string) {
  const result = await createV2AdminClient().rpc('v2_act_on_review_item', {
    p_user_id: userId,
    p_review_item_id: reviewItemId,
    p_action: action,
    p_idempotency_key: idempotencyKey,
  })
  if (result.error) databaseFailure(result.error, 'Review action failed')
  return result.data
}
