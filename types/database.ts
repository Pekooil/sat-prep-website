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
          birth_year: number | null
          terms_accepted_at: string | null
          parental_ack: boolean
          inventory_mode: 'exclude_active' | 'include_active' | null
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
          birth_year?: number | null
          terms_accepted_at?: string | null
          parental_ack?: boolean
          inventory_mode?: 'exclude_active' | 'include_active' | null
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
          birth_year?: number | null
          terms_accepted_at?: string | null
          parental_ack?: boolean
          inventory_mode?: 'exclude_active' | 'include_active' | null
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
          priority_score: number | null
          mastery_target: number | null
          estimated_score_impact: number | null
          replanning_weight: number | null
          /** True once a task is completed — the Adaptive Replanner must not modify locked rows. */
          replan_locked: boolean
          last_replanned_at: string | null
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
          priority_score?: number | null
          mastery_target?: number | null
          estimated_score_impact?: number | null
          replanning_weight?: number | null
          replan_locked?: boolean
          last_replanned_at?: string | null
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
          priority_score?: number | null
          mastery_target?: number | null
          estimated_score_impact?: number | null
          replanning_weight?: number | null
          replan_locked?: boolean
          last_replanned_at?: string | null
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
          corrected_explanation: string | null
          confidence_rating: number | null
          archived: boolean
          custom_mistake_type: string | null
          question_id: string | null
          student_answer: 'A' | 'B' | 'C' | 'D' | null
          correct_answer: 'A' | 'B' | 'C' | 'D' | null
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
          corrected_explanation?: string | null
          confidence_rating?: number | null
          archived?: boolean
          custom_mistake_type?: string | null
          question_id?: string | null
          student_answer?: 'A' | 'B' | 'C' | 'D' | null
          correct_answer?: 'A' | 'B' | 'C' | 'D' | null
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
          corrected_explanation?: string | null
          confidence_rating?: number | null
          archived?: boolean
          custom_mistake_type?: string | null
          question_id?: string | null
          student_answer?: 'A' | 'B' | 'C' | 'D' | null
          correct_answer?: 'A' | 'B' | 'C' | 'D' | null
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
      replan_audit_logs: {
        Row: {
          id: string
          user_id: string
          triggered_by: 'question_session' | 'error_log' | 'practice_test_score' | 'manual' | 'behind_schedule'
          trigger_id: string | null
          tasks_updated: number
          domains_reprioritized: Json | null
          changes_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          triggered_by: 'question_session' | 'error_log' | 'practice_test_score' | 'manual' | 'behind_schedule'
          trigger_id?: string | null
          tasks_updated?: number
          domains_reprioritized?: Json | null
          changes_summary?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      topic_mastery: {
        Row: {
          id: string
          user_id: string
          domain_key: string
          domain_label: string
          subject: 'math' | 'reading_writing'
          mastery_score: number
          accuracy_score: number | null
          recent_accuracy: number | null
          improvement_factor: number | null
          mistake_cleanliness: number | null
          confidence_factor: number | null
          consistency_factor: number | null
          total_questions_attempted: number
          total_sessions: number
          computed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain_key: string
          domain_label: string
          subject: 'math' | 'reading_writing'
          mastery_score: number
          accuracy_score?: number | null
          recent_accuracy?: number | null
          improvement_factor?: number | null
          mistake_cleanliness?: number | null
          confidence_factor?: number | null
          consistency_factor?: number | null
          total_questions_attempted?: number
          total_sessions?: number
          computed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          mastery_score?: number
          accuracy_score?: number | null
          recent_accuracy?: number | null
          improvement_factor?: number | null
          mistake_cleanliness?: number | null
          confidence_factor?: number | null
          consistency_factor?: number | null
          total_questions_attempted?: number
          total_sessions?: number
          computed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          id: string
          user_id: string
          study_plan_id: string | null
          version_number: number
          triggered_by: string
          reason: string | null
          tasks_snapshot: Json
          tasks_updated: number
          predicted_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          study_plan_id?: string | null
          version_number: number
          triggered_by: string
          reason?: string | null
          tasks_snapshot?: Json
          tasks_updated?: number
          predicted_score?: number | null
          created_at?: string
        }
        Update: {
          tasks_updated?: number
          predicted_score?: number | null
        }
        Relationships: []
      }
      score_predictions: {
        Row: {
          id: string
          user_id: string
          predicted_score: number
          confidence_low: number
          confidence_high: number
          baseline_score: number | null
          consistency_factor: number | null
          session_count: number | null
          mastery_snapshot: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          predicted_score: number
          confidence_low: number
          confidence_high: number
          baseline_score?: number | null
          consistency_factor?: number | null
          session_count?: number | null
          mastery_snapshot?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_reminders_enabled: boolean
          inapp_reminders_enabled: boolean
          daily_assignment_reminder: boolean
          overdue_reminder: boolean
          practice_test_reminder: boolean
          reminder_time: string        // "HH:MM:SS" from PostgreSQL TIME
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_reminders_enabled?: boolean
          inapp_reminders_enabled?: boolean
          daily_assignment_reminder?: boolean
          overdue_reminder?: boolean
          practice_test_reminder?: boolean
          reminder_time?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          email_reminders_enabled?: boolean
          inapp_reminders_enabled?: boolean
          daily_assignment_reminder?: boolean
          overdue_reminder?: boolean
          practice_test_reminder?: boolean
          reminder_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_inventory: {
        Row: {
          id: string
          section: 'Reading and Writing' | 'Math'
          domain: string
          skill: string
          difficulty: 'easy' | 'medium' | 'hard'
          available_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section: 'Reading and Writing' | 'Math'
          domain: string
          skill: string
          difficulty: 'easy' | 'medium' | 'hard'
          available_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          section?: 'Reading and Writing' | 'Math'
          domain?: string
          skill?: string
          difficulty?: 'easy' | 'medium' | 'hard'
          available_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      question_inventory_with_active: {
        Row: {
          id: string
          section: 'Reading and Writing' | 'Math'
          domain: string
          skill: string
          difficulty: 'easy' | 'medium' | 'hard'
          available_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section: 'Reading and Writing' | 'Math'
          domain: string
          skill: string
          difficulty: 'easy' | 'medium' | 'hard'
          available_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          section?: 'Reading and Writing' | 'Math'
          domain?: string
          skill?: string
          difficulty?: 'easy' | 'medium' | 'hard'
          available_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_recommendations: {
        Row: {
          id: string
          user_id: string
          replan_audit_log_id: string | null
          domain_key: string | null
          domain_label: string | null
          recommendation_type: 'increase_volume' | 'reduce_volume' | 'intervention' | 'maintenance' | 'schedule_change' | 'recovery' | 'general'
          message: string
          old_mastery: number | null
          new_mastery: number | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          replan_audit_log_id?: string | null
          domain_key?: string | null
          domain_label?: string | null
          recommendation_type: 'increase_volume' | 'reduce_volume' | 'intervention' | 'maintenance' | 'schedule_change' | 'recovery' | 'general'
          message: string
          old_mastery?: number | null
          new_mastery?: number | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          id: string
          email: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          source?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
