/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { getUserCredentials, fetchLoadsFromCloudTrucks } from './scanner';
import { CloudTrucksLoad } from './cloudtrucks-api-client';

let supabase: any | null = null;

function getSupabaseClient() {
    if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }

        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return supabase;
}

export interface SavedLoadForBackhaul {
    id: string;
    cloudtrucks_load_id: string;
    details: {
        dest_city?: string;
        dest_state?: string;
        destination_city?: string;
        destination_state?: string;
        dest_delivery_date?: string;
        origin_pickup_date?: string;
        equipment?: string[];
    };
}

export interface UserPreferencesForBackhaul {
    preferred_destination_states: string[] | null;
    avoid_states: string[] | null;
    backhaul_max_deadhead: number;
    backhaul_min_rpm: number;
    preferred_max_weight: number | null;
    preferred_equipment_type: string | null;
    preferred_pickup_distance: number;
    auto_suggest_backhauls: boolean;
}

/**
 * Calculate the RPM (rate per mile) for a load
 */
function calculateRPM(load: CloudTrucksLoad): number {
    const rate = parseFloat(String(load.trip_rate || load.estimated_rate || 0));
    const distance = load.trip_distance_mi || 0;
    if (distance === 0) return 0;
    return rate / distance;
}

/**
 * Calculate the pickup date for a backhaul based on fronthaul delivery
 */
function calculateBackhaulPickupDate(fronthaulDetails: SavedLoadForBackhaul['details']): string {
    // If we have a delivery date, use the next day
    if (fronthaulDetails.dest_delivery_date) {
        const deliveryDate = new Date(fronthaulDetails.dest_delivery_date);
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        return deliveryDate.toISOString().split('T')[0];
    }

    // Otherwise, estimate from pickup date + 1-2 days
    if (fronthaulDetails.origin_pickup_date) {
        const pickupDate = new Date(fronthaulDetails.origin_pickup_date);
        pickupDate.setDate(pickupDate.getDate() + 2);
        return pickupDate.toISOString().split('T')[0];
    }

    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Generate a backhaul suggestion for a saved load
 */
export async function generateBackhaulSuggestion(
    userId: string,
    savedLoad: SavedLoadForBackhaul,
    preferences: UserPreferencesForBackhaul
): Promise<{
    success: boolean;
    loadsFound: number;
    bestRate?: number;
    bestRpm?: number;
    error?: string;
}> {
    const supabase = getSupabaseClient();

    try {
        // Skip if auto-suggest is disabled
        if (!preferences.auto_suggest_backhauls) {
            return { success: true, loadsFound: 0 };
        }

        // Extract destination from saved load (becomes backhaul origin)
        const destCity = savedLoad.details.dest_city || savedLoad.details.destination_city;
        const destState = savedLoad.details.dest_state || savedLoad.details.destination_state;

        if (!destCity || !destState) {
            return {
                success: false,
                loadsFound: 0,
                error: 'Saved load missing destination city/state'
            };
        }

        // Check if user has preferred destination states configured
        const targetStates = preferences.preferred_destination_states;
        if (!targetStates || targetStates.length === 0) {
            // Create a "no preferences" suggestion
            await supabase
                .from('suggested_backhauls')
                .upsert({
                    user_id: userId,
                    saved_load_id: savedLoad.id,
                    saved_load_cloudtrucks_id: savedLoad.cloudtrucks_load_id,
                    origin_city: destCity,
                    origin_state: destState,
                    target_states: [],
                    status: 'no_preferences',
                    loads_found: 0,
                    last_searched_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,saved_load_cloudtrucks_id',
                });

            return {
                success: true,
                loadsFound: 0,
                error: 'No preferred destination states configured'
            };
        }

        // Update status to searching
        await supabase
            .from('suggested_backhauls')
            .upsert({
                user_id: userId,
                saved_load_id: savedLoad.id,
                saved_load_cloudtrucks_id: savedLoad.cloudtrucks_load_id,
                origin_city: destCity,
                origin_state: destState,
                target_states: targetStates,
                status: 'searching',
                last_searched_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,saved_load_cloudtrucks_id',
            });

        // Get user credentials
        const credentials = await getUserCredentials(userId);

        // Calculate backhaul pickup date
        const pickupDate = calculateBackhaulPickupDate(savedLoad.details);

        // Search for loads from destination to each preferred state
        const allLoads: CloudTrucksLoad[] = [];

        for (const targetState of targetStates) {
            // Skip if target state is in avoid list
            if (preferences.avoid_states?.includes(targetState)) {
                continue;
            }

            try {
                const loads = await fetchLoadsFromCloudTrucks(credentials, {
                    origin_city: destCity,
                    origin_state: destState,
                    pickup_distance: preferences.preferred_pickup_distance || 50,
                    pickup_date: pickupDate,
                    destination_state: targetState,
                    max_weight: preferences.preferred_max_weight || 45000,
                    equipment_type: preferences.preferred_equipment_type || savedLoad.details.equipment?.[0],
                });

                if (loads && loads.length > 0) {
                    allLoads.push(...loads);
                }
            } catch (error) {
                console.error(`[BACKHAUL] Error searching ${targetState}:`, error);
                // Continue with other states
            }
        }

        // Calculate the original load's delivery date for filtering
        let deliveryDate: Date | null = null;
        if (savedLoad.details.dest_delivery_date) {
            deliveryDate = new Date(savedLoad.details.dest_delivery_date);
        } else if (savedLoad.details.origin_pickup_date) {
            // Estimate delivery as pickup + 2 days if no delivery date
            const pickupDate = new Date(savedLoad.details.origin_pickup_date);
            pickupDate.setDate(pickupDate.getDate() + 2);
            deliveryDate = pickupDate;
        }

        // Filter loads by user preferences AND delivery date
        const filteredLoads = allLoads.filter(load => {
            // Filter by delivery date: backhaul pickup must be AFTER original load delivery
            if (deliveryDate && load.origin_pickup_date) {
                const backhaulPickupDate = new Date(load.origin_pickup_date);
                if (backhaulPickupDate <= deliveryDate) {
                    return false;
                }
            }

            // Apply avoid states filter to destination
            const loadDestState = load.dest_state;
            if (loadDestState && preferences.avoid_states?.includes(loadDestState)) {
                return false;
            }

            // Apply deadhead filter
            if (load.total_deadhead_mi > preferences.backhaul_max_deadhead) {
                return false;
            }

            // Apply min RPM filter
            const rpm = calculateRPM(load);
            if (rpm < preferences.backhaul_min_rpm) {
                return false;
            }

            return true;
        });

        // Deduplicate by load ID
        const uniqueLoads = Array.from(
            new Map(filteredLoads.map(l => [l.id, l])).values()
        );

        // Calculate stats
        const rates = uniqueLoads.map(l => parseFloat(String(l.trip_rate || l.estimated_rate || 0)));
        const rpms = uniqueLoads.map(l => calculateRPM(l));

        const bestRate = rates.length > 0 ? Math.max(...rates) : null;
        const bestRpm = rpms.length > 0 ? Math.max(...rpms) : null;
        const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
        const avgRpm = rpms.length > 0 ? rpms.reduce((a, b) => a + b, 0) / rpms.length : null;

        // Sort by RPM descending and take top 5 for quick display
        const topLoads = uniqueLoads
            .sort((a, b) => calculateRPM(b) - calculateRPM(a))
            .slice(0, 50)
            .map(load => ({
                id: load.id,
                origin_city: load.origin_city,
                origin_state: load.origin_state,
                dest_city: load.dest_city,
                dest_state: load.dest_state,
                rate: load.trip_rate || load.estimated_rate,
                distance: load.trip_distance_mi,
                rpm: calculateRPM(load).toFixed(2),
                deadhead: load.total_deadhead_mi,
                equipment: load.equipment,
                pickup_date: load.origin_pickup_date,
            }));

        // Update suggestion with results
        const status = uniqueLoads.length > 0 ? 'found' : 'no_results';
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expire in 24 hours

        await supabase
            .from('suggested_backhauls')
            .upsert({
                user_id: userId,
                saved_load_id: savedLoad.id,
                saved_load_cloudtrucks_id: savedLoad.cloudtrucks_load_id,
                origin_city: destCity,
                origin_state: destState,
                target_states: targetStates,
                loads_found: uniqueLoads.length,
                best_rate: bestRate,
                best_rpm: bestRpm,
                avg_rate: avgRate,
                avg_rpm: avgRpm,
                top_loads: topLoads,
                status,
                last_searched_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
            }, {
                onConflict: 'user_id,saved_load_cloudtrucks_id',
            });

        console.log(`[BACKHAUL] Found ${uniqueLoads.length} backhaul options for load ${savedLoad.cloudtrucks_load_id}`);

        return {
            success: true,
            loadsFound: uniqueLoads.length,
            bestRate: bestRate || undefined,
            bestRpm: bestRpm || undefined,
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BACKHAUL] Error generating suggestion:`, message);

        // Update status to error
        await supabase
            .from('suggested_backhauls')
            .upsert({
                user_id: userId,
                saved_load_id: savedLoad.id,
                saved_load_cloudtrucks_id: savedLoad.cloudtrucks_load_id,
                origin_city: savedLoad.details.dest_city || savedLoad.details.destination_city || 'Unknown',
                origin_state: savedLoad.details.dest_state || savedLoad.details.destination_state || 'XX',
                status: 'error',
                last_searched_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,saved_load_cloudtrucks_id',
            });

        return {
            success: false,
            loadsFound: 0,
            error: message,
        };
    }
}

/**
 * Scan backhauls for all saved loads of a user
 */
export async function scanBackhaulsForUser(userId: string): Promise<{
    success: boolean;
    totalLoadsScanned: number;
    totalBackhaulsFound: number;
    errors: string[];
}> {
    const supabase = getSupabaseClient();

    try {
        // Get user preferences
        const { data: preferences, error: prefError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (prefError && prefError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch preferences: ${prefError.message}`);
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

        // Skip if auto-suggest is disabled
        if (!userPrefs.auto_suggest_backhauls) {
            return {
                success: true,
                totalLoadsScanned: 0,
                totalBackhaulsFound: 0,
                errors: [],
            };
        }

        // Get saved loads that need backhaul suggestions
        // - Saved in last 7 days
        // - Status is 'interested'
        // - Either no suggestion exists, or suggestion is expired
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: savedLoads, error: loadsError } = await supabase
            .from('interested_loads')
            .select('id, cloudtrucks_load_id, details')
            .eq('user_id', userId)
            .eq('status', 'interested')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(20); // Limit to 20 most recent

        if (loadsError) {
            throw new Error(`Failed to fetch saved loads: ${loadsError.message}`);
        }

        if (!savedLoads || savedLoads.length === 0) {
            return {
                success: true,
                totalLoadsScanned: 0,
                totalBackhaulsFound: 0,
                errors: [],
            };
        }

        // Check which loads already have non-expired suggestions
        const { data: existingSuggestions } = await supabase
            .from('suggested_backhauls')
            .select('saved_load_cloudtrucks_id, expires_at, status')
            .eq('user_id', userId)
            .in('saved_load_cloudtrucks_id', savedLoads.map((l: { cloudtrucks_load_id: string }) => l.cloudtrucks_load_id));

        const now = new Date();
        const needsScan = savedLoads.filter((load: { cloudtrucks_load_id: string }) => {
            const existing = existingSuggestions?.find(
                (s: { saved_load_cloudtrucks_id: string }) => s.saved_load_cloudtrucks_id === load.cloudtrucks_load_id
            );
            if (!existing) return true;
            if (existing.status === 'error') return true;
            if (existing.expires_at && new Date(existing.expires_at) < now) return true;
            return false;
        });

        const results = {
            success: true,
            totalLoadsScanned: needsScan.length,
            totalBackhaulsFound: 0,
            errors: [] as string[],
        };

        // Generate suggestions for each load
        for (const load of needsScan) {
            const result = await generateBackhaulSuggestion(userId, load, userPrefs);

            if (result.success) {
                results.totalBackhaulsFound += result.loadsFound;
            } else if (result.error) {
                results.errors.push(`Load ${load.cloudtrucks_load_id}: ${result.error}`);
            }
        }

        console.log(`[BACKHAUL] Scanned ${results.totalLoadsScanned} loads for user ${userId}, found ${results.totalBackhaulsFound} backhaul options`);

        return results;

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BACKHAUL] Fatal error for user ${userId}:`, message);
        return {
            success: false,
            totalLoadsScanned: 0,
            totalBackhaulsFound: 0,
            errors: [message],
        };
    }
}

/**
 * Scan backhauls for all users with auto-suggest enabled
 */
export async function scanBackhaulsForAllUsers(): Promise<{
    totalUsers: number;
    totalLoadsScanned: number;
    totalBackhaulsFound: number;
    errors: string[];
}> {
    const supabase = getSupabaseClient();

    // Get all users with saved loads
    const { data: users, error } = await supabase
        .from('interested_loads')
        .select('user_id')
        .eq('status', 'interested');

    if (error || !users) {
        return {
            totalUsers: 0,
            totalLoadsScanned: 0,
            totalBackhaulsFound: 0,
            errors: [error?.message || 'Failed to fetch users'],
        };
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users.map((u: { user_id: string }) => u.user_id))];

    const results = {
        totalUsers: uniqueUserIds.length,
        totalLoadsScanned: 0,
        totalBackhaulsFound: 0,
        errors: [] as string[],
    };

    for (const userId of uniqueUserIds) {
        const userResult = await scanBackhaulsForUser(userId as string);
        results.totalLoadsScanned += userResult.totalLoadsScanned;
        results.totalBackhaulsFound += userResult.totalBackhaulsFound;
        results.errors.push(...userResult.errors);
    }

    console.log(`[BACKHAUL] Complete. Scanned ${results.totalUsers} users, ${results.totalLoadsScanned} loads, found ${results.totalBackhaulsFound} backhauls`);

    return results;
}
