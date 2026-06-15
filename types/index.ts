import type { Database } from './database'

export type { Database }

export type User = Database['public']['Tables']['users']['Row']
export type DiagnosticTest = Database['public']['Tables']['diagnostic_tests']['Row']
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type CalendarTask = Database['public']['Tables']['calendar_tasks']['Row']
export type QuestionSession = Database['public']['Tables']['question_sessions']['Row']
export type ErrorLog = Database['public']['Tables']['error_logs']['Row']
export type ScoreHistory = Database['public']['Tables']['score_history']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ReplanAuditLog = Database['public']['Tables']['replan_audit_logs']['Row']
export type TopicMastery = Database['public']['Tables']['topic_mastery']['Row']
export type PlanVersion = Database['public']['Tables']['plan_versions']['Row']
export type ScorePrediction = Database['public']['Tables']['score_predictions']['Row']
export type AdaptiveRecommendation = Database['public']['Tables']['adaptive_recommendations']['Row']
export type QuestionInventory = Database['public']['Tables']['question_inventory']['Row']
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row']

export type Subject = 'math' | 'reading_writing' | 'both'
export type ErrorType = 'concept' | 'careless' | 'time' | 'strategy' | 'other'
export type TestType = 'diagnostic' | 'practice' | 'official' | 'full_length'
export type NotificationType = 'reminder' | 'achievement' | 'system' | 'ai_suggestion'

export interface CollegeBoardFilter {
  domain: string
  skill?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface AIPlanRequest {
  currentScore: number
  targetScore: number
  testDate: string
  hoursPerWeek: number
  weakAreas: string[]
  mathScore?: number
  readingWritingScore?: number
}

export interface AIPlanWeek {
  weekNumber: number
  startDate: string
  endDate: string
  theme: string
  tasks: AIPlanTask[]
}

export interface AIPlanTask {
  day: string
  subject: Subject
  category: string
  durationMinutes: number
  description: string
  collegeBoardFilters: CollegeBoardFilter
}

export interface AIStudyPlan {
  title: string
  totalWeeks: number
  weeks: AIPlanWeek[]
  overallStrategy: string
}

export interface CategoryStat {
  category: string
  subject: Subject
  attempted: number
  correct: number
  accuracy: number
}

export interface ScoreChartPoint {
  date: string
  total: number
  math: number | null
  readingWriting: number | null
  testType: TestType
}

// ─── Onboarding ────────────────────────────────────────────────────────────

export interface OnboardingStep1Data {
  currentScore: number
  targetScore: number
  testDate: string
  dailyStudyMinutes: number
}

export interface CategoryPerf {
  attempted: number
  correct: number
}

export interface OnboardingStep2Data {
  reading_writing: {
    informationIdeas: CategoryPerf
    craftStructure: CategoryPerf
    expressionIdeas: CategoryPerf
    standardEnglish: CategoryPerf
  }
  math: {
    algebra: CategoryPerf
    advancedMath: CategoryPerf
    problemSolving: CategoryPerf
    geometry: CategoryPerf
  }
}

export interface DomainStat {
  key: string
  label: string
  cbDomain: string
  subject: 'math' | 'reading_writing'
  attempted: number
  correct: number
  accuracy: number // 0-100
  level: 'weak' | 'moderate' | 'strong'
}

export interface OnboardingAnalysis {
  domains: DomainStat[]
  weakDomains: DomainStat[]
  strongDomains: DomainStat[]
  totalAttempted: number
  totalCorrect: number
  overallAccuracy: number
  scoreGap: number
  studyDays: number
  estimatedImprovement: number
  practiceTestCount: number
}

export interface AIOnboardingRec {
  message: string
  priorityTopics: Array<{
    domain: string
    subject: string
    reason: string
    weeklyGoal: string
    cbFilters: {
      domain: string
      skill?: string
      difficulty: 'easy' | 'medium' | 'hard'
    }
  }>
  studyTips: string[]
  estimatedTimelineWeeks: number
  weeklyPlanSummary: string
}
