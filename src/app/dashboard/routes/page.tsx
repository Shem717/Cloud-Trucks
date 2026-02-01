import { createClient } from '@/utils/supabase/server';
import { RoutePlanningBoard } from '@/components/route-planning-board';

export default async function RoutePlanningPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Interested Loads
    const { data: rawInterestedLoads } = await supabase
        .from('interested_loads')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'interested') // Only active loads
        .order('created_at', { ascending: false });

    // Normalize data to ensure consistent field names for UI
    const interestedLoads = (rawInterestedLoads || []).map(load => {
        const d = load.details || {};
        return {
            ...load,
            details: {
                ...d,
                pickup_date: d.pickup_date || d.origin_pickup_date || d.date_start,
                rate: d.rate || d.trip_rate || d.estimated_rate,
                distance: d.distance || d.trip_distance_mi,
                broker_name: d.broker_name || d.broker,
                origin_address: d.origin_address || d.location_address1,
                dest_address: d.dest_address || d.location_address2,
                equipment: d.equipment,
            }
        };
    });

    // 2. Fetch Backhaul Criteria
    const { data: backhaulCriteria } = await supabase
        .from('search_criteria')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_backhaul', true);

    // 3. Fetch Loads matching backhaul criteria (to show availability)
    const { data: backhaulLoads } = await supabase
        .from('found_loads')
        .select('*')
        .in('criteria_id', backhaulCriteria?.map(c => c.id) || []);

    // 4. Fetch Suggested Backhauls
    const { data: suggestedBackhauls } = await supabase
        .from('suggested_backhauls')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Route Planning</h1>
                <p className="text-muted-foreground">
                    Connect your interested loads with backhaul searches to build profitable round trips.
                </p>
            </div>

            <RoutePlanningBoard
                interestedLoads={interestedLoads || []}
                backhaulCriteria={backhaulCriteria || []}
                backhaulLoads={backhaulLoads || []}
                suggestedBackhauls={suggestedBackhauls || []}
            />
        </div>
    );
}
