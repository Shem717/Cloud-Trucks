import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export type SortOption =
    | 'newest'
    | 'price_high'
    | 'price_low'
    | 'rpm_high'
    | 'rpm_low'
    | 'deadhead_low'
    | 'deadhead_high'
    | 'pickup_soonest'
    | 'pickup_latest'
    | 'distance_short'
    | 'distance_long'
    | 'weight_light'
    | 'weight_heavy';

export interface UserPreferences {
    id: string;
    user_id: string;
    default_sort: SortOption;
    preferred_min_rate: number | null;
    preferred_min_rpm: number | null;
    preferred_max_weight: number | null;
    preferred_min_weight: number | null;
    preferred_equipment_type: string | null;
    preferred_booking_type: string | null;
    preferred_pickup_distance: number;
    home_city: string | null;
    home_state: string | null;
    preferred_destination_states: string[] | null;
    avoid_states: string[] | null;
    auto_suggest_backhauls: boolean;
    backhaul_max_deadhead: number;
    backhaul_min_rpm: number;
    fuel_mpg: number;
    fuel_price_per_gallon: number;
    created_at: string;
    updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
    default_sort: 'newest',
    preferred_min_rate: null,
    preferred_min_rpm: null,
    preferred_max_weight: null,
    preferred_min_weight: null,
    preferred_equipment_type: null,
    preferred_booking_type: null,
    preferred_pickup_distance: 50,
    home_city: null,
    home_state: null,
    preferred_destination_states: null,
    avoid_states: null,
    auto_suggest_backhauls: true,
    backhaul_max_deadhead: 100,
    backhaul_min_rpm: 2.00,
    fuel_mpg: 6.5,
    fuel_price_per_gallon: 3.80,
};

/**
 * GET /api/preferences - Fetch user preferences (creates default if none exist)
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to fetch existing preferences
        const { data: preferences, error: fetchError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows returned (expected for new users)
            console.error('[API] Error fetching preferences:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        // If preferences exist, return them
        if (preferences) {
            return NextResponse.json({ preferences });
        }

        // Create default preferences for new user
        const { data: newPreferences, error: insertError } = await supabase
            .from('user_preferences')
            .insert({
                user_id: user.id,
                ...DEFAULT_PREFERENCES,
            })
            .select()
            .single();

        if (insertError) {
            console.error('[API] Error creating default preferences:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ preferences: newPreferences });
    } catch (error: unknown) {
        console.error('[API] Preferences GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/preferences - Update user preferences (partial update)
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Remove fields that shouldn't be updated directly
        const { id, user_id, created_at, updated_at, ...updates } = body;

        // Validate sort option if provided
        if (updates.default_sort) {
            const validSorts: SortOption[] = [
                'newest', 'price_high', 'price_low', 'rpm_high', 'rpm_low',
                'deadhead_low', 'deadhead_high', 'pickup_soonest', 'pickup_latest',
                'distance_short', 'distance_long', 'weight_light', 'weight_heavy'
            ];
            if (!validSorts.includes(updates.default_sort)) {
                return NextResponse.json(
                    { error: `Invalid sort option: ${updates.default_sort}` },
                    { status: 400 }
                );
            }
        }

        // Upsert preferences (create if doesn't exist, update if does)
        const { data: preferences, error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: user.id,
                ...DEFAULT_PREFERENCES,
                ...updates,
            }, {
                onConflict: 'user_id',
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating preferences:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ preferences });
    } catch (error: unknown) {
        console.error('[API] Preferences PATCH error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
