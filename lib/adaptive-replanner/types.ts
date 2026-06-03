// ─────────────────────────────────────────────────────────────────────────────
// Adaptive Replanner — Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReplanTrigger =
  | 'question_session'
  | 'error_log'
  | 'practice_test_score'
  | 'manual'

export interface DomainChange {
  domainLabel: string
  tasksAffected: number
  /** e.g. "Easy → Medium" — null if difficulty did not change */
  difficultyChange: string | null
  /** e.g. "+3q" or "-2q" — null if question count did not change */
  questionChange: string | null
  /** Normalized 1–100 */
  newPriorityScore: number
  currentAccuracy: number
}

export interface ReplannerResult {
  tasksUpdated: number
  domainsReprioritized: Array<{
    label: string
    oldPriorityScore: number
    newPriorityScore: number
    oldAccuracy: number
    newAccuracy: number
  }>
  changesSummary: string
  auditLogId: string | null
  /** Per-domain summary of what changed in this run */
  taskChanges: DomainChange[]
  /** Estimated composite score if all remaining plan tasks are completed */
  predictedScore: number
}

export interface TaskUpdate {
  id: string
  priority_score: number
  mastery_target: number
  estimated_score_impact: number
  replanning_weight: number
  last_replanned_at: string
  // Content updates (skipped for practice tests)
  title?: string
  description?: string
  college_board_filters?: Record<string, string>
}
