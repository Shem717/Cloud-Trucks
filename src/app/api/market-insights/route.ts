import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchMarketInsights } from '@/workers/cloudtrucks-api-client';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's CloudTrucks credentials
        const { data: credentials } = await supabase
            .from('cloudtrucks_credentials')
            .select('session_cookie, csrf_token')
            .eq('user_id', user.id)
            .single();

        // Parse query params
        const url = new URL(request.url);
        const equipmentType = url.searchParams.get('equipment') || 'DRY_VAN';
        const distanceType = url.searchParams.get('distance') || 'Long';

        // Try CloudTrucks market conditions API first
        if (credentials?.session_cookie && credentials?.csrf_token) {
            const insights = await fetchMarketInsights(
                credentials.session_cookie,
                credentials.csrf_token,
                equipmentType,
                distanceType,
                (msg) => console.log(msg)
            );

            if (insights) {
                return NextResponse.json(insights);
            }
        }

        // Fallback: aggregate from user's found_loads data
        const aggregated = await aggregateFromLoads(supabase, user.id);
        if (aggregated) {
            return NextResponse.json(aggregated);
        }

        return NextResponse.json({
            error: 'No market data available',
            message: 'No loads found to compute market metrics. Search for loads on the Dashboard first.',
        }, { status: 404 });
    } catch (error) {
        console.error('[Market Insights API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * Aggregate market metrics from the user's found_loads table.
 * Computes rate/mile, load volume, and regional breakdowns from real load data.
 */
async function aggregateFromLoads(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string
) {
    // Fetch recent loads (last 7 days) with rate and distance data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: loads, error } = await supabase
        .from('found_loads')
        .select(`
            rate,
            distance,
            origin_city,
            origin_state,
            destination_city,
            destination_state,
            created_at,
            search_criteria!inner (user_id)
        `)
        .eq('search_criteria.user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('rate', 'is', null)
        .gt('rate', 0)
        .order('created_at', { ascending: false })
        .limit(2000);

    if (error || !loads || loads.length === 0) {
        return null;
    }

    // Compute national average rate per mile
    let totalRpm = 0;
    let rpmCount = 0;
    for (const load of loads) {
        if (load.rate && load.distance && load.distance > 0) {
            totalRpm += load.rate / load.distance;
            rpmCount++;
        }
    }
    const national_avg_rpm = rpmCount > 0 ? totalRpm / rpmCount : 0;

    // Aggregate by origin state for regional breakdown
    const regionMap = new Map<string, {
        loads: typeof loads;
        totalRate: number;
        totalRpm: number;
        rpmCount: number;
    }>();

    for (const load of loads) {
        const state = load.origin_state;
        if (!state) continue;

        if (!regionMap.has(state)) {
            regionMap.set(state, { loads: [], totalRate: 0, totalRpm: 0, rpmCount: 0 });
        }
        const region = regionMap.get(state)!;
        region.loads.push(load);
        if (load.rate) region.totalRate += load.rate;
        if (load.rate && load.distance && load.distance > 0) {
            region.totalRpm += load.rate / load.distance;
            region.rpmCount++;
        }
    }

    // Build regions sorted by load count
    const regions = Array.from(regionMap.entries())
        .map(([state, data]) => {
            const avgRpm = data.rpmCount > 0 ? data.totalRpm / data.rpmCount : 0;
            const avgRate = data.loads.length > 0 ? data.totalRate / data.loads.length : 0;
            const loadCount = data.loads.length;

            // Determine demand level based on load count relative to total
            let demand_level: 'low' | 'medium' | 'high' | 'very_high' = 'low';
            const share = loadCount / loads.length;
            if (share > 0.15) demand_level = 'very_high';
            else if (share > 0.08) demand_level = 'high';
            else if (share > 0.03) demand_level = 'medium';

            return {
                region_id: state,
                region_name: state,
                state,
                load_count: loadCount,
                avg_rate_per_mile: Math.round(avgRpm * 100) / 100,
                avg_rate: Math.round(avgRate),
                demand_level,
                trend: 'stable' as const,
                trend_percent: 0,
            };
        })
        .sort((a, b) => b.load_count - a.load_count);

    return {
        equipment_type: 'DRY_VAN',
        distance_type: 'Long',
        last_updated: new Date().toISOString(),
        regions,
        national_avg_rpm: Math.round(national_avg_rpm * 100) / 100,
        total_loads: loads.length,
        source: 'aggregated',
    };
}
