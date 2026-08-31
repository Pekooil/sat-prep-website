export type V2FeatureFlags = {
  practiceEnabled: boolean
  scratchAnalysisEnabled: boolean
  pushNotificationsEnabled: boolean
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase()
  if (value === undefined || value === '') return fallback
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  return fallback
}

/**
 * Server-side kill switches. V2 remains disabled until the staging/production
 * rollout explicitly enables it; these values are never read from the client.
 */
export function getV2FeatureFlags(): V2FeatureFlags {
  return {
    practiceEnabled: booleanEnv('V2_PRACTICE_ENABLED', false),
    scratchAnalysisEnabled: booleanEnv('V2_SCRATCH_ANALYSIS_ENABLED', false),
    pushNotificationsEnabled: booleanEnv('V2_PUSH_NOTIFICATIONS_ENABLED', false),
  }
}
