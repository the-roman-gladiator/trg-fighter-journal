export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          model: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          model?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          model?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_fighter_notes: {
        Row: {
          advanced_variation: string | null
          athlete_id: string | null
          coach_explanation: string | null
          coach_id: string | null
          coach_reviewed: boolean
          created_at: string
          discipline: string | null
          id: string
          linked_pathway_node_id: string | null
          linked_session_id: string | null
          mistakes_to_avoid: Json
          movement_1: string | null
          movement_2: string | null
          movement_3: string | null
          neural_connections: Json
          neural_nodes: Json
          original_input: string
          save_type: string | null
          tactic: string | null
          technique: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advanced_variation?: string | null
          athlete_id?: string | null
          coach_explanation?: string | null
          coach_id?: string | null
          coach_reviewed?: boolean
          created_at?: string
          discipline?: string | null
          id?: string
          linked_pathway_node_id?: string | null
          linked_session_id?: string | null
          mistakes_to_avoid?: Json
          movement_1?: string | null
          movement_2?: string | null
          movement_3?: string | null
          neural_connections?: Json
          neural_nodes?: Json
          original_input: string
          save_type?: string | null
          tactic?: string | null
          technique?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advanced_variation?: string | null
          athlete_id?: string | null
          coach_explanation?: string | null
          coach_id?: string | null
          coach_reviewed?: boolean
          created_at?: string
          discipline?: string | null
          id?: string
          linked_pathway_node_id?: string | null
          linked_session_id?: string | null
          mistakes_to_avoid?: Json
          movement_1?: string | null
          movement_2?: string | null
          movement_3?: string | null
          neural_connections?: Json
          neural_nodes?: Json
          original_input?: string
          save_type?: string | null
          tactic?: string | null
          technique?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_message_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: string
          reason: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: string
          reason?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          error: string | null
          finish_reason: string | null
          id: string
          latency_ms: number | null
          linked_ai_note_id: string | null
          mode: string | null
          role: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          error?: string | null
          finish_reason?: string | null
          id?: string
          latency_ms?: number | null
          linked_ai_note_id?: string | null
          mode?: string | null
          role: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          error?: string | null
          finish_reason?: string | null
          id?: string
          latency_ms?: number | null
          linked_ai_note_id?: string | null
          mode?: string | null
          role?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          app_mode: string | null
          created_at: string
          event_category: string | null
          event_name: string
          id: string
          properties: Json
          route: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_mode?: string | null
          created_at?: string
          event_category?: string | null
          event_name: string
          id?: string
          properties?: Json
          route?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_mode?: string | null
          created_at?: string
          event_category?: string | null
          event_name?: string
          id?: string
          properties?: Json
          route?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      assigned_program_sessions: {
        Row: {
          assigned_program_id: string
          coach_signed_off: boolean | null
          completed_date: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string | null
          session_type: string
          status: string
          updated_at: string
          week_number: number
          workout_template_id: string | null
        }
        Insert: {
          assigned_program_id: string
          coach_signed_off?: boolean | null
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          session_type: string
          status?: string
          updated_at?: string
          week_number: number
          workout_template_id?: string | null
        }
        Update: {
          assigned_program_id?: string
          coach_signed_off?: boolean | null
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          session_type?: string
          status?: string
          updated_at?: string
          week_number?: number
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_program_sessions_assigned_program_id_fkey"
            columns: ["assigned_program_id"]
            isOneToOne: false
            referencedRelation: "assigned_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_program_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_programs: {
        Row: {
          active: boolean | null
          assessment_id: string | null
          cardio_sessions_per_week: number
          classification_result: string
          coach_override: boolean | null
          coach_override_reason: string | null
          created_at: string
          current_phase: string
          end_date: string | null
          id: string
          martial_arts_sessions_per_week: number
          phase_week_end: number
          phase_week_start: number
          reassessment_date: string | null
          start_date: string
          strength_sessions_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          assessment_id?: string | null
          cardio_sessions_per_week?: number
          classification_result: string
          coach_override?: boolean | null
          coach_override_reason?: string | null
          created_at?: string
          current_phase: string
          end_date?: string | null
          id?: string
          martial_arts_sessions_per_week?: number
          phase_week_end?: number
          phase_week_start?: number
          reassessment_date?: string | null
          start_date?: string
          strength_sessions_per_week?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          assessment_id?: string | null
          cardio_sessions_per_week?: number
          classification_result?: string
          coach_override?: boolean | null
          coach_override_reason?: string | null
          created_at?: string
          current_phase?: string
          end_date?: string | null
          id?: string
          martial_arts_sessions_per_week?: number
          phase_week_end?: number
          phase_week_start?: number
          reassessment_date?: string | null
          start_date?: string
          strength_sessions_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_programs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "user_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_plan_assignments: {
        Row: {
          assigned_by: string | null
          completed_sessions_count: number
          completion_percentage: number | null
          created_at: string
          current_session_number: number
          current_week: number
          id: string
          is_active: boolean | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          workout_plan_id: string
        }
        Insert: {
          assigned_by?: string | null
          completed_sessions_count?: number
          completion_percentage?: number | null
          created_at?: string
          current_session_number?: number
          current_week?: number
          id?: string
          is_active?: boolean | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
          workout_plan_id: string
        }
        Update: {
          assigned_by?: string | null
          completed_sessions_count?: number
          completion_percentage?: number | null
          created_at?: string
          current_session_number?: number
          current_week?: number
          id?: string
          is_active?: boolean | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_plan_assignments_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_plan_session_progress: {
        Row: {
          athlete_plan_assignment_id: string
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          id: string
          scheduled_date: string | null
          session_number: number
          started_at: string | null
          status: string
          updated_at: string
          week_number: number
          workout_log_id: string | null
          workout_template_id: string
        }
        Insert: {
          athlete_plan_assignment_id: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          id?: string
          scheduled_date?: string | null
          session_number: number
          started_at?: string | null
          status?: string
          updated_at?: string
          week_number: number
          workout_log_id?: string | null
          workout_template_id: string
        }
        Update: {
          athlete_plan_assignment_id?: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          id?: string
          scheduled_date?: string | null
          session_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          week_number?: number
          workout_log_id?: string | null
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_plan_session_progress_athlete_plan_assignment_id_fkey"
            columns: ["athlete_plan_assignment_id"]
            isOneToOne: false
            referencedRelation: "athlete_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_plan_session_progress_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_plan_session_progress_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_requests: {
        Row: {
          created_at: string
          email: string
          gym_team: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          gym_team?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          gym_team?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      body_composition_classifications: {
        Row: {
          assessment_id: string
          bmi_class: string
          bmi_value: number
          bodyfat_class: string | null
          created_at: string
          final_class: string
          id: string
          override_by_coach: boolean | null
          override_reason: string | null
          performance_class: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          bmi_class: string
          bmi_value: number
          bodyfat_class?: string | null
          created_at?: string
          final_class: string
          id?: string
          override_by_coach?: boolean | null
          override_reason?: string | null
          performance_class: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          bmi_class?: string
          bmi_value?: number
          bodyfat_class?: string | null
          created_at?: string
          final_class?: string
          id?: string
          override_by_coach?: boolean | null
          override_reason?: string | null
          performance_class?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_composition_classifications_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "user_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          assigned_disciplines: string[]
          coach_level: Database["public"]["Enums"]["coach_level"]
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string
          invited_by_level: Database["public"]["Enums"]["coach_level"]
          invited_email: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_disciplines?: string[]
          coach_level: Database["public"]["Enums"]["coach_level"]
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_by: string
          invited_by_level: Database["public"]["Enums"]["coach_level"]
          invited_email: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_disciplines?: string[]
          coach_level?: Database["public"]["Enums"]["coach_level"]
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_by?: string
          invited_by_level?: Database["public"]["Enums"]["coach_level"]
          invited_email?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_sessions: {
        Row: {
          created_at: string
          discipline: string
          drills: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          scheduled_date: string | null
          session_plan: string | null
          status: string
          target_level: string | null
          target_students: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline: string
          drills?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          session_plan?: string | null
          status?: string
          target_level?: string | null
          target_students?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline?: string
          drills?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          session_plan?: string | null
          status?: string
          target_level?: string | null
          target_students?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reflections: {
        Row: {
          content: string
          created_at: string
          id: string
          mood_tag: string | null
          reflection_date: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mood_tag?: string | null
          reflection_date?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mood_tag?: string | null
          reflection_date?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          route: string | null
          source: string
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message: string
          route?: string | null
          source?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message?: string
          route?: string | null
          source?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          category: string | null
          created_at: string
          equipment: string | null
          id: string
          is_custom: boolean
          muscle_group: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          is_custom?: boolean
          muscle_group?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          is_custom?: boolean
          muscle_group?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      fighter_profiles: {
        Row: {
          approved_at: string | null
          approved_by_head_coach: string | null
          approved_fight_disciplines: string[]
          created_at: string
          discipline_approved_at: string | null
          discipline_approved_by: string | null
          fighter_status: string
          id: string
          requested_fight_disciplines: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_head_coach?: string | null
          approved_fight_disciplines?: string[]
          created_at?: string
          discipline_approved_at?: string | null
          discipline_approved_by?: string | null
          fighter_status?: string
          id?: string
          requested_fight_disciplines?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_head_coach?: string | null
          approved_fight_disciplines?: string[]
          created_at?: string
          discipline_approved_at?: string | null
          discipline_approved_by?: string | null
          fighter_status?: string
          id?: string
          requested_fight_disciplines?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fighter_sessions: {
        Row: {
          action: string | null
          created_at: string
          discipline: string
          goal: string | null
          id: string
          notes: string | null
          opponent_scenario: string | null
          status: string
          strategy: string | null
          tactic: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          discipline: string
          goal?: string | null
          id?: string
          notes?: string | null
          opponent_scenario?: string | null
          status?: string
          strategy?: string | null
          tactic?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          discipline?: string
          goal?: string | null
          id?: string
          notes?: string | null
          opponent_scenario?: string | null
          status?: string
          strategy?: string | null
          tactic?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motivations_library: {
        Row: {
          created_at: string
          day_number: number
          id: string
          is_active: boolean
          motivation_text: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          is_active?: boolean
          motivation_text: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          is_active?: boolean
          motivation_text?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          daily_motivation_days: string[]
          daily_motivation_enabled: boolean
          daily_motivation_time: string
          enter_session_days: string[]
          enter_session_enabled: boolean
          enter_session_time: string
          id: string
          my_statement_days: string[]
          my_statement_enabled: boolean
          my_statement_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_motivation_days?: string[]
          daily_motivation_enabled?: boolean
          daily_motivation_time?: string
          enter_session_days?: string[]
          enter_session_enabled?: boolean
          enter_session_time?: string
          id?: string
          my_statement_days?: string[]
          my_statement_enabled?: boolean
          my_statement_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_motivation_days?: string[]
          daily_motivation_enabled?: boolean
          daily_motivation_time?: string
          enter_session_days?: string[]
          enter_session_enabled?: boolean
          enter_session_time?: string
          id?: string
          my_statement_days?: string[]
          my_statement_enabled?: boolean
          my_statement_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pathway_edges: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          source_node_id: string
          target_node_id: string
          user_id: string
          visual_strength: number
        }
        Insert: {
          connection_type?: string
          created_at?: string
          id?: string
          source_node_id: string
          target_node_id: string
          user_id: string
          visual_strength?: number
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          source_node_id?: string
          target_node_id?: string
          user_id?: string
          visual_strength?: number
        }
        Relationships: [
          {
            foreignKeyName: "pathway_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "pathway_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "pathway_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_nodes: {
        Row: {
          color_tag: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_root: boolean
          node_type: string
          position_x: number
          position_y: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_tag?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_root?: boolean
          node_type?: string
          position_x?: number
          position_y?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_tag?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_root?: boolean
          node_type?: string
          position_x?: number
          position_y?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_by: string | null
          assigned_by_coach: boolean | null
          assigned_disciplines: string[]
          coach_discipline: string | null
          coach_level: Database["public"]["Enums"]["coach_level"] | null
          coach_override_enabled: boolean | null
          created_at: string
          custom_motivation_text: string | null
          daily_motivation_mode: string
          discipline: string | null
          email: string
          fitness_level: string | null
          fixed_motivation_id: string | null
          hierarchy_delegation_enabled: boolean
          id: string
          invited_by: string | null
          level: Database["public"]["Enums"]["user_level"]
          middle_name: string | null
          my_statement: string | null
          name: string
          nickname: string | null
          strength_level: string | null
          strength_program_start_date: string | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          assigned_by_coach?: boolean | null
          assigned_disciplines?: string[]
          coach_discipline?: string | null
          coach_level?: Database["public"]["Enums"]["coach_level"] | null
          coach_override_enabled?: boolean | null
          created_at?: string
          custom_motivation_text?: string | null
          daily_motivation_mode?: string
          discipline?: string | null
          email: string
          fitness_level?: string | null
          fixed_motivation_id?: string | null
          hierarchy_delegation_enabled?: boolean
          id: string
          invited_by?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          middle_name?: string | null
          my_statement?: string | null
          name: string
          nickname?: string | null
          strength_level?: string | null
          strength_program_start_date?: string | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          assigned_by_coach?: boolean | null
          assigned_disciplines?: string[]
          coach_discipline?: string | null
          coach_level?: Database["public"]["Enums"]["coach_level"] | null
          coach_override_enabled?: boolean | null
          created_at?: string
          custom_motivation_text?: string | null
          daily_motivation_mode?: string
          discipline?: string | null
          email?: string
          fitness_level?: string | null
          fixed_motivation_id?: string | null
          hierarchy_delegation_enabled?: boolean
          id?: string
          invited_by?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          middle_name?: string | null
          my_statement?: string | null
          name?: string
          nickname?: string | null
          strength_level?: string | null
          strength_program_start_date?: string | null
          surname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_tags: {
        Row: {
          created_at: string
          id: string
          session_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_tags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_workout_exercises: {
        Row: {
          created_at: string
          exercise_library_id: string | null
          exercise_name: string
          exercise_order: number
          id: string
          template_exercise_id: string | null
          training_session_id: string
        }
        Insert: {
          created_at?: string
          exercise_library_id?: string | null
          exercise_name: string
          exercise_order?: number
          id?: string
          template_exercise_id?: string | null
          training_session_id: string
        }
        Update: {
          created_at?: string
          exercise_library_id?: string | null
          exercise_name?: string
          exercise_order?: number
          id?: string
          template_exercise_id?: string | null
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_workout_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_workout_exercises_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_workout_exercises_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_workout_sets: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reps: number | null
          set_number: number
          strength_workout_exercise_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reps?: number | null
          set_number?: number
          strength_workout_exercise_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reps?: number | null
          set_number?: number
          strength_workout_exercise_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_workout_sets_strength_workout_exercise_id_fkey"
            columns: ["strength_workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "strength_workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      technique_archive: {
        Row: {
          class_type: string | null
          created_at: string
          disciplines: string[]
          id: string
          neural_pathway_data: Json | null
          notes: string | null
          owner_user_id: string
          source_session_id: string | null
          strategy: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          class_type?: string | null
          created_at?: string
          disciplines?: string[]
          id?: string
          neural_pathway_data?: Json | null
          notes?: string | null
          owner_user_id: string
          source_session_id?: string | null
          strategy?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          class_type?: string | null
          created_at?: string
          disciplines?: string[]
          id?: string
          neural_pathway_data?: Json | null
          notes?: string | null
          owner_user_id?: string
          source_session_id?: string | null
          strategy?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      technique_chains: {
        Row: {
          continuation_finish: string
          created_at: string
          custom_notes: string | null
          defender_reaction: string
          discipline: Database["public"]["Enums"]["discipline"]
          id: string
          starting_action: string
          sub_type: string
          tactical_goal: Database["public"]["Enums"]["tactical_goal"]
          training_session_id: string
          updated_at: string
        }
        Insert: {
          continuation_finish: string
          created_at?: string
          custom_notes?: string | null
          defender_reaction: string
          discipline: Database["public"]["Enums"]["discipline"]
          id?: string
          starting_action: string
          sub_type: string
          tactical_goal: Database["public"]["Enums"]["tactical_goal"]
          training_session_id: string
          updated_at?: string
        }
        Update: {
          continuation_finish?: string
          created_at?: string
          custom_notes?: string | null
          defender_reaction?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          id?: string
          starting_action?: string
          sub_type?: string
          tactical_goal?: Database["public"]["Enums"]["tactical_goal"]
          training_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_chains_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_library: {
        Row: {
          category: string
          created_at: string
          discipline: string
          id: string
          image_url: string | null
          name_en: string
          name_original: string | null
          sort_order: number
          updated_at: string
          youtube_search_query: string | null
        }
        Insert: {
          category: string
          created_at?: string
          discipline: string
          id?: string
          image_url?: string | null
          name_en: string
          name_original?: string | null
          sort_order?: number
          updated_at?: string
          youtube_search_query?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          discipline?: string
          id?: string
          image_url?: string | null
          name_en?: string
          name_original?: string | null
          sort_order?: number
          updated_at?: string
          youtube_search_query?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          after_emotion: string | null
          after_mindset: string | null
          attempts_count: number | null
          avg_heart_rate: number | null
          avg_pace_seconds_per_km: number | null
          before_emotion: string | null
          before_mindset: string | null
          calories: number | null
          cardio_activity_name: string | null
          cardio_type: Database["public"]["Enums"]["cardio_type"] | null
          class_type: string | null
          coach_session_id: string | null
          created_at: string
          date: string
          discipline: Database["public"]["Enums"]["discipline"]
          disciplines: string[]
          distance_meters: number | null
          duration_seconds: number | null
          effort_score: number | null
          executed_count: number | null
          execution_rate: number | null
          feeling: Database["public"]["Enums"]["feeling"] | null
          fighter_profile_id: string | null
          first_movement: string | null
          id: string
          intensity: number | null
          is_fighter_stat_eligible: boolean
          make_fighter_note: boolean
          max_heart_rate: number | null
          mental_effort_level: string | null
          mindset_effort_execution: string | null
          notes: string | null
          opponent_action: string | null
          physical_effort_execution: string | null
          physical_effort_level: string | null
          second_movement: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy: Database["public"]["Enums"]["strategy"] | null
          technique: string | null
          time: string | null
          title: string | null
          total_exercises: number | null
          total_load: number | null
          total_reps: number | null
          total_sets: number | null
          updated_at: string
          user_id: string
          workout_mode: Database["public"]["Enums"]["workout_mode"] | null
          workout_name: string | null
          workout_template_id: string | null
          workout_type: string | null
        }
        Insert: {
          after_emotion?: string | null
          after_mindset?: string | null
          attempts_count?: number | null
          avg_heart_rate?: number | null
          avg_pace_seconds_per_km?: number | null
          before_emotion?: string | null
          before_mindset?: string | null
          calories?: number | null
          cardio_activity_name?: string | null
          cardio_type?: Database["public"]["Enums"]["cardio_type"] | null
          class_type?: string | null
          coach_session_id?: string | null
          created_at?: string
          date?: string
          discipline: Database["public"]["Enums"]["discipline"]
          disciplines?: string[]
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          executed_count?: number | null
          execution_rate?: number | null
          feeling?: Database["public"]["Enums"]["feeling"] | null
          fighter_profile_id?: string | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          is_fighter_stat_eligible?: boolean
          make_fighter_note?: boolean
          max_heart_rate?: number | null
          mental_effort_level?: string | null
          mindset_effort_execution?: string | null
          notes?: string | null
          opponent_action?: string | null
          physical_effort_execution?: string | null
          physical_effort_level?: string | null
          second_movement?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
          technique?: string | null
          time?: string | null
          title?: string | null
          total_exercises?: number | null
          total_load?: number | null
          total_reps?: number | null
          total_sets?: number | null
          updated_at?: string
          user_id: string
          workout_mode?: Database["public"]["Enums"]["workout_mode"] | null
          workout_name?: string | null
          workout_template_id?: string | null
          workout_type?: string | null
        }
        Update: {
          after_emotion?: string | null
          after_mindset?: string | null
          attempts_count?: number | null
          avg_heart_rate?: number | null
          avg_pace_seconds_per_km?: number | null
          before_emotion?: string | null
          before_mindset?: string | null
          calories?: number | null
          cardio_activity_name?: string | null
          cardio_type?: Database["public"]["Enums"]["cardio_type"] | null
          class_type?: string | null
          coach_session_id?: string | null
          created_at?: string
          date?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          disciplines?: string[]
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          executed_count?: number | null
          execution_rate?: number | null
          feeling?: Database["public"]["Enums"]["feeling"] | null
          fighter_profile_id?: string | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          is_fighter_stat_eligible?: boolean
          make_fighter_note?: boolean
          max_heart_rate?: number | null
          mental_effort_level?: string | null
          mindset_effort_execution?: string | null
          notes?: string | null
          opponent_action?: string | null
          physical_effort_execution?: string | null
          physical_effort_level?: string | null
          second_movement?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
          technique?: string | null
          time?: string | null
          title?: string | null
          total_exercises?: number | null
          total_load?: number | null
          total_reps?: number | null
          total_sets?: number | null
          updated_at?: string
          user_id?: string
          workout_mode?: Database["public"]["Enums"]["workout_mode"] | null
          workout_name?: string | null
          workout_template_id?: string | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_coach_session_id_fkey"
            columns: ["coach_session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assessments: {
        Row: {
          age: number
          assessment_date: string
          body_fat_percent: number | null
          coach_id: string | null
          created_at: string
          discipline: string
          height_cm: number
          id: string
          notes: string | null
          plank_seconds: number | null
          pushups_max: number
          sex: string
          situps_max: number
          squats_max: number
          updated_at: string
          user_id: string
          walking_hr_recovery: number | null
          weight_kg: number
        }
        Insert: {
          age: number
          assessment_date?: string
          body_fat_percent?: number | null
          coach_id?: string | null
          created_at?: string
          discipline: string
          height_cm: number
          id?: string
          notes?: string | null
          plank_seconds?: number | null
          pushups_max?: number
          sex: string
          situps_max?: number
          squats_max?: number
          updated_at?: string
          user_id: string
          walking_hr_recovery?: number | null
          weight_kg: number
        }
        Update: {
          age?: number
          assessment_date?: string
          body_fat_percent?: number | null
          coach_id?: string | null
          created_at?: string
          discipline?: string
          height_cm?: number
          id?: string
          notes?: string | null
          plank_seconds?: number | null
          pushups_max?: number
          sex?: string
          situps_max?: number
          squats_max?: number
          updated_at?: string
          user_id?: string
          walking_hr_recovery?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      user_custom_lists: {
        Row: {
          created_at: string
          discipline_key: string | null
          id: string
          is_active: boolean
          item_name: string
          list_type: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline_key?: string | null
          id?: string
          is_active?: boolean
          item_name: string
          list_type: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline_key?: string | null
          id?: string
          is_active?: boolean
          item_name?: string
          list_type?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          discipline_colors: Json
          id: string
          input_text_color: string
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline_colors?: Json
          id?: string
          input_text_color?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline_colors?: Json
          id?: string
          input_text_color?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_log_exercises: {
        Row: {
          completed_distance: string | null
          completed_duration: string | null
          completed_reps: number | null
          created_at: string
          exercise_name: string
          exercise_order: number
          id: string
          is_completed: boolean | null
          is_skipped: boolean | null
          notes: string | null
          set_number: number
          target_distance: string | null
          target_duration: string | null
          target_reps: number | null
          target_weight: number | null
          used_weight: number | null
          workout_log_id: string
        }
        Insert: {
          completed_distance?: string | null
          completed_duration?: string | null
          completed_reps?: number | null
          created_at?: string
          exercise_name: string
          exercise_order?: number
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          notes?: string | null
          set_number?: number
          target_distance?: string | null
          target_duration?: string | null
          target_reps?: number | null
          target_weight?: number | null
          used_weight?: number | null
          workout_log_id: string
        }
        Update: {
          completed_distance?: string | null
          completed_duration?: string | null
          completed_reps?: number | null
          created_at?: string
          exercise_name?: string
          exercise_order?: number
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          notes?: string | null
          set_number?: number
          target_distance?: string | null
          target_duration?: string | null
          target_reps?: number | null
          target_weight?: number | null
          used_weight?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_exercises_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          discipline: string | null
          id: string
          level: string | null
          overall_notes: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          week_number: number | null
          workout_template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          discipline?: string | null
          id?: string
          level?: string | null
          overall_notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          week_number?: number | null
          workout_template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          discipline?: string | null
          id?: string
          level?: string | null
          overall_notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          week_number?: number | null
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_sessions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          session_label: string | null
          session_number: number
          updated_at: string
          week_number: number
          workout_plan_id: string
          workout_template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          session_label?: string | null
          session_number: number
          updated_at?: string
          week_number: number
          workout_plan_id: string
          workout_template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          session_label?: string | null
          session_number?: number
          updated_at?: string
          week_number?: number
          workout_plan_id?: string
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_weeks: {
        Row: {
          created_at: string
          id: string
          phase_label: string
          updated_at: string
          week_number: number
          weekly_goal: string | null
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase_label: string
          updated_at?: string
          week_number: number
          weekly_goal?: string | null
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phase_label?: string
          updated_at?: string
          week_number?: number
          weekly_goal?: string | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_weeks_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          auto_progression_enabled: boolean | null
          coach_override_allowed: boolean | null
          created_at: string
          description: string | null
          discipline: string
          duration_weeks: number
          id: string
          is_active: boolean | null
          level: string
          name: string
          progression_weeks_1_4: string | null
          progression_weeks_5_8: string | null
          progression_weeks_9_12: string | null
          sessions_per_week: number
          updated_at: string
        }
        Insert: {
          auto_progression_enabled?: boolean | null
          coach_override_allowed?: boolean | null
          created_at?: string
          description?: string | null
          discipline: string
          duration_weeks?: number
          id?: string
          is_active?: boolean | null
          level: string
          name: string
          progression_weeks_1_4?: string | null
          progression_weeks_5_8?: string | null
          progression_weeks_9_12?: string | null
          sessions_per_week?: number
          updated_at?: string
        }
        Update: {
          auto_progression_enabled?: boolean | null
          coach_override_allowed?: boolean | null
          created_at?: string
          description?: string | null
          discipline?: string
          duration_weeks?: number
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          progression_weeks_1_4?: string | null
          progression_weeks_5_8?: string | null
          progression_weeks_9_12?: string | null
          sessions_per_week?: number
          updated_at?: string
        }
        Relationships: []
      }
      workout_template_exercises: {
        Row: {
          default_distance: string | null
          default_duration: string | null
          default_reps: number
          default_rounds: number | null
          default_sets: number
          default_weight: number
          exercise_library_id: string | null
          exercise_name: string
          exercise_order: number
          id: string
          notes: string | null
          workout_template_id: string
        }
        Insert: {
          default_distance?: string | null
          default_duration?: string | null
          default_reps?: number
          default_rounds?: number | null
          default_sets?: number
          default_weight?: number
          exercise_library_id?: string | null
          exercise_name: string
          exercise_order?: number
          id?: string
          notes?: string | null
          workout_template_id: string
        }
        Update: {
          default_distance?: string | null
          default_duration?: string | null
          default_reps?: number
          default_rounds?: number | null
          default_sets?: number
          default_weight?: number
          exercise_library_id?: string | null
          exercise_name?: string
          exercise_order?: number
          id?: string
          notes?: string | null
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          coach_override_allowed: boolean | null
          created_at: string
          description: string | null
          discipline: string | null
          duration_weeks: number | null
          goal: string | null
          id: string
          is_active: boolean | null
          level: string | null
          name: string
          override_rule: string | null
          progression_weeks_1_4: string | null
          progression_weeks_5_8: string | null
          progression_weeks_9_12: string | null
          qr_code_value: string | null
          source_type: string
          system_rule: string | null
          updated_at: string
          user_id: string | null
          workout_type: string | null
        }
        Insert: {
          category?: string | null
          coach_override_allowed?: boolean | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name: string
          override_rule?: string | null
          progression_weeks_1_4?: string | null
          progression_weeks_5_8?: string | null
          progression_weeks_9_12?: string | null
          qr_code_value?: string | null
          source_type?: string
          system_rule?: string | null
          updated_at?: string
          user_id?: string | null
          workout_type?: string | null
        }
        Update: {
          category?: string | null
          coach_override_allowed?: boolean | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name?: string
          override_rule?: string | null
          progression_weeks_1_4?: string | null
          progression_weeks_5_8?: string | null
          progression_weeks_9_12?: string | null
          qr_code_value?: string | null
          source_type?: string
          system_rule?: string | null
          updated_at?: string
          user_id?: string | null
          workout_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_invite_coach_level: {
        Args: {
          _inviter: string
          _target_level: Database["public"]["Enums"]["coach_level"]
        }
        Returns: boolean
      }
      coach_can_access_discipline: {
        Args: { _discipline: string; _user_id: string }
        Returns: boolean
      }
      delegated_nominations_enabled: { Args: never; Returns: boolean }
      delete_my_personal_data: { Args: never; Returns: Json }
      get_coach_disciplines: { Args: { _user_id: string }; Returns: string[] }
      get_coach_level: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["coach_level"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_head_coach: { Args: { _user_id: string }; Returns: boolean }
      is_pro_user: { Args: { _user_id: string }; Returns: boolean }
      promote_existing_user_to_coach: {
        Args: {
          _coach_level: Database["public"]["Enums"]["coach_level"]
          _disciplines: string[]
          _email: string
        }
        Returns: Json
      }
      redeem_coach_invitation: { Args: { _code: string }; Returns: Json }
      user_has_fighter_profile: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "athlete" | "coach" | "admin"
      approval_status: "pending" | "approved" | "rejected"
      cardio_type:
        | "Running"
        | "Walking"
        | "Bike"
        | "Rowing"
        | "AssaultBike"
        | "Swimming"
        | "StairClimber"
        | "Hiking"
        | "JumpRope"
        | "Other"
      coach_level: "head_coach" | "main_coach" | "level_2" | "level_1"
      discipline:
        | "MMA"
        | "Muay Thai"
        | "K1"
        | "Wrestling"
        | "Grappling"
        | "BJJ"
        | "Strength Training"
        | "Cardio Activity"
      feeling: "Fresh" | "Normal" | "Tired" | "Injured" | "On Fire"
      session_type: "Planned" | "Completed"
      strategy:
        | "Attacking"
        | "Defending"
        | "Countering"
        | "Intercepting"
        | "Transitions"
        | "Control"
      subscription_status: "active" | "cancelled" | "expired" | "trial"
      subscription_tier: "free" | "fighter" | "coach" | "pro" | "pro_coach"
      tactical_goal: "Attacking" | "Defending" | "Countering" | "Intercepting"
      user_level: "Beginner" | "Intermediate" | "Advanced" | "Pro"
      workout_mode: "manual" | "template" | "qr"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["athlete", "coach", "admin"],
      approval_status: ["pending", "approved", "rejected"],
      cardio_type: [
        "Running",
        "Walking",
        "Bike",
        "Rowing",
        "AssaultBike",
        "Swimming",
        "StairClimber",
        "Hiking",
        "JumpRope",
        "Other",
      ],
      coach_level: ["head_coach", "main_coach", "level_2", "level_1"],
      discipline: [
        "MMA",
        "Muay Thai",
        "K1",
        "Wrestling",
        "Grappling",
        "BJJ",
        "Strength Training",
        "Cardio Activity",
      ],
      feeling: ["Fresh", "Normal", "Tired", "Injured", "On Fire"],
      session_type: ["Planned", "Completed"],
      strategy: [
        "Attacking",
        "Defending",
        "Countering",
        "Intercepting",
        "Transitions",
        "Control",
      ],
      subscription_status: ["active", "cancelled", "expired", "trial"],
      subscription_tier: ["free", "fighter", "coach", "pro", "pro_coach"],
      tactical_goal: ["Attacking", "Defending", "Countering", "Intercepting"],
      user_level: ["Beginner", "Intermediate", "Advanced", "Pro"],
      workout_mode: ["manual", "template", "qr"],
    },
  },
} as const
