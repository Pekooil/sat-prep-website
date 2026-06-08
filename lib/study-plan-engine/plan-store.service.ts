// ─────────────────────────────────────────────────────────────────────────────
// PlanStoreService
// Persists a generated schedule to study_plans + calendar_tasks.
//
// Strategy:
//  1. Insert one study_plans row that acts as the plan envelope.
//  2. Batch-insert calendar_tasks — one row per StudyBlock / ReviewBlock /
//     PracticeTestBlock.  Rest days produce no tasks.
//  3. Use a single batched insert for performance (vs. N individual inserts).
//  4. Before inserting, load question_inventory limits and cap question counts
//     so the plan never assigns more questions than are available in the QB.
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

    // ── 3a. Load inventory limits (non-blocking — plan proceeds even if empty) ─
    const inventoryLimits = await this.loadInventoryLimits()
    // Track cumulative question allocations within this plan: key → count used
    const inventoryUsed = new Map<string, number>()

    // ── 3b. Build task rows from all non-rest days ──────────────────────────
    const tasks: TaskInsertRow[] = []
    const nearlyExhausted: string[] = []

    for (const day of schedule) {
      if (day.dayType === 'rest' || day.blocks.length === 0) continue

      for (const block of day.blocks) {
        if (this.isStudyBlock(block, day.dayType)) {
          const studyBlock = block as StudyBlock
          const cappedBlock = this.applyInventoryCap(studyBlock, inventoryLimits, inventoryUsed, nearlyExhausted)
          tasks.push(studyBlockToTask(day, cappedBlock, input.userId, planId))
        } else if (day.dayType === 'review') {
          const reviewBlock = block as ReviewBlock
          const cappedBlock = this.applyInventoryCapReview(reviewBlock, inventoryLimits, inventoryUsed)
          tasks.push(reviewBlockToTask(day, cappedBlock, input.userId, planId))
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

  private isStudyBlock(_block: unknown, dayType: string): boolean {
    return dayType === 'study'
  }

  /** Load question_inventory as a map: `${domain}|||${skill}|||${difficulty}` → available_count */
  private async loadInventoryLimits(): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (this.supabase as any)
        .from('question_inventory')
        .select('domain, skill, difficulty, available_count')
      if (data) {
        for (const row of data) {
          const key = `${row.domain}|||${row.skill}|||${row.difficulty}`
          map.set(key, row.available_count as number)
        }
      }
    } catch { /* inventory table may not exist yet — proceed without limits */ }
    return map
  }

  /**
   * Cap a StudyBlock's questionCount against remaining inventory.
   * Mutates inventoryUsed in place. Appends to nearlyExhausted if < 20% remaining.
   */
  private applyInventoryCap(
    block: StudyBlock,
    limits: Map<string, number>,
    used: Map<string, number>,
    nearlyExhausted: string[],
  ): StudyBlock {
    const key = `${block.cbFilters.domain}|||${block.cbFilters.skill}|||${block.cbFilters.difficulty}`
    const available = limits.get(key)
    if (available === undefined) return block   // no limit set — pass through unchanged

    const soFar    = used.get(key) ?? 0
    const remaining = Math.max(0, available - soFar)

    if (remaining <= 0) {
      // Exhausted — assign minimum viable set (1 question) so the task still exists
      used.set(key, soFar + 1)
      return { ...block, questionCount: 1 }
    }

    const capped = Math.min(block.questionCount, remaining)
    used.set(key, soFar + capped)

    // Flag nearly exhausted (< 20% of available remaining after this allocation)
    const afterPct = (remaining - capped) / available
    if (afterPct < 0.2 && !nearlyExhausted.includes(key)) {
      nearlyExhausted.push(key)
    }

    return capped === block.questionCount ? block : { ...block, questionCount: capped }
  }

  /** Lighter version for review blocks — caps but doesn't flag nearly-exhausted */
  private applyInventoryCapReview(
    block: ReviewBlock,
    limits: Map<string, number>,
    used: Map<string, number>,
  ): ReviewBlock {
    const key = `${block.cbFilters.domain}|||${block.cbFilters.skill}|||${block.cbFilters.difficulty}`
    const available = limits.get(key)
    if (available === undefined) return block

    const soFar    = used.get(key) ?? 0
    const remaining = Math.max(0, available - soFar)
    if (remaining <= 0) { used.set(key, soFar + 1); return { ...block, questionCount: 1 } }

    const capped = Math.min(block.questionCount, remaining)
    used.set(key, soFar + capped)
    return capped === block.questionCount ? block : { ...block, questionCount: capped }
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
