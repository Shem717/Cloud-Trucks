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
      criterias: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      fuel_stops: {
        Row: {
          address: string
          brand: string
          city: string
          created_at: string | null
          diesel_price: number | null
          id: string
          last_updated: string | null
          lat: number
          lng: number
          name: string
          state: string
        }
        Insert: {
          address: string
          brand: string
          city: string
          created_at?: string | null
          diesel_price?: number | null
          id?: string
          last_updated?: string | null
          lat: number
          lng: number
          name: string
          state: string
        }
        Update: {
          address?: string
          brand?: string
          city?: string
          created_at?: string | null
          diesel_price?: number | null
          id?: string
          last_updated?: string | null
          lat?: number
          lng?: number
          name?: string
          state?: string
        }
        Relationships: []
      }
      scanned_loads: {
        Row: {
          broker: string | null
          cloudtrucks_load_id: string
          created_at: string | null
          destination: string
          equipment: string | null
          id: string
          matches_criteria_id: string | null
          origin: string
          pickup_date: string | null
          rate: number | null
          raw_data: Json | null
          rpm: number | null
          weight: number | null
        }
        Insert: {
          broker?: string | null
          cloudtrucks_load_id: string
          created_at?: string | null
          destination: string
          equipment?: string | null
          id?: string
          matches_criteria_id?: string | null
          origin: string
          pickup_date?: string | null
          rate?: number | null
          raw_data?: Json | null
          rpm?: number | null
          weight?: number | null
        }
        Update: {
          broker?: string | null
          cloudtrucks_load_id?: string
          created_at?: string | null
          destination?: string
          equipment?: string | null
          id?: string
          matches_criteria_id?: string | null
          origin?: string
          pickup_date?: string | null
          rate?: number | null
          raw_data?: Json | null
          rpm?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scanned_loads_matches_criteria_id_fkey"
            columns: ["matches_criteria_id"]
            isOneToOne: false
            referencedRelation: "search_criteria"
            referencedColumns: ["id"]
          },
        ]
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
          last_scan_loads_found: number | null
          last_scanned_at: string | null
          max_weight: number | null
          min_rate: number | null
          min_rpm: number | null
          min_weight: number | null
          origin_city: string | null
          origin_state: string | null
          origin_states: string[] | null
          pickup_date: string | null
          pickup_date_end: string | null
          pickup_distance: number | null
          scan_error: string | null
          scan_status: string | null
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
          last_scan_loads_found?: number | null
          last_scanned_at?: string | null
          max_weight?: number | null
          min_rate?: number | null
          min_rpm?: number | null
          min_weight?: number | null
          origin_city?: string | null
          origin_state?: string | null
          origin_states?: string[] | null
          pickup_date?: string | null
          pickup_date_end?: string | null
          pickup_distance?: number | null
          scan_error?: string | null
          scan_status?: string | null
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
          last_scan_loads_found?: number | null
          last_scanned_at?: string | null
          max_weight?: number | null
          min_rate?: number | null
          min_rpm?: number | null
          min_weight?: number | null
          origin_city?: string | null
          origin_state?: string | null
          origin_states?: string[] | null
          pickup_date?: string | null
          pickup_date_end?: string | null
          pickup_distance?: number | null
          scan_error?: string | null
          scan_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weather_summaries: {
        Row: {
          condition: string | null
          created_at: string
          humidity: number | null
          id: string
          location: string
          precipitation_chance: number | null
          temperature: number | null
          updated_at: string
          wind_speed: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          location: string
          precipitation_chance?: number | null
          temperature?: number | null
          updated_at?: string
          wind_speed?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          location?: string
          precipitation_chance?: number | null
          temperature?: number | null
          updated_at?: string
          wind_speed?: number | null
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
