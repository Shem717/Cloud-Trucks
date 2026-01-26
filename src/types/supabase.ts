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
      booked_loads: {
        Row: {
          broker: string | null
          cloudtrucks_load_id: string | null
          created_at: string | null
          destination: string
          equipment: string | null
          id: string
          origin: string
          pickup_date: string | null
          rate: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          broker?: string | null
          cloudtrucks_load_id?: string | null
          created_at?: string | null
          destination: string
          equipment?: string | null
          id?: string
          origin: string
          pickup_date?: string | null
          rate?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          broker?: string | null
          cloudtrucks_load_id?: string | null
          created_at?: string | null
          destination?: string
          equipment?: string | null
          id?: string
          origin?: string
          pickup_date?: string | null
          rate?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chain_laws: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_updated: string
          route_name: string
          state: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_updated?: string
          route_name: string
          state: string
          status: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_updated?: string
          route_name?: string
          state?: string
          status?: string
        }
        Relationships: []
      }
      cloudtrucks_credentials: {
        Row: {
          created_at: string | null
          encrypted_csrf_token: string | null
          encrypted_email: string
          encrypted_session_cookie: string
          is_valid: boolean | null
          last_validated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_csrf_token?: string | null
          encrypted_email: string
          encrypted_session_cookie: string
          is_valid?: boolean | null
          last_validated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_csrf_token?: string | null
          encrypted_email?: string
          encrypted_session_cookie?: string
          is_valid?: boolean | null
          last_validated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interested_loads: {
        Row: {
          cloudtrucks_load_id: string
          created_at: string | null
          details: Json
          id: string
          last_checked_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          cloudtrucks_load_id: string
          created_at?: string | null
          details: Json
          id?: string
          last_checked_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          cloudtrucks_load_id?: string
          created_at?: string | null
          details?: Json
          id?: string
          last_checked_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      search_criteria: {
        Row: {
          active: boolean | null
          booking_type: string | null
          created_at: string | null
          deleted_at: string | null
          dest_city: string | null
          destination_state: string | null
          destination_states: string[] | null
          equipment_type: string | null
          id: string
          is_backhaul: boolean | null
          max_weight: number | null
          min_rate: number | null
          min_rpm: number | null
          min_weight: number | null
          origin_city: string | null
          origin_state: string | null
          origin_states: string[] | null
          pickup_date: string | null
          pickup_distance: number | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          booking_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dest_city?: string | null
          destination_state?: string | null
          destination_states?: string[] | null
          equipment_type?: string | null
          id?: string
          is_backhaul?: boolean | null
          max_weight?: number | null
          min_rate?: number | null
          min_rpm?: number | null
          min_weight?: number | null
          origin_city?: string | null
          origin_state?: string | null
          origin_states?: string[] | null
          pickup_date?: string | null
          pickup_distance?: number | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          booking_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dest_city?: string | null
          destination_state?: string | null
          destination_states?: string[] | null
          equipment_type?: string | null
          id?: string
          is_backhaul?: boolean | null
          max_weight?: number | null
          min_rate?: number | null
          min_rpm?: number | null
          min_weight?: number | null
          origin_city?: string | null
          origin_state?: string | null
          origin_states?: string[] | null
          pickup_date?: string | null
          pickup_distance?: number | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
