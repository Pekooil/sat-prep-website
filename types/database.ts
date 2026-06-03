// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          target_score: number | null
          current_score: number | null
          test_date: string | null
          study_hours_per_week: number | null
          daily_study_minutes: number | null
          has_completed_onboarding: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          target_score?: number | null
          current_score?: number | null
          test_date?: string | null
          study_hours_per_week?: number | null
          daily_study_minutes?: number | null
          has_completed_onboarding?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          email?: string | null
          target_score?: number | null
          current_score?: number | null
          test_date?: string | null
          study_hours_per_week?: number | null
          daily_study_minutes?: number | null
          has_completed_onboarding?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_tests: {
        Row: {
          id: string
          user_id: string
          test_date: string
          math_score: number | null
          reading_writing_score: number | null
          total_score: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_date: string
          math_score?: number | null
          reading_writing_score?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          test_date?: string
          math_score?: number | null
          reading_writing_score?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          is_active: boolean
          ai_generated: boolean
          plan_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          is_active?: boolean
          ai_generated?: boolean
          plan_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          ai_generated?: boolean
          plan_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      calendar_tasks: {
        Row: {
          id: string
          user_id: string
          study_plan_id: string | null
          title: string
          description: string | null
          task_date: string
          start_time: string | null
          duration_minutes: number | null
          subject: 'math' | 'reading_writing' | 'both'
          category: string | null
          is_completed: boolean
          college_board_filters: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          study_plan_id?: string | null
          title: string
          description?: string | null
          task_date: string
          start_time?: string | null
          duration_minutes?: number | null
          subject: 'math' | 'reading_writing' | 'both'
          category?: string | null
          is_completed?: boolean
          college_board_filters?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          task_date?: string
          start_time?: string | null
          duration_minutes?: number | null
          subject?: 'math' | 'reading_writing' | 'both'
          category?: string | null
          is_completed?: boolean
          college_board_filters?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      question_sessions: {
        Row: {
          id: string
          user_id: string
          calendar_task_id: string | null
          session_date: string
          subject: 'math' | 'reading_writing'
          category: string
          subcategory: string | null
          questions_attempted: number
          questions_correct: number
          time_spent_minutes: number | null
          college_board_filters: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          calendar_task_id?: string | null
          session_date: string
          subject: 'math' | 'reading_writing'
          category: string
          subcategory?: string | null
          questions_attempted?: number
          questions_correct?: number
          time_spent_minutes?: number | null
          college_board_filters?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          questions_attempted?: number
          questions_correct?: number
          time_spent_minutes?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          id: string
          user_id: string
          question_session_id: string | null
          subject: 'math' | 'reading_writing'
          category: string
          subcategory: string | null
          error_type: 'concept' | 'careless' | 'time' | 'strategy' | 'other'
          description: string
          my_answer: string | null
          correct_approach: string | null
          college_board_domain: string | null
          college_board_skill: string | null
          mastered: boolean
          review_count: number
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_session_id?: string | null
          subject: 'math' | 'reading_writing'
          category: string
          subcategory?: string | null
          error_type: 'concept' | 'careless' | 'time' | 'strategy' | 'other'
          description: string
          my_answer?: string | null
          correct_approach?: string | null
          college_board_domain?: string | null
          college_board_skill?: string | null
          mastered?: boolean
          review_count?: number
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          subject?: 'math' | 'reading_writing'
          category?: string
          subcategory?: string | null
          error_type?: 'concept' | 'careless' | 'time' | 'strategy' | 'other'
          description?: string
          my_answer?: string | null
          correct_approach?: string | null
          college_board_domain?: string | null
          college_board_skill?: string | null
          mastered?: boolean
          review_count?: number
          last_reviewed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      score_history: {
        Row: {
          id: string
          user_id: string
          test_type: 'diagnostic' | 'practice' | 'official' | 'full_length'
          test_date: string
          math_score: number | null
          reading_writing_score: number | null
          total_score: number | null
          math_section_breakdown: Json | null
          reading_writing_section_breakdown: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_type: 'diagnostic' | 'practice' | 'official' | 'full_length'
          test_date: string
          math_score?: number | null
          reading_writing_score?: number | null
          math_section_breakdown?: Json | null
          reading_writing_section_breakdown?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          test_type?: 'diagnostic' | 'practice' | 'official' | 'full_length'
          test_date?: string
          math_score?: number | null
          reading_writing_score?: number | null
          math_section_breakdown?: Json | null
          reading_writing_section_breakdown?: Json | null
          notes?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'reminder' | 'achievement' | 'system' | 'ai_suggestion'
          is_read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'reminder' | 'achievement' | 'system' | 'ai_suggestion'
          is_read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
