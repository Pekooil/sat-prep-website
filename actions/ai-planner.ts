'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generatePlanFromForm } from '@/actions/study-plan'
import { CONST_VALUE_TO_KEY } from '@/lib/study-plan-engine/domain-catalog'
import type { AIPlanRequest, AIStudyPlan } from '@/types'
import type { StudyPlanEngineResult } from '@/lib/study-plan-engine/types'

/**
 * generateAIStudyPlan
 *
 * Server action called from AIPlannerTrigger.
 * Converts the legacy AIPlanRequest shape into StudyPlanEngine inputs and
 * delegates to generatePlanFromForm, which runs the full day-by-day engine.
 *
 * Returns StudyPlanEngineResult (not AIStudyPlan) — the trigger component
 * only checks result.data truthiness so this is backward-compatible.
 */
export async function generateAIStudyPlan(
  request: AIPlanRequest,
): Promise<{ data?: StudyPlanEngineResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Convert hours/week → minutes/day
  const dailyStudyMinutes = Math.max(15, Math.round((request.hoursPerWeek * 60) / 7))

  // Map constant-style weak area values ("algebra", "craft_structure") → domain keys
  const weakAreaKeys = (request.weakAreas ?? [])
    .map(v => CONST_VALUE_TO_KEY[v] ?? v)
    .filter(k => k.length > 0)

  return generatePlanFromForm({
    currentScore: request.currentScore ?? 1050,
    targetScore: request.targetScore,
    testDate: request.testDate,
    dailyStudyMinutes,
    weakAreaKeys,
  })
}
