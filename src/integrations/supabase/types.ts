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
      agent_transfers: {
        Row: {
          call_sid: string
          client_id: string
          created_at: string
          id: string
          metadata: Json | null
          status: string
          transcript: string | null
          transfer_number: string
          transfer_reason: string | null
        }
        Insert: {
          call_sid: string
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          transcript?: string | null
          transfer_number: string
          transfer_reason?: string | null
        }
        Update: {
          call_sid?: string
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          transcript?: string | null
          transfer_number?: string
          transfer_reason?: string | null
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          client_id: string
          created_at: string
          duration_ms: number | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string
          id: string
          metadata: Json | null
          text_content: string | null
          voice_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_ms?: number | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          metadata?: Json | null
          text_content?: string | null
          voice_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_ms?: number | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          metadata?: Json | null
          text_content?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_audio_files_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "voice_ai_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      business_insights: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          metric_type: string
          metric_value: Json
          period_end: string
          period_start: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value: Json
          period_end: string
          period_start: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: Json
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_insights_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "voice_ai_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          business_name: string | null
          call_sid: string
          caller_number: string | null
          client_id: string
          conversation_stage: string | null
          cost_amount: number | null
          created_at: string
          duration_seconds: number | null
          end_time: string | null
          id: string
          intent: Database["public"]["Enums"]["intent"] | null
          metadata: Json | null
          outcome_type: string | null
          primary_intent: string | null
          prospect_name: string | null
          recording_url: string | null
          sentiment_score: number | null
          start_time: string
          status: string
          transcript: Json | null
          transcript_summary: string | null
          transfer_requested: boolean | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          call_sid: string
          caller_number?: string | null
          client_id: string
          conversation_stage?: string | null
          cost_amount?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["intent"] | null
          metadata?: Json | null
          outcome_type?: string | null
          primary_intent?: string | null
          prospect_name?: string | null
          recording_url?: string | null
          sentiment_score?: number | null
          start_time?: string
          status: string
          transcript?: Json | null
          transcript_summary?: string | null
          transfer_requested?: boolean | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          call_sid?: string
          caller_number?: string | null
          client_id?: string
          conversation_stage?: string | null
          cost_amount?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["intent"] | null
          metadata?: Json | null
          outcome_type?: string | null
          primary_intent?: string | null
          prospect_name?: string | null
          recording_url?: string | null
          sentiment_score?: number | null
          start_time?: string
          status?: string
          transcript?: Json | null
          transcript_summary?: string | null
          transfer_requested?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_call_sessions_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "voice_ai_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      conversation_logs: {
        Row: {
          audio_files_used: string[] | null
          call_sid: string
          client_id: string
          content: string
          created_at: string | null
          id: string
          message_type: string
          response_time_ms: number | null
          speaker: string
        }
        Insert: {
          audio_files_used?: string[] | null
          call_sid: string
          client_id: string
          content: string
          created_at?: string | null
          id?: string
          message_type: string
          response_time_ms?: number | null
          speaker: string
        }
        Update: {
          audio_files_used?: string[] | null
          call_sid?: string
          client_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string
          response_time_ms?: number | null
          speaker?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          calls_included: number | null
          created_at: string
          currency: string
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          monthly_base_fee: number | null
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          calls_included?: number | null
          created_at?: string
          currency?: string
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          monthly_base_fee?: number | null
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          calls_included?: number | null
          created_at?: string
          currency?: string
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          monthly_base_fee?: number | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          business_name: string | null
          called_at: string | null
          client_id: string
          created_at: string | null
          id: string
          industry: string | null
          notes: string | null
          phone_number: string
          priority: number | null
          prospect_name: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          called_at?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone_number: string
          priority?: number | null
          prospect_name?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          called_at?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone_number?: string
          priority?: number | null
          prospect_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      phone_number_pool: {
        Row: {
          assigned_at: string | null
          assigned_client_id: string | null
          id: string
          metadata: Json | null
          monthly_cost: number
          phone_number: string
          purchase_date: string
          region: string
          status: string
          twilio_sid: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_client_id?: string | null
          id?: string
          metadata?: Json | null
          monthly_cost?: number
          phone_number: string
          purchase_date?: string
          region: string
          status?: string
          twilio_sid: string
        }
        Update: {
          assigned_at?: string | null
          assigned_client_id?: string | null
          id?: string
          metadata?: Json | null
          monthly_cost?: number
          phone_number?: string
          purchase_date?: string
          region?: string
          status?: string
          twilio_sid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_phone_number_pool_assigned_client_id"
            columns: ["assigned_client_id"]
            isOneToOne: false
            referencedRelation: "voice_ai_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          base_calls: number
          base_price: number
          created_at: string
          currency: string
          id: string
          per_call_price: number
        }
        Insert: {
          base_calls?: number
          base_price: number
          created_at?: string
          currency: string
          id?: string
          per_call_price: number
        }
        Update: {
          base_calls?: number
          base_price?: number
          created_at?: string
          currency?: string
          id?: string
          per_call_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_address: string | null
          business_hours: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          email: string
          emergency_fee: number | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"]
          service_area: string | null
          service_fee: number | null
          services_offered: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email: string
          emergency_fee?: number | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          service_area?: string | null
          service_fee?: number | null
          services_offered?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string
          emergency_fee?: number | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          service_area?: string | null
          service_fee?: number | null
          services_offered?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          client_id: string
          cost_amount: number | null
          created_at: string
          id: string
          message_content: string
          message_type: string
          metadata: Json | null
          phone_number: string
          status: string
          twilio_sid: string | null
        }
        Insert: {
          client_id: string
          cost_amount?: number | null
          created_at?: string
          id?: string
          message_content: string
          message_type: string
          metadata?: Json | null
          phone_number: string
          status: string
          twilio_sid?: string | null
        }
        Update: {
          client_id?: string
          cost_amount?: number | null
          created_at?: string
          id?: string
          message_content?: string
          message_type?: string
          metadata?: Json | null
          phone_number?: string
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sms_logs_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "voice_ai_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          amount: number
          call_count: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          call_count?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          call_count?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_ai_clients: {
        Row: {
          active_hours: Json | null
          api_proxy_path: string | null
          audio_snippets: Json | null
          base_url: string | null
          business_context: Json | null
          business_hours: Json | null
          business_name: string
          call_transfer_enabled: boolean | null
          call_transfer_number: string | null
          client_id: string
          client_slug: string | null
          config: Json
          conversation_config: Json | null
          created_at: string
          greeting_message: string | null
          id: string
          industry: string
          phone_number: string | null
          port: number
          region: string
          status: string
          stt_config: Json | null
          system_prompt: string | null
          timezone: string | null
          transfer_context: string | null
          transfer_threshold: number | null
          tts_config: Json | null
          updated_at: string
          user_id: string
          voice_id: string | null
          webhook_url: string | null
        }
        Insert: {
          active_hours?: Json | null
          api_proxy_path?: string | null
          audio_snippets?: Json | null
          base_url?: string | null
          business_context?: Json | null
          business_hours?: Json | null
          business_name: string
          call_transfer_enabled?: boolean | null
          call_transfer_number?: string | null
          client_id: string
          client_slug?: string | null
          config?: Json
          conversation_config?: Json | null
          created_at?: string
          greeting_message?: string | null
          id?: string
          industry: string
          phone_number?: string | null
          port: number
          region: string
          status?: string
          stt_config?: Json | null
          system_prompt?: string | null
          timezone?: string | null
          transfer_context?: string | null
          transfer_threshold?: number | null
          tts_config?: Json | null
          updated_at?: string
          user_id: string
          voice_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          active_hours?: Json | null
          api_proxy_path?: string | null
          audio_snippets?: Json | null
          base_url?: string | null
          business_context?: Json | null
          business_hours?: Json | null
          business_name?: string
          call_transfer_enabled?: boolean | null
          call_transfer_number?: string | null
          client_id?: string
          client_slug?: string | null
          config?: Json
          conversation_config?: Json | null
          created_at?: string
          greeting_message?: string | null
          id?: string
          industry?: string
          phone_number?: string | null
          port?: number
          region?: string
          status?: string
          stt_config?: Json | null
          system_prompt?: string | null
          timezone?: string | null
          transfer_context?: string | null
          transfer_threshold?: number | null
          tts_config?: Json | null
          updated_at?: string
          user_id?: string
          voice_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_by_url_params: {
        Args: { p_clientname: string; p_industry: string; p_region: string }
        Returns: {
          api_proxy_path: string
          business_name: string
          client_id: string
          config: Json
          created_at: string
          industry: string
          phone_number: string
          port: number
          region: string
          status: string
          user_id: string
        }[]
      }
      get_client_dashboard_stats: {
        Args: { p_client_id: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_next_available_port: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_member" | "client"
      intent:
        | "Emergency Service"
        | "Appointment Booking"
        | "Quote Request"
        | "General Inquiry"
        | "Complaint"
        | "Follow up"
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
      app_role: ["admin", "team_member", "client"],
      intent: [
        "Emergency Service",
        "Appointment Booking",
        "Quote Request",
        "General Inquiry",
        "Complaint",
        "Follow up",
      ],
    },
  },
} as const
