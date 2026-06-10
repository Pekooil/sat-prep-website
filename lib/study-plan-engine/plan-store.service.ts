// ─────────────────────────────────────────────────────────────────────────────
// PlanStoreService
// Persists a generated schedule to study_plans + calendar_tasks.
//
// Strategy:
//  1. Insert one study_plans row that acts as the plan envelope.
//  2. Batch-insert calendar_tasks — one row per StudyBlock / ReviewBlock /
//     PracticeTestBlock.  Rest days produce no tasks.
//  3. Use a single batched insert for performance (vs. N individual inserts).
//  4. Before inserting, load question_inventory limits and assign question
//     counts so the plan never exceeds what the Question Bank has available.
//
// Inventory rules (enforced in assignStudyBlock / the study-day loop below):
//  • No skill category (domain|skill|difficulty) is ever assigned more
//    questions than its available_count.
//  • Every study block targets ≥80% of its study time. If the planned skill
//    can't supply that many remaining questions, the block is substituted for
//    another skill in the SAME subject, chosen by adaptive-planner priority
//    (weakest / highest-leverage domain first).
//  • Both Math and Reading & Writing are assigned every study day for as long
//    as each subject has inventory.
//  • Once the entire Question Bank is exhausted, study days stop assigning
//    questions: they become Review & Practice sessions and the user is
//    notified to review their Error Log and take Bluebook practice tests.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { masteryTargetForDomain } from './scoring.service'
import type {
  DaySchedule,
  Difficulty,
  PhaseSummary,
  PracticeTestBlock,
  RankedDomain,
  StudyBlock,
  StudyPlanEngineInput,
  StudyPlanEngineResult,
  Subject,
} from './types'

// ─── Inventory tuning constants ───────────────────────────────────────────────

/** Average pace blended across Math (~1.5) and R&W (~1.0). Matches scoring.service. */
const MIN_PER_QUESTION = 1.25
/** Questions must fill at least this fraction of the block's study time. */
const MIN_TIME_UTILIZATION = 0.8

/** Inventory map key: matches loadInventoryLimits + question_inventory rows. */
function invKey(domain: string, skill: string, difficulty: string): string {
  return `${domain}|||${skill}|||${difficulty}`
}

/** Minimum questions needed for a block to fill ≥80% of its study time. */
function blockMinQuestions(durationMinutes: number): number {
  return Math.max(1, Math.ceil((durationMinutes * MIN_TIME_UTILIZATION) / MIN_PER_QUESTION))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function studyBlockDescription(
  label: string,
  skill: string,
  difficulty: string,
  count: number,
  substituted: boolean,
): string {
  const lead = substituted
    ? 'Substituted to keep your plan full — the skill originally scheduled here ran low on Question Bank inventory. '
    : ''
  return (
    `${lead}Practice ${count} ${capitalize(difficulty)} ${label} questions ` +
    `(skill focus: ${skill}) on the College Board Question Bank. ` +
    `Review every miss and log it in your Error Log with the correct approach.`
  )
}

/** One assignable inventory slot, tagged with its ranked domain for priority ordering. */
interface InventorySlot {
  domain: string
  skill: string
  difficulty: Difficulty
  key: string
  rd: RankedDomain
}

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

function reviewSessionToTask(
  day: DaySchedule,
  userId: string,
  planId: string,
): TaskInsertRow {
  return {
    user_id:       userId,
    study_plan_id: planId,
    title:         'Review Session',
    description:   'Work through your active error log mistakes. For each open mistake: review what went wrong, update your notes, and mark it mastered when you understand it. This session replaces additional question sets — focus entirely on your error log.',
    task_date:     day.date,
    duration_minutes: day.totalDurationMinutes || 60,
    subject:       'both',
    category:      'Review Session',
    is_completed:  false,
    replan_locked: false,
    priority_score:         50,
    mastery_target:         0,
    estimated_score_impact: 0,
    replanning_weight:      0.5,
    college_board_filters:  null,
  }
}

/**
 * Replaces a study day once the entire Question Bank has been scheduled.
 * Uses the 'Review Session' category so the Adaptive Replanner skips it and the
 * calendar opens the error-log review drawer. No QB filter / question count.
 */
function bankCompleteToTask(
  day: DaySchedule,
  userId: string,
  planId: string,
): TaskInsertRow {
  return {
    user_id:       userId,
    study_plan_id: planId,
    title:         'Review & Practice — Question Bank Complete',
    description:   'You have been assigned every available Question Bank question for your plan. Use this session to (1) review and master the mistakes in your Error Log, and (2) take a full-length official Bluebook practice test if you have not done one recently. Keep this up until your test date.',
    task_date:     day.date,
    duration_minutes: day.totalDurationMinutes || 60,
    subject:       'both',
    category:      'Review Session',
    is_completed:  false,
    replan_locked: false,
    priority_score:         50,
    mastery_target:         0,
    estimated_score_impact: 0,
    replanning_weight:      0.5,
    college_board_filters:  null,
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
    const inventoryLimits   = await this.loadInventoryLimits()
    const inventoryConfigured = inventoryLimits.size > 0
    // Cumulative question allocations within this plan: key → count used so far.
    const inventoryUsed = new Map<string, number>()
    // Per-subject assignable inventory slots, sorted by adaptive-planner priority.
    const slotsBySubject = this.buildSlotsBySubject(inventoryLimits, ranked)
    const maxPriorityScore = ranked[0]?.priorityScore ?? 1

    // ── 3b. Build task rows from all non-rest days ──────────────────────────
    const tasks: TaskInsertRow[] = []
    const nearlyExhausted: string[] = []
    const subjectExhausted: Record<Subject, boolean> = { math: false, reading_writing: false }
    let bankExhausted = false
    let exhaustionDate: string | null = null

    for (const day of schedule) {
      if (day.dayType === 'rest' || day.blocks.length === 0) continue

      if (day.dayType === 'review') {
        // One unified Review Session task per review day — no domain-specific blocks
        tasks.push(reviewSessionToTask(day, input.userId, planId))
        continue
      }

      if (day.dayType === 'practice_test') {
        for (const block of day.blocks) {
          tasks.push(practiceTestToTask(day, block as PracticeTestBlock, input.userId, planId))
        }
        continue
      }

      // ── Study day ─────────────────────────────────────────────────────────
      // Once the whole bank is exhausted, every remaining study day becomes a
      // Review & Practice session instead of assigning more questions.
      if (bankExhausted) {
        tasks.push(bankCompleteToTask(day, input.userId, planId))
        continue
      }

      const dayStudyTasks: TaskInsertRow[] = []
      for (const block of day.blocks) {
        const studyBlock = block as StudyBlock
        const { block: assigned, exhausted } = this.assignStudyBlock(
          studyBlock,
          inventoryLimits,
          inventoryUsed,
          slotsBySubject[studyBlock.subject],
          nearlyExhausted,
          maxPriorityScore,
        )
        if (exhausted) subjectExhausted[studyBlock.subject] = true
        if (assigned) dayStudyTasks.push(studyBlockToTask(day, assigned, input.userId, planId))
      }

      if (dayStudyTasks.length > 0) {
        tasks.push(...dayStudyTasks)
      } else if (inventoryConfigured) {
        // Neither subject could supply questions → bank fully exhausted from here.
        tasks.push(bankCompleteToTask(day, input.userId, planId))
      }

      // Flip to Review & Practice mode once BOTH subjects are out of inventory.
      if (
        inventoryConfigured &&
        subjectExhausted.math &&
        subjectExhausted.reading_writing &&
        !bankExhausted
      ) {
        bankExhausted = true
        exhaustionDate = day.date
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

    // ── 5. Notify the user if the Question Bank was fully scheduled ─────────
    if (bankExhausted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.supabase.from('notifications') as any).insert({
        user_id: input.userId,
        title: 'Question Bank fully scheduled',
        message:
          `Your plan has assigned every available Question Bank question` +
          `${exhaustionDate ? ` (through ${exhaustionDate})` : ''}. ` +
          `For the remaining study days, review your Error Log and take full-length ` +
          `Bluebook practice tests before your test date.`,
        type: 'system',
        is_read: false,
      }).then(
        () => {},
        () => {}, // non-fatal — plan creation must not fail on the notification
      )
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
      inventoryExhausted: bankExhausted,
      nearlyExhaustedSkills: nearlyExhausted,
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

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
          map.set(invKey(row.domain, row.skill, row.difficulty), row.available_count as number)
        }
      }
    } catch { /* inventory table may not exist yet — proceed without limits */ }
    return map
  }

  /**
   * Group every inventory slot under its subject, sorted by adaptive-planner
   * priority (weakest / highest-leverage domain first). These pools drive
   * substitution when a planned skill runs out of questions.
   */
  private buildSlotsBySubject(
    limits: Map<string, number>,
    ranked: RankedDomain[],
  ): Record<Subject, InventorySlot[]> {
    const rankedByCbDomain = new Map(ranked.map(r => [r.entry.cbDomain, r]))
    const out: Record<Subject, InventorySlot[]> = { math: [], reading_writing: [] }

    for (const key of limits.keys()) {
      const [domain, skill, difficulty] = key.split('|||')
      const rd = rankedByCbDomain.get(domain)
      if (!rd) continue // inventory row for a non-catalog domain — ignore
      out[rd.entry.subject].push({
        domain,
        skill,
        difficulty: difficulty as Difficulty,
        key,
        rd,
      })
    }

    for (const subject of ['math', 'reading_writing'] as Subject[]) {
      out[subject].sort((a, b) => b.rd.priorityScore - a.rd.priorityScore)
    }
    return out
  }

  /**
   * Assign a study block against inventory.
   *  • Keeps the planned skill when it can supply ≥80% of the block's time.
   *  • Otherwise substitutes another skill in the SAME subject, picked by
   *    priority, that has enough remaining questions.
   *  • Never assigns more than a skill's remaining inventory.
   *
   * Returns the (possibly modified) block, or null when the subject is fully
   * exhausted. `exhausted` is true only when no slot in the subject has any
   * questions left.
   */
  private assignStudyBlock(
    block: StudyBlock,
    limits: Map<string, number>,
    used: Map<string, number>,
    subjectSlots: InventorySlot[],
    nearlyExhausted: string[],
    maxPriorityScore: number,
  ): { block: StudyBlock | null; exhausted: boolean } {
    const minQ   = blockMinQuestions(block.durationMinutes)
    // Enforce the ≥80% time floor even when inventory is plentiful/unconfigured.
    const target = Math.max(block.questionCount, minQ)

    const ownKey     = invKey(block.cbFilters.domain, block.cbFilters.skill, block.cbFilters.difficulty)
    const ownDefined = limits.has(ownKey)

    // Case A — no inventory limit configured for this skill → pass through
    // uncapped (admin hasn't constrained it). Still apply the 80% floor.
    if (!ownDefined) {
      return { block: this.withFinalCount(block, target), exhausted: false }
    }

    const ownRemaining = (limits.get(ownKey) ?? 0) - (used.get(ownKey) ?? 0)

    // Case B — planned skill can fill ≥80% of the time → keep it.
    if (ownRemaining >= minQ) {
      const count = Math.min(target, ownRemaining)
      used.set(ownKey, (used.get(ownKey) ?? 0) + count)
      this.flagNearlyExhausted(ownKey, limits, used, nearlyExhausted)
      return { block: this.withFinalCount(block, count), exhausted: false }
    }

    // Case C — planned skill is out / too low → substitute within the subject.
    const pick = this.pickSlot(subjectSlots, limits, used, minQ, block.cbFilters.difficulty)
    if (!pick) {
      return { block: null, exhausted: true } // subject fully exhausted
    }
    const count = Math.min(target, pick.remaining)
    used.set(pick.slot.key, (used.get(pick.slot.key) ?? 0) + count)
    this.flagNearlyExhausted(pick.slot.key, limits, used, nearlyExhausted)
    return {
      block: this.substituteBlock(block, pick.slot, count, maxPriorityScore),
      exhausted: false,
    }
  }

  /**
   * Pick the best substitute slot in a subject:
   *  1. Prefer slots that can supply the full 80% floor (minQ), in priority
   *     order, matching the requested difficulty first.
   *  2. If none can meet minQ, take whichever has the most questions left.
   *  3. Return null only when nothing is left in the subject.
   */
  private pickSlot(
    subjectSlots: InventorySlot[],
    limits: Map<string, number>,
    used: Map<string, number>,
    minQ: number,
    preferDifficulty: Difficulty,
  ): { slot: InventorySlot; remaining: number } | null {
    const withRemaining = subjectSlots
      .map(slot => ({ slot, remaining: (limits.get(slot.key) ?? 0) - (used.get(slot.key) ?? 0) }))
      .filter(x => x.remaining > 0)

    if (withRemaining.length === 0) return null

    // subjectSlots is pre-sorted by priority, so these stay priority-ordered.
    const enough = withRemaining.filter(x => x.remaining >= minQ)
    if (enough.length > 0) {
      const sameDiff = enough.filter(x => x.slot.difficulty === preferDifficulty)
      return sameDiff[0] ?? enough[0]
    }

    // Nothing meets the floor — fill as much time as possible.
    return withRemaining.reduce((a, b) => (b.remaining > a.remaining ? b : a))
  }

  /** Return the block with a final question count (regenerating its blurb if changed). */
  private withFinalCount(block: StudyBlock, count: number): StudyBlock {
    if (count === block.questionCount) return block
    return {
      ...block,
      questionCount: count,
      description: studyBlockDescription(
        block.domainLabel, block.skillFocus, block.difficulty, count, false,
      ),
    }
  }

  /** Rebuild a block for a substitute skill, recomputing replanner metadata. */
  private substituteBlock(
    block: StudyBlock,
    slot: InventorySlot,
    count: number,
    maxPriorityScore: number,
  ): StudyBlock {
    const rd = slot.rd
    const replanningWeight = maxPriorityScore > 0
      ? Math.round((rd.priorityScore / maxPriorityScore) * 100) / 100
      : 0
    return {
      ...block,
      domainKey:    rd.entry.key,
      domainLabel:  rd.entry.label,
      skillFocus:   slot.skill,
      difficulty:   slot.difficulty,
      questionCount: count,
      cbFilters:    { domain: rd.entry.cbDomain, skill: slot.skill, difficulty: slot.difficulty },
      description:  studyBlockDescription(rd.entry.label, slot.skill, slot.difficulty, count, true),
      priorityScore:        Math.max(1, Math.round((rd.priorityScore / maxPriorityScore) * 100)),
      masteryTarget:        masteryTargetForDomain(rd.currentAccuracy),
      estimatedScoreImpact: rd.potentialPoints,
      replanningWeight,
    }
  }

  /** Flag a skill key as nearly exhausted once <20% of its inventory remains. */
  private flagNearlyExhausted(
    key: string,
    limits: Map<string, number>,
    used: Map<string, number>,
    nearlyExhausted: string[],
  ): void {
    const available = limits.get(key) ?? 0
    if (available <= 0) return
    const remaining = available - (used.get(key) ?? 0)
    if (remaining / available < 0.2 && !nearlyExhausted.includes(key)) {
      nearlyExhausted.push(key)
    }
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
