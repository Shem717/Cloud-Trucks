/**
 * Supabase Database Types
 * Generated manually from schema.sql for type safety
 */

// ============================================
// Tables
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UsersRow
        Insert: UsersInsert
        Update: UsersUpdate
      }
      cloudtrucks_credentials: {
        Row: CloudTrucksCredentialsRow
        Insert: CloudTrucksCredentialsInsert
        Update: CloudTrucksCredentialsUpdate
      }
      search_criteria: {
        Row: SearchCriteriaRow
        Insert: SearchCriteriaInsert
        Update: SearchCriteriaUpdate
      }
      found_loads: {
        Row: FoundLoadsRow
        Insert: FoundLoadsInsert
        Update: FoundLoadsUpdate
      }
      interested_loads: {
        Row: InterestedLoadsRow
        Insert: InterestedLoadsInsert
        Update: InterestedLoadsUpdate
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
  }
}

// ============================================
// Users Table
// ============================================

export type UsersRow = {
  id: string
  email: string
  phone_number: string | null
  subscription_tier: string
  created_at: string
}

export type UsersInsert = Omit<UsersRow, 'id' | 'created_at'>
export type UsersUpdate = Partial<UsersInsert>

// ============================================
// CloudTrucks Credentials Table
// ============================================

export type CloudTrucksCredentialsRow = {
  user_id: string
  encrypted_email: string
  encrypted_session_cookie: string
  encrypted_csrf_token: string | null
  last_validated_at: string | null
  is_valid: boolean
}

export type CloudTrucksCredentialsInsert = Omit<CloudTrucksCredentialsRow, 'last_validated_at' | 'is_valid'> & {
  last_validated_at?: string | null
  is_valid?: boolean
}
export type CloudTrucksCredentialsUpdate = Partial<CloudTrucksCredentialsInsert>

// ============================================
// Search Criteria Table
// ============================================

export type SearchCriteriaRow = {
  id: string
  user_id: string
  origin_city: string | null
  origin_state: string | null
  origin_states: string[] | null
  pickup_distance: number
  pickup_date: string | null
  dest_city: string | null
  destination_state: string | null
  destination_states: string[] | null
  min_rate: number | null
  min_weight: number | null
  max_weight: number
  equipment_type: string | null
  booking_type: string | null
  active: boolean
  is_backhaul: boolean | null
  deleted_at: string | null
  last_scanned_at: string | null
  scan_status: string | null
  scan_error: string | null
  last_scan_loads_found: number | null
  created_at: string
}

export type SearchCriteriaInsert = Omit<SearchCriteriaRow, 'id' | 'created_at' | 'last_scanned_at' | 'scan_status' | 'scan_error' | 'last_scan_loads_found'>
export type SearchCriteriaUpdate = Partial<SearchCriteriaInsert>

// ============================================
// Found Loads Table
// ============================================

export type FoundLoadsRow = {
  id: string
  criteria_id: string
  cloudtrucks_load_id: string
  details: Json
  status: string
  created_at: string
}

export type FoundLoadsInsert = Omit<FoundLoadsRow, 'id' | 'created_at'>
export type FoundLoadsUpdate = Partial<FoundLoadsInsert>

// ============================================
// Interested Loads Table
// ============================================

export type InterestedLoadsRow = {
  id: string
  user_id: string
  cloudtrucks_load_id: string
  details: Json
  status: string
  last_checked_at: string | null
  created_at: string
}

export type InterestedLoadsInsert = Omit<InterestedLoadsRow, 'id' | 'created_at'>
export type InterestedLoadsUpdate = Partial<InterestedLoadsInsert>

// ============================================
// Utility Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
