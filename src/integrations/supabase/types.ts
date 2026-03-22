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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          level: Database["public"]["Enums"]["user_level"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          level?: Database["public"]["Enums"]["user_level"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      training_sessions: {
        Row: {
          avg_heart_rate: number | null
          avg_pace_seconds_per_km: number | null
          calories: number | null
          cardio_activity_name: string | null
          cardio_type: Database["public"]["Enums"]["cardio_type"] | null
          created_at: string
          date: string
          discipline: Database["public"]["Enums"]["discipline"]
          distance_meters: number | null
          duration_seconds: number | null
          feeling: Database["public"]["Enums"]["feeling"] | null
          first_movement: string | null
          id: string
          intensity: number | null
          max_heart_rate: number | null
          notes: string | null
          opponent_action: string | null
          second_movement: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy: Database["public"]["Enums"]["strategy"] | null
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
          avg_heart_rate?: number | null
          avg_pace_seconds_per_km?: number | null
          calories?: number | null
          cardio_activity_name?: string | null
          cardio_type?: Database["public"]["Enums"]["cardio_type"] | null
          created_at?: string
          date?: string
          discipline: Database["public"]["Enums"]["discipline"]
          distance_meters?: number | null
          duration_seconds?: number | null
          feeling?: Database["public"]["Enums"]["feeling"] | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          max_heart_rate?: number | null
          notes?: string | null
          opponent_action?: string | null
          second_movement?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
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
          avg_heart_rate?: number | null
          avg_pace_seconds_per_km?: number | null
          calories?: number | null
          cardio_activity_name?: string | null
          cardio_type?: Database["public"]["Enums"]["cardio_type"] | null
          created_at?: string
          date?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          distance_meters?: number | null
          duration_seconds?: number | null
          feeling?: Database["public"]["Enums"]["feeling"] | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          max_heart_rate?: number | null
          notes?: string | null
          opponent_action?: string | null
          second_movement?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
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
            foreignKeyName: "training_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          default_reps: number
          default_sets: number
          default_weight: number
          exercise_library_id: string | null
          exercise_name: string
          exercise_order: number
          id: string
          workout_template_id: string
        }
        Insert: {
          default_reps?: number
          default_sets?: number
          default_weight?: number
          exercise_library_id?: string | null
          exercise_name: string
          exercise_order?: number
          id?: string
          workout_template_id: string
        }
        Update: {
          default_reps?: number
          default_sets?: number
          default_weight?: number
          exercise_library_id?: string | null
          exercise_name?: string
          exercise_order?: number
          id?: string
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
          created_at: string
          description: string | null
          id: string
          name: string
          qr_code_value: string | null
          source_type: string
          updated_at: string
          user_id: string
          workout_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          qr_code_value?: string | null
          source_type?: string
          updated_at?: string
          user_id: string
          workout_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          qr_code_value?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
          workout_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      tactical_goal: ["Attacking", "Defending", "Countering", "Intercepting"],
      user_level: ["Beginner", "Intermediate", "Advanced", "Pro"],
      workout_mode: ["manual", "template", "qr"],
    },
  },
} as const
