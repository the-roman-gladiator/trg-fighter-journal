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
          created_at: string
          date: string
          discipline: Database["public"]["Enums"]["discipline"]
          feeling: Database["public"]["Enums"]["feeling"] | null
          first_movement: string | null
          id: string
          intensity: number | null
          notes: string | null
          opponent_action: string | null
          second_movement: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy: Database["public"]["Enums"]["strategy"] | null
          time: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          discipline: Database["public"]["Enums"]["discipline"]
          feeling?: Database["public"]["Enums"]["feeling"] | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          opponent_action?: string | null
          second_movement?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
          time?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          feeling?: Database["public"]["Enums"]["feeling"] | null
          first_movement?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          opponent_action?: string | null
          second_movement?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          strategy?: Database["public"]["Enums"]["strategy"] | null
          time?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
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
      discipline: "MMA" | "Muay Thai" | "K1" | "Wrestling" | "Grappling" | "BJJ"
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
      discipline: ["MMA", "Muay Thai", "K1", "Wrestling", "Grappling", "BJJ"],
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
    },
  },
} as const
