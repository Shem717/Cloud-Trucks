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
            audit_log: {
                Row: {
                    action: string
                    created_at: string
                    details: Json | null
                    id: string
                    ip_address: string | null
                    resource_id: string | null
                    resource_type: string | null
                    user_agent: string | null
                    user_id: string | null
                }
                Insert: {
                    action: string
                    created_at?: string
                    details?: Json | null
                    id?: string
                    ip_address?: string | null
                    resource_id?: string | null
                    resource_type?: string | null
                    user_agent?: string | null
                    user_id?: string | null
                }
                Update: {
                    action?: string
                    created_at?: string
                    details?: Json | null
                    id?: string
                    ip_address?: string | null
                    resource_id?: string | null
                    resource_type?: string | null
                    user_agent?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
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
            found_loads: {
                Row: {
                    broker: string
                    cloudtrucks_load_id: string
                    created_at: string | null
                    criteria_id: string
                    days_to_pickup: number | null
                    destination_city: string
                    destination_state: string
                    details: Json
                    distance: number | null
                    equipment: string
                    id: string
                    origin_city: string
                    origin_state: string
                    pickup_date: string
                    rate: number
                    status: string | null
                    updated_at: string | null
                    weight: number
                }
                Insert: {
                    broker: string
                    cloudtrucks_load_id: string
                    created_at?: string | null
                    criteria_id: string
                    days_to_pickup?: number | null
                    destination_city: string
                    destination_state: string
                    details: Json
                    distance?: number | null
                    equipment: string
                    id?: string
                    origin_city: string
                    origin_state: string
                    pickup_date: string
                    rate: number
                    status?: string | null
                    updated_at?: string | null
                    weight: number
                }
                Update: {
                    broker?: string
                    cloudtrucks_load_id?: string
                    created_at?: string | null
                    criteria_id?: string
                    days_to_pickup?: number | null
                    destination_city?: string
                    destination_state?: string
                    details?: Json
                    distance?: number | null
                    equipment?: string
                    id?: string
                    origin_city?: string
                    origin_state?: string
                    pickup_date?: string
                    rate?: number
                    status?: string | null
                    updated_at?: string | null
                    weight?: number
                }
                Relationships: []
            }
            guest_found_loads: {
                Row: {
                    broker: string
                    cloudtrucks_load_id: string
                    created_at: string | null
                    criteria_id: string
                    days_to_pickup: number | null
                    destination_city: string
                    destination_state: string
                    details: Json
                    distance: number | null
                    equipment: string
                    id: string
                    origin_city: string
                    origin_state: string
                    pickup_date: string
                    rate: number
                    scan_count: number | null
                    status: string | null
                    updated_at: string | null
                    weight: number
                }
                Insert: {
                    broker: string
                    cloudtrucks_load_id: string
                    created_at?: string | null
                    criteria_id: string
                    days_to_pickup?: number | null
                    destination_city: string
                    destination_state: string
                    details: Json
                    distance?: number | null
                    equipment: string
                    id?: string
                    origin_city: string
                    origin_state: string
                    pickup_date: string
                    rate: number
                    scan_count?: number | null
                    status?: string | null
                    updated_at?: string | null
                    weight: number
                }
                Update: {
                    broker?: string
                    cloudtrucks_load_id?: string
                    created_at?: string | null
                    criteria_id?: string
                    days_to_pickup?: number | null
                    destination_city?: string
                    destination_state?: string
                    details?: Json
                    distance?: number | null
                    equipment?: string
                    id?: string
                    origin_city?: string
                    origin_state?: string
                    pickup_date?: string
                    rate?: number
                    scan_count?: number | null
                    status?: string | null
                    updated_at?: string | null
                    weight?: number
                }
                Relationships: []
            }
            guest_load_history: {
                Row: {
                    cloudtrucks_load_id: string
                    criteria_id: string
                    details: Json
                    id: string
                    scanned_at: string | null
                    status: string | null
                }
                Insert: {
                    cloudtrucks_load_id: string
                    criteria_id: string
                    details: Json
                    id?: string
                    scanned_at?: string | null
                    status?: string | null
                }
                Update: {
                    cloudtrucks_load_id?: string
                    criteria_id?: string
                    details?: Json
                    id?: string
                    scanned_at?: string | null
                    status?: string | null
                }
                Relationships: []
            }
            guest_search_criteria: {
                Row: {
                    active: boolean | null
                    created_at: string | null
                    dest_city: string | null
                    dest_state: string | null
                    equipment_type: string | null
                    guest_session: string
                    id: string
                    max_weight: number | null
                    min_rate: number | null
                    min_weight: number | null
                    origin_city: string | null
                    origin_state: string | null
                    scan_count: number | null
                }
                Insert: {
                    active?: boolean | null
                    created_at?: string | null
                    dest_city?: string | null
                    dest_state?: string | null
                    equipment_type?: string | null
                    guest_session: string
                    id?: string
                    max_weight?: number | null
                    min_rate?: number | null
                    min_weight?: number | null
                    origin_city?: string | null
                    origin_state?: string | null
                    scan_count?: number | null
                }
                Update: {
                    active?: boolean | null
                    created_at?: string | null
                    dest_city?: string | null
                    dest_state?: string | null
                    equipment_type?: string | null
                    guest_session?: string
                    id?: string
                    max_weight?: number | null
                    min_rate?: number | null
                    min_weight?: number | null
                    origin_city?: string | null
                    origin_state?: string | null
                    scan_count?: number | null
                }
                Relationships: []
            }
            interested_loads: {
                Row: {
                    created_at: string | null
                    id: string
                    load_id: string
                    status: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    load_id: string
                    status?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    load_id?: string
                    status?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            load_history: {
                Row: {
                    cloudtrucks_load_id: string
                    criteria_id: string
                    details: Json
                    id: string
                    scanned_at: string | null
                    status: string | null
                }
                Insert: {
                    cloudtrucks_load_id: string
                    criteria_id: string
                    details: Json
                    id?: string
                    scanned_at?: string | null
                    status?: string | null
                }
                Update: {
                    cloudtrucks_load_id?: string
                    criteria_id?: string
                    details?: Json
                    id?: string
                    scanned_at?: string | null
                    status?: string | null
                }
                Relationships: []
            }
            search_criteria: {
                Row: {
                    active: boolean | null
                    created_at: string | null
                    dest_city: string | null
                    dest_state: string | null
                    equipment_type: string | null
                    id: string
                    max_weight: number | null
                    min_rate: number | null
                    min_weight: number | null
                    origin_city: string | null
                    origin_state: string | null
                    scan_count: number | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    created_at?: string | null
                    dest_city?: string | null
                    dest_state?: string | null
                    equipment_type?: string | null
                    id?: string
                    max_weight?: number | null
                    min_rate?: number | null
                    min_weight?: number | null
                    origin_city?: string | null
                    origin_state?: string | null
                    scan_count?: number | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    created_at?: string | null
                    dest_city?: string | null
                    dest_state?: string | null
                    equipment_type?: string | null
                    id?: string
                    max_weight?: number | null
                    min_rate?: number | null
                    min_weight?: number | null
                    origin_city?: string | null
                    origin_state?: string | null
                    scan_count?: number | null
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            increment_guest_scan_count: {
                Args: {
                    changed_ids: string[]
                    criteria_id: string
                }
                Returns: undefined
            }
            increment_scan_count: {
                Args: {
                    changed_ids: string[]
                    criteria_id: string
                }
                Returns: undefined
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DefaultSchema = Database["public"]

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

export type Tables<
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
        Row: infer R
    }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
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
        Enums: {},
    },
} as const
