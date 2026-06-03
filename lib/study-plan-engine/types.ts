// ─────────────────────────────────────────────────────────────────────────────
// Study Plan Engine — Core Types
// All types are pure data structures with no external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export type Subject    = 'math' | 'reading_writing'
export type SubjectAll = Subject | 'both'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type DayType    = 'study' | 'review' | 'practice_test' | 'rest'
export type Phase      = 'foundation' | 'skill' | 'advanced' | 'strategy'

// ─── Domain Catalog Types ─────────────────────────────────────────────────────

export interface SkillEntry {
  /** College Board official skill label (used as QB filter) */
  label: string
  difficulty: Difficulty
}

export interface DomainEntry {
  key: string
  label: string
  /** Exact College Board domain name used in the Question Bank filter */
  cbDomain: string
  subject: Subject
  /** Approximate number of questions on the Digital SAT */
  questionCount: number
  /** Approx SAT section-points per additional correct answer */
  pointsPerQuestion: number
  skills: SkillEntry[]
}

// ─── Engine Input ─────────────────────────────────────────────────────────────

export interface TopicPerformance {
  /** Domain key matching DomainEntry.key */
  domainKey: string
  attempted: number
  correct: number
  /** Pre-computed accuracy 0–100 */
  accuracy: number
}

export interface StudyPlanEngineInput {
  userId: string
  currentScore: number        // 400–1600
  targetScore: number         // 400–1600, must be > currentScore
  testDate: string            // ISO 'YYYY-MM-DD'
  dailyStudyMinutes: number   // per study session (30–180)
  topicPerformance?: TopicPerformance[]
}

// ─── Scoring / Ranking ────────────────────────────────────────────────────────

export interface RankedDomain {
  entry: DomainEntry
  /** 0–100; defaults to 50 when no performance data supplied */
  currentAccuracy: number
  /** Required accuracy to hit targetScore, 55–95 */
  targetAccuracy: number
  /** (targetAccuracy − currentAccuracy) × questionCount × pointsPerQuestion */
  priorityScore: number
  /** Max SAT points available from this domain (gap × leverage) */
  potentialPoints: number
  hasData: boolean
}

// ─── Schedule Output ──────────────────────────────────────────────────────────

export interface CollegeBoardFilter {
  domain: string
  skill: string
  difficulty: Difficulty
}

export interface StudyBlock {
  subject: Subject
  domainKey: string
  domainLabel: string
  /** Recommended skill focus (maps to QB skill filter) */
  skillFocus: string
  durationMinutes: number
  questionCount: number
  difficulty: Difficulty
  cbFilters: CollegeBoardFilter
  description: string
}

export interface ReviewBlock {
  subject: Subject
  domainKey: string
  domainLabel: string
  durationMinutes: number
  questionCount: number
  difficulty: Difficulty
  cbFilters: CollegeBoardFilter
  description: string
}

export interface PracticeTestBlock {
  durationMinutes: 180
  questionCount: 98  // 44 Math + 54 R&W
  description: string
  /** Practice test number in the plan sequence */
  testNumber: number
}

export interface DaySchedule {
  date: string           // ISO 'YYYY-MM-DD'
  dayOfWeek: number      // 0=Sun … 6=Sat
  dayType: DayType
  /** 1-indexed, counting from plan start */
  weekNumber: number
  phase: Phase
  /** Null on rest days */
  blocks: Array<StudyBlock | ReviewBlock | PracticeTestBlock>
  totalDurationMinutes: number
  totalQuestions: number
}

// ─── Persistence Output ───────────────────────────────────────────────────────

export interface StudyPlanEngineResult {
  planId: string
  title: string
  totalCalendarDays: number
  studyDays: number
  reviewDays: number
  practiceTestDays: number
  restDays: number
  totalTasksCreated: number
  phases: PhaseSummary[]
}

export interface PhaseSummary {
  phase: Phase
  label: string
  startWeek: number
  endWeek: number
  totalDays: number
  dominantDifficulty: Difficulty
}
