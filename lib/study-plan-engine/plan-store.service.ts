// ─────────────────────────────────────────────────────────────────────────────
// PlanStoreService
// Persists a generated schedule to study_plans + calendar_tasks.
//
// Strategy:
//  1. Insert one study_plans row that acts as the plan envelope.
//  2. Batch-insert calendar_tasks — one row per StudyBlock / ReviewBlock /
//     PracticeTestBlock.  Rest days produce no tasks.
//  3. Use a single batched insert for performance (vs. N individual inserts).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  DaySchedule,
  PhaseSummary,
  PracticeTestBlock,
  RankedDomain,
  ReviewBlock,
  StudyBlock,
  StudyPlanEngineInput,
  StudyPlanEngineResult,
} from './types'

// ─── Internal Task Row Builder ────────────────────────────────────────────────

type TaskInsertRow = Database['public']['Tables']['calendar_tasks']['Insert']

function studyBlockToTask(
  day: DaySchedule,
  block: StudyBlock,
  userId: string,
  planId: string,
): TaskInsertRow {
  const subject = block.subject

  return {
    user_id:       userId,
    study_plan_id: planId,
    title:         `${block.domainLabel} — ${capitalize(block.difficulty)} · ${block.questionCount}q`,
    description:   block.description,
    task_date:     day.date,
    duration_minutes: block.durationMinutes,
    subject,
    category:      block.domainLabel,
    is_completed:  false,
    replan_locked: false,
    priority_score:         block.priorityScore,
    mastery_target:         block.masteryTarget,
    estimated_score_impact: block.estimatedScoreImpact,
    replanning_weight:      block.replanningWeight,
    college_board_filters: {
      domain:     block.cbFilters.domain,
      skill:      block.cbFilters.skill,
      difficulty: block.cbFilters.difficulty,
    },
  }
}

function reviewBlockToTask(
  day: DaySchedule,
  block: ReviewBlock,
  userId: string,
  planId: string,
): TaskInsertRow {
  return {
    user_id:       userId,
    study_plan_id: planId,
    title:         `Review — ${block.domainLabel} · ${block.questionCount}q`,
    description:   block.description,
    task_date:     day.date,
    duration_minutes: block.durationMinutes,
    subject:       block.subject,
    category:      block.domainLabel,
    is_completed:  false,
    replan_locked: false,
    priority_score:         block.priorityScore,
    mastery_target:         block.masteryTarget,
    estimated_score_impact: block.estimatedScoreImpact,
    replanning_weight:      block.replanningWeight,
    college_board_filters: {
      domain:     block.cbFilters.domain,
      skill:      block.cbFilters.skill,
      difficulty: block.cbFilters.difficulty,
    },
  }
}

function practiceTestToTask(
  day: DaySchedule,
  block: PracticeTestBlock,
  userId: string,
  planId: string,
): TaskInsertRow {
  return {
    user_id:       userId,
    study_plan_id: planId,
    title:         `Full Practice Test #${block.testNumber}`,
    description:   block.description,
    task_date:     day.date,
    duration_minutes: block.durationMinutes,
    subject:       'both',
    category:      'Full Practice Test',
    is_completed:  false,
    replan_locked: false,
    priority_score:         block.priorityScore,
    mastery_target:         block.masteryTarget,
    estimated_score_impact: block.estimatedScoreImpact,
    replanning_weight:      block.replanningWeight,
    college_board_filters: {
      domain:     'Full-Length Practice Test',
      skill:      'Complete test simulation (Bluebook)',
      difficulty: 'hard',
    },
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── PlanStoreService ─────────────────────────────────────────────────────────

export class PlanStoreService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  /**
   * Persist the full generated schedule.
   * Returns the plan ID and a summary of what was written.
   */
  async save(
    input: StudyPlanEngineInput,
    schedule: DaySchedule[],
    ranked: RankedDomain[],
    phases: PhaseSummary[],
    practiceTestCount: number,
  ): Promise<StudyPlanEngineResult & { error?: string }> {
    const totalDays        = schedule.length
    const studyDays        = schedule.filter(d => d.dayType === 'study').length
    const reviewDays       = schedule.filter(d => d.dayType === 'review').length
    const practiceTestDays = schedule.filter(d => d.dayType === 'practice_test').length
    const restDays         = schedule.filter(d => d.dayType === 'rest').length

    const title = this.buildPlanTitle(input, studyDays, practiceTestCount)

    // ── 1. Deactivate existing active plans ─────────────────────────────────
    await this.supabase
      .from('study_plans')
      .update({ is_active: false })
      .eq('user_id', input.userId)
      .eq('is_active', true)

    // ── 1b. Delete all unlogged tasks (not completed, not locked) ───────────
    // Completed tasks (is_completed=true) and manually locked tasks
    // (replan_locked=true) are preserved as the user's permanent record.
    await this.supabase
      .from('calendar_tasks')
      .delete()
      .eq('user_id', input.userId)
      .eq('is_completed', false)
      .eq('replan_locked', false)

    // ── 2. Insert study_plans row ────────────────────────────────────────────
    const planMeta = {
      totalDays, studyDays, reviewDays, practiceTestDays, restDays,
      phases,
      topPriorityDomains: ranked.slice(0, 4).map(r => ({
        label:          r.entry.label,
        currentAccuracy: r.currentAccuracy,
        targetAccuracy:  r.targetAccuracy,
        potentialPoints: r.potentialPoints,
      })),
      generatedAt: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plan, error: planErr } = await (this.supabase.from('study_plans') as any)
      .insert({
        user_id:     input.userId,
        title,
        description: this.buildDescription(input, ranked, phases),
        start_date:  schedule[0]?.date ?? new Date().toISOString().split('T')[0],
        end_date:    input.testDate,
        is_active:   true,
        ai_generated: false,
        plan_data:   planMeta,
      })
      .select('id')
      .single()

    if (planErr) return { ...this.emptyResult(), error: planErr.message }

    const planId = plan.id as string

    // ── 3. Build task rows from all non-rest days ────────────────────────────
    const tasks: TaskInsertRow[] = []

    for (const day of schedule) {
      if (day.dayType === 'rest' || day.blocks.length === 0) continue

      for (const block of day.blocks) {
        if (this.isStudyBlock(block, day.dayType)) {
          tasks.push(studyBlockToTask(day, block as StudyBlock, input.userId, planId))
        } else if (day.dayType === 'review') {
          tasks.push(reviewBlockToTask(day, block as ReviewBlock, input.userId, planId))
        } else if (day.dayType === 'practice_test') {
          tasks.push(practiceTestToTask(day, block as PracticeTestBlock, input.userId, planId))
        }
      }
    }

    // ── 4. Batch insert in chunks of 200 (Supabase row limit) ──────────────
    const CHUNK = 200
    let insertedCount = 0

    for (let i = 0; i < tasks.length; i += CHUNK) {
      const chunk = tasks.slice(i, i + CHUNK)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: taskErr } = await (this.supabase.from('calendar_tasks') as any).insert(chunk)
      if (taskErr) return { ...this.emptyResult(), error: taskErr.message }
      insertedCount += chunk.length
    }

    return {
      planId,
      title,
      totalCalendarDays: totalDays,
      studyDays,
      reviewDays,
      practiceTestDays,
      restDays,
      totalTasksCreated: insertedCount,
      phases,
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private isStudyBlock(block: unknown, dayType: string): boolean {
    return dayType === 'study'
  }

  private buildPlanTitle(
    input: StudyPlanEngineInput,
    studyDays: number,
    testCount: number,
  ): string {
    const totalWeeks = Math.ceil(
      (new Date(input.testDate).getTime() - Date.now()) / (7 * 86_400_000)
    )
    return `${totalWeeks}-Week SAT Study Plan — Target ${input.targetScore} (${testCount} Practice Test${testCount !== 1 ? 's' : ''})`
  }

  private buildDescription(
    input: StudyPlanEngineInput,
    ranked: RankedDomain[],
    phases: PhaseSummary[],
  ): string {
    const top2 = ranked.slice(0, 2).map(r => r.entry.label).join(' and ')
    const phaseNames = phases.map(p => p.label).join(' → ')
    return (
      `Prioritizes ${top2} for maximum score gain. ` +
      `Phases: ${phaseNames}. ` +
      `${input.dailyStudyMinutes} min/day, progressing from Easy to Hard over the plan.`
    )
  }

  private emptyResult(): Omit<StudyPlanEngineResult, 'error'> {
    return {
      planId: '', title: '', totalCalendarDays: 0,
      studyDays: 0, reviewDays: 0, practiceTestDays: 0, restDays: 0,
      totalTasksCreated: 0, phases: [],
    }
  }
}
