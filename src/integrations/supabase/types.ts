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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      controls: {
        Row: {
          agent_id: string
          autre_tarif: number | null
          autre_tarif_amount: number | null
          control_date: string
          control_time: string
          created_at: string
          destination: string | null
          doc_naissance: number | null
          doc_naissance_amount: number | null
          id: string
          location: string
          location_type: Database["public"]["Enums"]["location_type"]
          nb_en_regle: number
          nb_passagers: number
          notes: string | null
          origin: string | null
          platform_number: string | null
          pv: number
          pv_absence_titre: number | null
          pv_absence_titre_amount: number | null
          pv_autre: number | null
          pv_autre_amount: number | null
          pv_refus_controle: number | null
          pv_refus_controle_amount: number | null
          pv_titre_invalide: number | null
          pv_titre_invalide_amount: number | null
          ri_negative: number
          ri_positive: number
          rnv: number
          rnv_amount: number | null
          stt_100: number
          stt_100_amount: number | null
          stt_50: number
          stt_50_amount: number | null
          tarif_bord_autre: number | null
          tarif_bord_autre_amount: number | null
          tarif_bord_doc_naissance: number | null
          tarif_bord_doc_naissance_amount: number | null
          tarif_bord_rnv: number | null
          tarif_bord_rnv_amount: number | null
          tarif_bord_stt_100: number | null
          tarif_bord_stt_100_amount: number | null
          tarif_bord_stt_50: number | null
          tarif_bord_stt_50_amount: number | null
          tarif_bord_titre_tiers: number | null
          tarif_bord_titre_tiers_amount: number | null
          tarifs_controle: number
          team_id: string | null
          titre_tiers: number | null
          titre_tiers_amount: number | null
          train_number: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          autre_tarif?: number | null
          autre_tarif_amount?: number | null
          control_date?: string
          control_time?: string
          created_at?: string
          destination?: string | null
          doc_naissance?: number | null
          doc_naissance_amount?: number | null
          id?: string
          location: string
          location_type?: Database["public"]["Enums"]["location_type"]
          nb_en_regle?: number
          nb_passagers?: number
          notes?: string | null
          origin?: string | null
          platform_number?: string | null
          pv?: number
          pv_absence_titre?: number | null
          pv_absence_titre_amount?: number | null
          pv_autre?: number | null
          pv_autre_amount?: number | null
          pv_refus_controle?: number | null
          pv_refus_controle_amount?: number | null
          pv_titre_invalide?: number | null
          pv_titre_invalide_amount?: number | null
          ri_negative?: number
          ri_positive?: number
          rnv?: number
          rnv_amount?: number | null
          stt_100?: number
          stt_100_amount?: number | null
          stt_50?: number
          stt_50_amount?: number | null
          tarif_bord_autre?: number | null
          tarif_bord_autre_amount?: number | null
          tarif_bord_doc_naissance?: number | null
          tarif_bord_doc_naissance_amount?: number | null
          tarif_bord_rnv?: number | null
          tarif_bord_rnv_amount?: number | null
          tarif_bord_stt_100?: number | null
          tarif_bord_stt_100_amount?: number | null
          tarif_bord_stt_50?: number | null
          tarif_bord_stt_50_amount?: number | null
          tarif_bord_titre_tiers?: number | null
          tarif_bord_titre_tiers_amount?: number | null
          tarifs_controle?: number
          team_id?: string | null
          titre_tiers?: number | null
          titre_tiers_amount?: number | null
          train_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          autre_tarif?: number | null
          autre_tarif_amount?: number | null
          control_date?: string
          control_time?: string
          created_at?: string
          destination?: string | null
          doc_naissance?: number | null
          doc_naissance_amount?: number | null
          id?: string
          location?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          nb_en_regle?: number
          nb_passagers?: number
          notes?: string | null
          origin?: string | null
          platform_number?: string | null
          pv?: number
          pv_absence_titre?: number | null
          pv_absence_titre_amount?: number | null
          pv_autre?: number | null
          pv_autre_amount?: number | null
          pv_refus_controle?: number | null
          pv_refus_controle_amount?: number | null
          pv_titre_invalide?: number | null
          pv_titre_invalide_amount?: number | null
          ri_negative?: number
          ri_positive?: number
          rnv?: number
          rnv_amount?: number | null
          stt_100?: number
          stt_100_amount?: number | null
          stt_50?: number
          stt_50_amount?: number | null
          tarif_bord_autre?: number | null
          tarif_bord_autre_amount?: number | null
          tarif_bord_doc_naissance?: number | null
          tarif_bord_doc_naissance_amount?: number | null
          tarif_bord_rnv?: number | null
          tarif_bord_rnv_amount?: number | null
          tarif_bord_stt_100?: number | null
          tarif_bord_stt_100_amount?: number | null
          tarif_bord_stt_50?: number | null
          tarif_bord_stt_50_amount?: number | null
          tarif_bord_titre_tiers?: number | null
          tarif_bord_titre_tiers_amount?: number | null
          tarifs_controle?: number
          team_id?: string | null
          titre_tiers?: number | null
          titre_tiers_amount?: number | null
          train_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controls_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          matricule: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          matricule?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          matricule?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          bottom_bar_pages: Json | null
          created_at: string
          data_auto_save: boolean
          data_keep_history_days: number
          default_page: string
          display_compact_mode: boolean
          display_show_totals: boolean
          history_view_mode: string
          id: string
          navigation_style: string
          notifications_email: boolean
          notifications_fraud_alerts: boolean
          notifications_new_controls: boolean
          notifications_push: boolean
          pdf_orientation: string
          show_bottom_bar: boolean | null
          show_burger_menu: boolean | null
          show_onboard_fraud_chart: boolean
          theme: string
          theme_variant: string
          updated_at: string
          user_id: string
          visible_pages: Json
        }
        Insert: {
          bottom_bar_pages?: Json | null
          created_at?: string
          data_auto_save?: boolean
          data_keep_history_days?: number
          default_page?: string
          display_compact_mode?: boolean
          display_show_totals?: boolean
          history_view_mode?: string
          id?: string
          navigation_style?: string
          notifications_email?: boolean
          notifications_fraud_alerts?: boolean
          notifications_new_controls?: boolean
          notifications_push?: boolean
          pdf_orientation?: string
          show_bottom_bar?: boolean | null
          show_burger_menu?: boolean | null
          show_onboard_fraud_chart?: boolean
          theme?: string
          theme_variant?: string
          updated_at?: string
          user_id: string
          visible_pages?: Json
        }
        Update: {
          bottom_bar_pages?: Json | null
          created_at?: string
          data_auto_save?: boolean
          data_keep_history_days?: number
          default_page?: string
          display_compact_mode?: boolean
          display_show_totals?: boolean
          history_view_mode?: string
          id?: string
          navigation_style?: string
          notifications_email?: boolean
          notifications_fraud_alerts?: boolean
          notifications_new_controls?: boolean
          notifications_push?: boolean
          pdf_orientation?: string
          show_bottom_bar?: boolean | null
          show_burger_menu?: boolean | null
          show_onboard_fraud_chart?: boolean
          theme?: string
          theme_variant?: string
          updated_at?: string
          user_id?: string
          visible_pages?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_profile_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_team_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_manager_of_team: { Args: { p_team_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "agent" | "manager" | "admin"
      location_type: "train" | "gare" | "quai"
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
      app_role: ["agent", "manager", "admin"],
      location_type: ["train", "gare", "quai"],
    },
  },
} as const
