// ─────────────────────────────────────────────────────────────────────────────
// Adaptive Replanner
//
// Triggered whenever new performance data arrives (question session, error log,
// practice test score). Re-ranks all 8 SAT domains from fresh question_sessions
// data, then updates every future unlocked calendar_task with:
//   • priority_score (1–100 normalized), mastery_target (fixed 90)
//   • estimated_score_impact, replanning_weight
//   • difficulty (adjusted for new accuracy + current phase)
//   • title and description (reflect new question count and difficulty)
//
// Safeguards:
//   • Never touches replan_locked tasks (completed or manually locked)
//   • Never modifies practice test content (date, duration, description)
//   • Never exceeds duration_minutes-based question ceiling
//   • Never removes any task — only updates existing rows
//
// Returns DomainChange[] and predictedScore for UI display.
// Writes a replan_audit_log row on every run.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { rankDomains, dailyQuestionTarget } from '@/lib/study-plan-engine/scoring.service'
import { phaseForWeek, difficultyForSession } from '@/lib/study-plan-engine/difficulty.service'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import type { TopicPerformance, Phase, RankedDomain } from '@/lib/study-plan-engine/types'
import type { ReplanTrigger, ReplannerResult, TaskUpdate, DomainChange } from './types'

type Supabase = SupabaseClient<Database>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isoNow(): string {
  return new Date().toISOString()
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86_400_000))
}

function phaseForTaskDate(taskDate: string, testDate: string): Phase {
  const weeksToTask = Math.ceil(daysUntil(taskDate) / 7)
  const totalWeeks  = Math.ceil(daysUntil(testDate)  / 7)
  return phaseForWeek(weeksToTask, Math.max(weeksToTask, totalWeeks))
}

function questionCountForTask(durationMinutes: number | null, phase: Phase): number {
  const base = dailyQuestionTarget(durationMinutes ?? 60)
  const ramp: Record<Phase, number> = {
    foundation: 0.80,
    skill:      0.90,
    advanced:   1.00,
    strategy:   1.10,
  }
  return Math.max(10, Math.min(80, Math.round(base * ramp[phase])))
}

/** Parse question count from task title, e.g. "Algebra — Easy · 18q" → 18 */
function parseQuestionCount(title: string): number | null {
  const m = title.match(/(\d+)q/)
  return m ? parseInt(m[1], 10) : null
}

function buildTitle(originalTitle: string, domainLabel: string, difficulty: string, questionCount: number): string {
  if (originalTitle.startsWith('Review —')) return `Review — ${domainLabel} · ${questionCount}q`
  return `${domainLabel} — ${capitalize(difficulty)} · ${questionCount}q`
}

function buildDescription(
  phase: Phase,
  domainLabel: string,
  difficulty: string,
  questionCount: number,
  isReview: boolean,
): string {
  if (isReview) {
    return `Review ${questionCount} ${difficulty} ${domainLabel} questions. Focus on error types from recent sessions. Update mastery status in Error Log.`
  }
  const descriptions: Record<Phase, string> = {
    foundation: `Practice ${questionCount} Easy ${domainLabel} questions on College Board QB. Understand the concept behind every error — log each in your Error Log with the correct approach.`,
    skill:      `Complete ${questionCount} ${difficulty} ${domainLabel} questions. Pace yourself at ~1:30/question. Identify recurring error patterns and update your Error Log.`,
    advanced:   `${questionCount} ${difficulty} ${domainLabel} questions under timed conditions. Target 90% accuracy. Review every error immediately after the set.`,
    strategy:   `Timed ${domainLabel} set — ${questionCount} Hard questions. Simulate test conditions. Goal: 90% accuracy. Log and mark mastered errors afterwards.`,
  }
  return descriptions[phase]
}

// ─── Topic performance aggregation ───────────────────────────────────────────

async function fetchTopicPerformance(supabase: Supabase, userId: string): Promise<TopicPerformance[]> {
  const { data: sessions } = await supabase
    .from('question_sessions')
    .select('category, questions_attempted, questions_correct')
    .eq('user_id', userId)

  const labelToKey = new Map(DOMAIN_CATALOG.map(d => [d.label, d.key]))
  const agg = new Map<string, { attempted: number; correct: number }>()

  for (const s of sessions ?? []) {
    const key = labelToKey.get(s.category)
    if (!key) continue
    const prev = agg.get(key) ?? { attempted: 0, correct: 0 }
    agg.set(key, {
      attempted: prev.attempted + (s.questions_attempted ?? 0),
      correct:   prev.correct   + (s.questions_correct  ?? 0),
    })
  }

  return [...agg.entries()]
    .filter(([, { attempted }]) => attempted > 0)
    .map(([domainKey, { attempted, correct }]) => ({
      domainKey,
      attempted,
      correct,
      accuracy: Math.round((correct / attempted) * 100),
    }))
}

// ─── Predicted score estimate ─────────────────────────────────────────────────

/**
 * Upper-bound score estimate: current score + all remaining domain potential.
 * Labeled "potential score" in the UI — what the student could hit if they
 * execute the full plan.
 */
function computePredictedScore(currentScore: number, ranked: RankedDomain[]): number {
  const totalPotential = ranked.reduce((sum, rd) => sum + rd.potentialPoints, 0)
  return Math.min(1600, Math.round(currentScore + totalPotential))
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function runAdaptiveReplanner(
  supabase: Supabase,
  userId: string,
  triggeredBy: ReplanTrigger,
  triggerId?: string,
): Promise<ReplannerResult> {
  const empty: ReplannerResult = {
    tasksUpdated: 0,
    domainsReprioritized: [],
    changesSummary: 'No changes made.',
    auditLogId: null,
    taskChanges: [],
    predictedScore: 0,
  }

  // ── 1. Load user profile ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any)
    .select('current_score, target_score, test_date, daily_study_minutes')
    .eq('id', userId)
    .single()

  if (!profile?.test_date) return empty

  const currentScore = profile.current_score ?? 1000

  // ── 2. Re-rank domains from fresh question_sessions data ─────────────────
  const topicPerformance = await fetchTopicPerformance(supabase, userId)
  const ranked           = rankDomains(topicPerformance, profile.target_score ?? 1400)
  const maxPriority      = ranked[0]?.priorityScore ?? 1
  const predictedScore   = computePredictedScore(currentScore, ranked)

  const rankedByLabel = new Map<string, RankedDomain>(ranked.map(rd => [rd.entry.label, rd]))

  // ── 3. Fetch active plan id ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan } = await (supabase.from('study_plans') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  // ── 4. Fetch all future unlocked tasks ───────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskQuery = (supabase.from('calendar_tasks') as any)
    .select('id, title, task_date, duration_minutes, category, college_board_filters')
    .eq('user_id', userId)
    .eq('replan_locked', false)
    .gt('task_date', today)

  if (plan?.id) taskQuery.eq('study_plan_id', plan.id)

  const { data: futureTasks } = await taskQuery
  if (!futureTasks || futureTasks.length === 0) {
    return { ...empty, predictedScore }
  }

  // ── 5. Build update payloads + track per-domain changes ──────────────────
  const updates: TaskUpdate[] = []
  const now = isoNow()

  // Per-domain change tracking: label → aggregate stats
  const domainTracker = new Map<string, {
    count: number
    diffChanges: Set<string>   // "Easy → Medium" etc.
    qDelta: number             // net question count delta
    normalizedPriority: number
    accuracy: number
  }>()

  for (const task of futureTasks) {
    const isPracticeTest = task.category === 'Full Practice Test'

    if (isPracticeTest) {
      updates.push({
        id:                     task.id,
        priority_score:         100,
        mastery_target:         0,
        estimated_score_impact: 0,
        replanning_weight:      0.9,
        last_replanned_at:      now,
      })
      continue
    }

    const rd = rankedByLabel.get(task.category ?? '')
    if (!rd) continue

    const phase         = phaseForTaskDate(task.task_date, profile.test_date)
    const newDifficulty = difficultyForSession(phase, rd.currentAccuracy)
    const newQCount     = questionCountForTask(task.duration_minutes, phase)
    const isReview      = (task.title as string).startsWith('Review —')
    const normalizedPS  = Math.max(1, Math.round((rd.priorityScore / maxPriority) * 100))
    const replanWeight  = Math.round((rd.priorityScore / maxPriority) * 100) / 100

    // Detect what changed for the audit summary
    const oldFilters    = task.college_board_filters as Record<string, string> | null
    const oldDifficulty = oldFilters?.difficulty ?? null
    const oldQCount     = parseQuestionCount(task.title as string)

    const diffChange = oldDifficulty && oldDifficulty !== newDifficulty
      ? `${capitalize(oldDifficulty)} → ${capitalize(newDifficulty)}`
      : null
    const qDelta = oldQCount !== null ? newQCount - oldQCount : 0

    // Accumulate per-domain stats
    const existing = domainTracker.get(rd.entry.label)
    if (existing) {
      existing.count++
      if (diffChange) existing.diffChanges.add(diffChange)
      existing.qDelta += qDelta
    } else {
      domainTracker.set(rd.entry.label, {
        count: 1,
        diffChanges: diffChange ? new Set([diffChange]) : new Set(),
        qDelta,
        normalizedPriority: normalizedPS,
        accuracy: rd.currentAccuracy,
      })
    }

    updates.push({
      id:                     task.id,
      priority_score:         normalizedPS,
      mastery_target:         90,
      estimated_score_impact: rd.potentialPoints,
      replanning_weight:      replanWeight,
      last_replanned_at:      now,
      title:       buildTitle(task.title, rd.entry.label, newDifficulty, newQCount),
      description: buildDescription(phase, rd.entry.label, newDifficulty, newQCount, isReview),
      college_board_filters: { ...(oldFilters ?? {}), difficulty: newDifficulty },
    })
  }

  // ── 6. Batch update in parallel chunks of 100 ────────────────────────────
  const CHUNK = 100
  let updatedCount = 0

  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map(u =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('calendar_tasks') as any)
          .update({
            priority_score:         u.priority_score,
            mastery_target:         u.mastery_target,
            estimated_score_impact: u.estimated_score_impact,
            replanning_weight:      u.replanning_weight,
            last_replanned_at:      u.last_replanned_at,
            ...(u.title                 !== undefined && { title: u.title }),
            ...(u.description           !== undefined && { description: u.description }),
            ...(u.college_board_filters !== undefined && { college_board_filters: u.college_board_filters }),
            updated_at: now,
          })
          .eq('id', u.id)
          .eq('user_id', userId)
      )
    )
    updatedCount += chunk.length
  }

  // ── 7. Build structured change list for UI ───────────────────────────────
  const taskChanges: DomainChange[] = []
  for (const [label, stats] of domainTracker) {
    const topDiff = stats.diffChanges.size > 0 ? [...stats.diffChanges][0] : null
    const qStr = stats.qDelta !== 0
      ? `${stats.qDelta > 0 ? '+' : ''}${stats.qDelta}q`
      : null
    taskChanges.push({
      domainLabel:      label,
      tasksAffected:    stats.count,
      difficultyChange: topDiff,
      questionChange:   qStr,
      newPriorityScore: stats.normalizedPriority,
      currentAccuracy:  stats.accuracy,
    })
  }
  // Sort by priority descending for display
  taskChanges.sort((a, b) => b.newPriorityScore - a.newPriorityScore)

  // ── 8. Audit log + domain summary ────────────────────────────────────────
  const domainChangesForLog = ranked.slice(0, 5).map(rd => ({
    label:            rd.entry.label,
    oldPriorityScore: 0,
    newPriorityScore: Math.max(1, Math.round((rd.priorityScore / maxPriority) * 100)),
    oldAccuracy:      rd.currentAccuracy,
    newAccuracy:      rd.currentAccuracy,
  }))

  const topDomains = ranked.slice(0, 3)
    .map(rd => `${rd.entry.label} (${rd.currentAccuracy}% → ${capitalize(difficultyForSession(phaseForTaskDate(today, profile.test_date), rd.currentAccuracy))})`)
    .join(', ')

  const changesSummary =
    `Triggered by: ${triggeredBy}. ${updatedCount} tasks updated. Top domains: ${topDomains}.`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: auditRow } = await (supabase.from('replan_audit_logs') as any)
    .insert({
      user_id:               userId,
      triggered_by:          triggeredBy,
      trigger_id:            triggerId ?? null,
      tasks_updated:         updatedCount,
      domains_reprioritized: domainChangesForLog,
      changes_summary:       changesSummary,
    })
    .select('id')
    .single()

  return {
    tasksUpdated:         updatedCount,
    domainsReprioritized: domainChangesForLog,
    changesSummary,
    auditLogId:           auditRow?.id ?? null,
    taskChanges,
    predictedScore,
  }
}
