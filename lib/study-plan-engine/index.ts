// ─────────────────────────────────────────────────────────────────────────────
// StudyPlanEngine — Main Orchestrator
//
// Single entry point for generating and persisting a complete study schedule.
// Pipeline:
//   StudyPlanEngineInput
//     → ScoringService.rankDomains()     (priority-ordered domain list)
//     → SchedulerService.buildSchedule() (day-by-day DaySchedule[])
//     → PlanStoreService.save()          (study_plans + calendar_tasks rows)
//     → StudyPlanEngineResult
//
// Usage:
//   const engine = new StudyPlanEngine(supabaseClient)
//   const result = await engine.generate(input)
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { rankDomains } from './scoring.service'
import { buildSchedule } from './scheduler.service'
import { PlanStoreService } from './plan-store.service'
import type { StudyPlanEngineInput, StudyPlanEngineResult } from './types'

const EMPTY_RESULT: Omit<StudyPlanEngineResult, 'planId' | 'title'> = {
  totalCalendarDays: 0,
  studyDays: 0,
  reviewDays: 0,
  practiceTestDays: 0,
  restDays: 0,
  totalTasksCreated: 0,
  phases: [],
}

export class StudyPlanEngine {
  private readonly store: PlanStoreService

  constructor(supabase: SupabaseClient<Database>) {
    this.store = new PlanStoreService(supabase)
  }

  async generate(
    input: StudyPlanEngineInput,
  ): Promise<StudyPlanEngineResult & { error?: string }> {
    // ── Validate ──────────────────────────────────────────────────────────────
    if (input.targetScore <= input.currentScore) {
      return { planId: '', title: '', ...EMPTY_RESULT, error: 'Target score must be greater than current score.' }
    }

    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const testMidnight = new Date(input.testDate)
    testMidnight.setHours(0, 0, 0, 0)

    if (testMidnight <= todayMidnight) {
      return { planId: '', title: '', ...EMPTY_RESULT, error: 'Test date must be in the future.' }
    }

    if (input.dailyStudyMinutes < 15 || input.dailyStudyMinutes > 300) {
      return { planId: '', title: '', ...EMPTY_RESULT, error: 'Daily study time must be between 15 and 300 minutes.' }
    }

    // ── Step 1: Rank all 8 domains by priority score ───────────────────────
    // Weak areas (low accuracy) and high-leverage domains sort to the top.
    // Domains with no performance data get a neutral 50% accuracy.
    const ranked = rankDomains(input.topicPerformance ?? [], input.targetScore)

    // ── Step 2: Build day-by-day schedule ─────────────────────────────────
    // Assigns DayType per calendar day:
    //   Mon–Fri → study (one priority domain each)
    //   Saturday → review OR practice test (every N weeks)
    //   Sunday  → rest
    // Difficulty increases each phase: foundation → skill → advanced → strategy
    const { schedule, phases, practiceTestCount } = buildSchedule(input, ranked)

    // ── Step 3: Persist to study_plans + calendar_tasks ───────────────────
    // Deactivates any existing active plan for the user first.
    return this.store.save(input, schedule, ranked, phases, practiceTestCount)
  }
}

// Re-export types so callers can import from a single path
export type { StudyPlanEngineInput, StudyPlanEngineResult, TopicPerformance } from './types'
