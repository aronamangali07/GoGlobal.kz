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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      allocation_runs: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          offer_id: string
          params: Json
          result: Json
          run_by: string | null
          seed: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          offer_id: string
          params?: Json
          result: Json
          run_by?: string | null
          seed: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          params?: Json
          result?: Json
          run_by?: string | null
          seed?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_runs_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          lottery_rank: number | null
          match_score: number | null
          offer_id: string
          program_id: string
          status: Database["public"]["Enums"]["application_status"]
          ticket: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          lottery_rank?: number | null
          match_score?: number | null
          offer_id: string
          program_id: string
          status?: Database["public"]["Enums"]["application_status"]
          ticket?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          lottery_rank?: number | null
          match_score?: number | null
          offer_id?: string
          program_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          ticket?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: number
          program_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
          program_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          current_stage: Database["public"]["Enums"]["journey_stage"]
          id: string
          program_id: string
          stage_updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["journey_stage"]
          id?: string
          program_id: string
          stage_updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["journey_stage"]
          id?: string
          program_id?: string
          stage_updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          allocation_mode: Database["public"]["Enums"]["allocation_mode"]
          archived_at: string | null
          city: string
          code: string | null
          country: string
          created_at: string
          created_by: string | null
          fields: Json
          id: string
          interview_at: string | null
          interview_note: string
          is_test: boolean
          max_age: number | null
          min_age: number | null
          min_english: Database["public"]["Enums"]["english_level"] | null
          program_id: string
          published_at: string | null
          seats_total: number
          status: Database["public"]["Enums"]["offer_status"]
          subtitle: string
          title: string
          updated_at: string
          window_closes_at: string | null
          window_hours: number
          window_opens_at: string | null
        }
        Insert: {
          allocation_mode?: Database["public"]["Enums"]["allocation_mode"]
          archived_at?: string | null
          city?: string
          code?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          interview_at?: string | null
          interview_note?: string
          is_test?: boolean
          max_age?: number | null
          min_age?: number | null
          min_english?: Database["public"]["Enums"]["english_level"] | null
          program_id: string
          published_at?: string | null
          seats_total: number
          status?: Database["public"]["Enums"]["offer_status"]
          subtitle?: string
          title: string
          updated_at?: string
          window_closes_at?: string | null
          window_hours?: number
          window_opens_at?: string | null
        }
        Update: {
          allocation_mode?: Database["public"]["Enums"]["allocation_mode"]
          archived_at?: string | null
          city?: string
          code?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          interview_at?: string | null
          interview_note?: string
          is_test?: boolean
          max_age?: number | null
          min_age?: number | null
          min_english?: Database["public"]["Enums"]["english_level"] | null
          program_id?: string
          published_at?: string | null
          seats_total?: number
          status?: Database["public"]["Enums"]["offer_status"]
          subtitle?: string
          title?: string
          updated_at?: string
          window_closes_at?: string | null
          window_hours?: number
          window_opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          birth_date: string | null
          created_at: string
          email: string
          english_level: Database["public"]["Enums"]["english_level"] | null
          full_name: string | null
          id: string
          locale: string
          onboarded_at: string | null
          preferences: Json
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: number | null
          university: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          english_level?: Database["public"]["Enums"]["english_level"] | null
          full_name?: string | null
          id: string
          locale?: string
          onboarded_at?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          english_level?: Database["public"]["Enums"]["english_level"] | null
          full_name?: string | null
          id?: string
          locale?: string
          onboarded_at?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_managers: {
        Row: {
          created_at: string
          program_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          program_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_managers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          offer_schema: Json
          slug: string
          sort: number
          tagline: string
          translations: Json
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          offer_schema?: Json
          slug: string
          sort?: number
          tagline?: string
          translations?: Json
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          offer_schema?: Json
          slug?: string
          sort?: number
          tagline?: string
          translations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocation_inputs: {
        Args: { p_offer_id: string }
        Returns: {
          application_id: string
          avatar_path: string
          birth_date: string
          created_at: string
          english_level: string
          enrolled: boolean
          full_name: string
          has_place_elsewhere: boolean
          preferences: Json
          status: string
          user_id: string
        }[]
      }
      allocation_public: {
        Args: { p_offer_id: string }
        Returns: {
          confirmed_at: string
          ranks: Json
          seed: string
        }[]
      }
      apply_to_offer: { Args: { p_offer_id: string }; Returns: string }
      close_expired_offers: { Args: never; Returns: string[] }
      close_offer_window: { Args: { p_offer_id: string }; Returns: undefined }
      confirm_allocation: {
        Args: { p_note?: string; p_run_id: string; p_selected: string[] }
        Returns: undefined
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      decide_application: {
        Args: { p_application_id: string; p_decision: string; p_note?: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      log_action: {
        Args: {
          p_action: string
          p_diff?: Json
          p_entity_id: string
          p_entity_type: string
          p_program_id: string
        }
        Returns: undefined
      }
      manages_program: { Args: { p_program_id: string }; Returns: boolean }
      manages_student: { Args: { p_user_id: string }; Returns: boolean }
      offer_counts: {
        Args: { p_offer_ids: string[] }
        Returns: {
          applicants: number
          offer_id: string
          taken: number
        }[]
      }
      withdraw_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      allocation_mode: "lottery" | "manual"
      application_status:
        | "pending"
        | "ineligible"
        | "selected"
        | "waitlisted"
        | "approved"
        | "rejected"
        | "withdrawn"
      english_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      journey_stage:
        | "application"
        | "interview"
        | "offer"
        | "documents"
        | "embassy"
        | "visa"
        | "departure"
      offer_status: "draft" | "open" | "closed" | "allocated" | "archived"
      user_role: "student" | "manager" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      allocation_mode: ["lottery", "manual"],
      application_status: [
        "pending",
        "ineligible",
        "selected",
        "waitlisted",
        "approved",
        "rejected",
        "withdrawn",
      ],
      english_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      journey_stage: [
        "application",
        "interview",
        "offer",
        "documents",
        "embassy",
        "visa",
        "departure",
      ],
      offer_status: ["draft", "open", "closed", "allocated", "archived"],
      user_role: ["student", "manager", "admin"],
    },
  },
} as const
