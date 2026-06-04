'use server'

import { generatePlanFromForm } from '@/actions/study-plan'
import { createClient } from '@/lib/supabase/server'
import type { StudyPlanEngineResult } from '@/lib/study-plan-engine/types'

/**
 * generateAIStudyPlan
 *
 * Server action called from AIPlannerTrigger (now "AI Adaptive Replanner").
 * Domain priorities are sourced entirely from the user's question_sessions
 * data — no manual weak-area input is required.
 *
 * hoursPerDay is converted to dailyStudyMinutes.
 * daySchedule maps JS getDay() (0=Sun … 6=Sat) → 'study' | 'review' | 'rest'.
 */
export async function generateAIStudyPlan(request: {
  currentScore: number
  targetScore: number
  testDate: string
  minutesPerDay: number
  daySchedule: Record<number, 'study' | 'review' | 'rest'>
}): Promise<{ data?: StudyPlanEngineResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const dailyStudyMinutes = Math.max(15, Math.min(300, Math.round(request.minutesPerDay)))

  return generatePlanFromForm({
    currentScore:      request.currentScore,
    targetScore:       request.targetScore,
    testDate:          request.testDate,
    dailyStudyMinutes,
    daySchedule:       request.daySchedule,
  })
}
