import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateBackhaulSuggestion, UserPreferencesForBackhaul } from '@/workers/backhaul-suggester';

export interface SuggestedBackhaul {
    id: string;
    user_id: string;
    saved_load_id: string;
    saved_load_cloudtrucks_id: string;
    origin_city: string;
    origin_state: string;
    target_states: string[] | null;
    loads_found: number;
    best_rate: number | null;
    best_rpm: number | null;
    avg_rate: number | null;
    avg_rpm: number | null;
    top_loads: Array<{
        id: string;
        origin_city: string;
        origin_state: string;
        dest_city: string;
        dest_state: string;
        rate: number;
        distance: number;
        rpm: string;
        deadhead: number;
        equipment: string[];
        pickup_date: string;
    }> | null;
    status: string;
    last_searched_at: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * GET /api/backhauls - Get all backhaul suggestions for user
 * Query params:
 *   - saved_load_id: Get backhaul for specific saved load
 *   - status: Filter by status (found, no_results, pending, etc.)
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const savedLoadId = searchParams.get('saved_load_id');
        const savedLoadCloudtrucksId = searchParams.get('cloudtrucks_load_id');
        const status = searchParams.get('status');

        let query = supabase
            .from('suggested_backhauls')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (savedLoadId) {
            query = query.eq('saved_load_id', savedLoadId);
        }

        if (savedLoadCloudtrucksId) {
            query = query.eq('saved_load_cloudtrucks_id', savedLoadCloudtrucksId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data: backhauls, error } = await query;

        if (error) {
            console.error('[API] Error fetching backhauls:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Calculate summary stats
        const withResults = backhauls?.filter(b => b.status === 'found') || [];
        const totalBackhaulsFound = withResults.reduce((sum, b) => sum + (b.loads_found || 0), 0);
        const bestOverallRpm = withResults.length > 0
            ? Math.max(...withResults.map(b => b.best_rpm || 0))
            : null;

        return NextResponse.json({
            backhauls: backhauls || [],
            summary: {
                total: backhauls?.length || 0,
                withResults: withResults.length,
                totalBackhaulsFound,
                bestOverallRpm,
            }
        });

    } catch (error: unknown) {
        console.error('[API] Backhauls GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/backhauls - Trigger backhaul search for a saved load
 * Body:
 *   - saved_load_id: UUID of the saved load
 *   - cloudtrucks_load_id: CloudTrucks ID of the load
 *   - details: Load details (for extracting destination)
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { saved_load_id, cloudtrucks_load_id, details } = body;

        if (!saved_load_id || !cloudtrucks_load_id || !details) {
            return NextResponse.json(
                { error: 'Missing required fields: saved_load_id, cloudtrucks_load_id, details' },
                { status: 400 }
            );
        }

        // Get user preferences
        const { data: preferences, error: prefError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (prefError && prefError.code !== 'PGRST116') {
            console.error('[API] Error fetching preferences:', prefError);
            return NextResponse.json({ error: prefError.message }, { status: 500 });
        }

        // Use default preferences if none exist
        const userPrefs: UserPreferencesForBackhaul = preferences || {
            preferred_destination_states: null,
            avoid_states: null,
            backhaul_max_deadhead: 100,
            backhaul_min_rpm: 2.00,
            preferred_max_weight: 45000,
            preferred_equipment_type: null,
            preferred_pickup_distance: 50,
            auto_suggest_backhauls: true,
        };

        // Check if user has preferred states configured
        if (!userPrefs.preferred_destination_states || userPrefs.preferred_destination_states.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No preferred destination states configured. Please update your preferences first.',
                needsPreferences: true,
            });
        }

        // Generate backhaul suggestion
        const result = await generateBackhaulSuggestion(
            user.id,
            {
                id: saved_load_id,
                cloudtrucks_load_id,
                details,
            },
            userPrefs
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        // Fetch the updated suggestion
        const { data: suggestion, error: fetchError } = await supabase
            .from('suggested_backhauls')
            .select('*')
            .eq('user_id', user.id)
            .eq('saved_load_cloudtrucks_id', cloudtrucks_load_id)
            .single();

        if (fetchError) {
            console.error('[API] Error fetching suggestion:', fetchError);
        }

        return NextResponse.json({
            success: true,
            loadsFound: result.loadsFound,
            bestRate: result.bestRate,
            bestRpm: result.bestRpm,
            suggestion,
        });

    } catch (error: unknown) {
        console.error('[API] Backhauls POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/backhauls - Remove a backhaul suggestion
 * Query params:
 *   - id: Suggestion ID
 *   - cloudtrucks_load_id: CloudTrucks load ID
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const cloudtrucksLoadId = searchParams.get('cloudtrucks_load_id');

        if (!id && !cloudtrucksLoadId) {
            return NextResponse.json(
                { error: 'Missing id or cloudtrucks_load_id parameter' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('suggested_backhauls')
            .delete()
            .eq('user_id', user.id);

        if (id) {
            query = query.eq('id', id);
        } else if (cloudtrucksLoadId) {
            query = query.eq('saved_load_cloudtrucks_id', cloudtrucksLoadId);
        }

        const { error } = await query;

        if (error) {
            console.error('[API] Error deleting backhaul:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('[API] Backhauls DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
