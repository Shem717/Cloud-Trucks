import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';

//  @ts-nocheck - Disable type checking for Supabase client until types are generated
import { CloudTrucksLoad, SearchCriteria } from './cloudtrucks-api-client';

// Lazy initialization to avoid build-time errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Fetch user's CloudTrucks credentials and decrypt them
 */
interface UserCredentials {
    email: string;
    cookie: string;
    csrfToken: string;
}

/**
 * Fetch user's CloudTrucks credentials and decrypt them
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserCredentials(userId: string, supabaseClient?: any): Promise<UserCredentials> {
    const supabase = supabaseClient || getSupabaseClient();
    const { data, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('encrypted_email, encrypted_session_cookie, encrypted_csrf_token')
        .eq('user_id', userId)
        .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedData = data as any;

    if (error || !typedData) {
        throw new Error(`No credentials found for user ${userId}`);
    }

    // Decrypt credentials using decrypt() directly
    const email = decrypt(typedData.encrypted_email);
    const cookie = decrypt(typedData.encrypted_session_cookie);

    console.log(`[SCANNER] Decrypted session cookie: ${cookie.substring(0, 10)}...`);

    // Decrypt CSRF token if available
    let csrfToken = '';
    if (data.encrypted_csrf_token) {
        csrfToken = decrypt(data.encrypted_csrf_token);
        console.log(`[SCANNER] Decrypted CSRF token: ${csrfToken.substring(0, 10)}...`);
    }

    return { email, cookie, csrfToken };
}

/**
 * Fetch loads from CloudTrucks using the new API + Pusher approach
 */
/**
 * Fetch loads from CloudTrucks using the new API + Pusher approach
 */
export async function fetchLoadsFromCloudTrucks(
    credentials: UserCredentials,
    criteria: SearchCriteria & { origin_states?: string[]; destination_states?: string[] }
): Promise<CloudTrucksLoad[]> {
    try {
        // Use the new API client (dynamic import to avoid build issues)
        const { fetchLoadsViaApi } = await import('./cloudtrucks-api-client');

        console.log('[SCANNER] Using API client for load fetch');

        // Handle multi-state selection
        const originStates = criteria.origin_states && criteria.origin_states.length > 0
            ? criteria.origin_states
            : [criteria.origin_state].filter(Boolean);

        const destStates = criteria.destination_states && criteria.destination_states.length > 0
            ? criteria.destination_states
            : criteria.destination_state ? [criteria.destination_state] : [null];

        console.log('[SCANNER] Input Criteria Details:', {
            origin_city: criteria.origin_city,
            origin_states: originStates,
            dest_city: criteria.dest_city,
            destination_states: destStates,
            dist: criteria.pickup_distance,
            date: criteria.pickup_date
        });

        // Fetch loads for each state combination
        const allLoadsMap = new Map<string, CloudTrucksLoad>(); // Dedupe by load ID

        for (const originState of originStates) {
            for (const destState of destStates) {
                if (!originState) continue; // Skip if no origin state (shouldn't happen with filter)

                console.log(`[SCANNER] Querying: ${criteria.origin_city}, ${originState} -> ${criteria.dest_city || 'Any'}, ${destState || 'Any'}`);

                const loads = await fetchLoadsViaApi(
                    credentials.cookie,
                    credentials.csrfToken,
                    {
                        origin_city: criteria.origin_city,
                        origin_state: originState,
                        pickup_distance: criteria.pickup_distance,
                        pickup_date: criteria.pickup_date,
                        dest_city: criteria.dest_city,
                        destination_state: destState,
                        min_rate: criteria.min_rate ? (typeof criteria.min_rate === 'string' ? parseFloat(criteria.min_rate) : criteria.min_rate) : undefined,
                        max_weight: criteria.max_weight,
                        equipment_type: criteria.equipment_type,
                        booking_type: criteria.booking_type,
                    } as SearchCriteria,
                    20000 // 20 second timeout for Pusher collection
                );

                // Add to map for deduplication
                if (loads && loads.length > 0) {
                    loads.forEach((load) => allLoadsMap.set(load.id, load));
                }
            }
        }

        const uniqueLoads = Array.from(allLoadsMap.values());
        console.log(`[SCANNER] Found ${uniqueLoads.length} unique loads across ${originStates.length * destStates.length} state combinations`);

        return uniqueLoads;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[SCANNER] CloudTrucks API error:', message);
        throw error;
    }
}

/**
 * Save newly found loads to database (avoiding duplicates)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveNewLoads(criteriaId: string, loads: CloudTrucksLoad[], supabaseClient?: any) {
    if (loads.length === 0) return 0;

    const supabase = supabaseClient || getSupabaseClient();

    // Get existing load IDs for this criteria

    const { data: existingLoads } = await supabase
        .from('found_loads')
        .select('cloudtrucks_load_id')
        .eq('criteria_id', criteriaId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIds = new Set(existingLoads?.map((l: any) => l.cloudtrucks_load_id) || []);

    // Filter out loads we've already saved
    const newLoads = loads.filter(load => !existingIds.has(load.id));

    if (newLoads.length === 0) {
        console.log(`No new loads for criteria ${criteriaId}`);
        return 0;
    }

    // Insert new loads
    const { error } = await supabase
        .from('found_loads')
        .insert(
            newLoads.map(load => ({
                criteria_id: criteriaId,
                cloudtrucks_load_id: load.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                details: (load.raw || load) as any, // Store raw data or the load object itself
                status: 'found',
            }))
        )
        .select();

    if (error) {
        console.error('Error saving loads:', error);
        throw error;
    }

    console.log(`Saved ${newLoads.length} new loads for criteria ${criteriaId}`);
    return newLoads.length;
}

/**
 * Main scan function - scans loads for a specific user
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scanLoadsForUser(userId: string, supabaseClient?: any): Promise<{
    success: boolean;
    loadsFound: number;
    error?: string;
}> {
    try {
        console.log(`[SCANNER] Starting scan for user ${userId}`);

        // 1. Get user's credentials
        const credentials = await getUserCredentials(userId, supabaseClient);

        // 2. Get user's active search criteria
        const supabase = supabaseClient || getSupabaseClient();
        const { data: criteriaList, error: criteriaError } = await supabase
            .from('search_criteria')
            .select('*')
            .eq('user_id', userId)
            .eq('active', true);

        if (criteriaError) {
            console.error(`[SCANNER] Criteria fetch error for ${userId}:`, criteriaError);
            throw criteriaError;
        }

        if (!criteriaList || criteriaList.length === 0) {
            console.log(`[SCANNER] No active criteria for user ${userId}`);
            return { success: true, loadsFound: 0 };
        }

        console.log(`[SCANNER] Found ${criteriaList.length} active criteria for user ${userId}`);

        let totalLoadsFound = 0;
        const scanErrors: string[] = [];

        // 3. For each criteria, fetch and filter loads
        // For now, we still call scrapeCloudTrucksLoads which launches a browser
        // but we ensure failure in one doesn't kill the whole thing and errors are reported.
        for (const criteria of criteriaList) {
            try {
                console.log(`[SCANNER] Processing criteria: ${criteria.origin_city} -> ${criteria.dest_city || 'Any'}`);
                const allLoads = await fetchLoadsFromCloudTrucks(credentials, criteria);

                if (allLoads && allLoads.length > 0) {
                    const savedCount = await saveNewLoads(criteria.id, allLoads, supabaseClient);
                    totalLoadsFound += savedCount;
                } else {
                    console.log(`[SCANNER] No loads found for criteria ${criteria.id}`);
                }

            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`[SCANNER] Error processing criteria ${criteria.id}:`, message);
                scanErrors.push(message);
            }
        }

        if (scanErrors.length > 0 && totalLoadsFound === 0) {
            // If everything failed, report the first error
            return {
                success: false,
                loadsFound: 0,
                error: `Scraper failed: ${scanErrors[0]}`,
            };
        }

        console.log(`[SCANNER] Scan complete for user ${userId}. Found ${totalLoadsFound} new loads.`);

        return {
            success: true,
            loadsFound: totalLoadsFound,
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[SCANNER] Fatal scan failed for user ${userId}:`, message);
        return {
            success: false,
            loadsFound: 0,
            error: message,
        };
    }
}

/**
 * Scan loads for all users with active credentials
 */
export async function scanLoadsForAllUsers(): Promise<{
    totalScanned: number;
    totalLoadsFound: number;
    errors: string[];
}> {
    console.log('Starting scan for all users...');

    const supabase = getSupabaseClient();

    // Get all users with credentials
    const { data: credentials, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('user_id');

    if (error || !credentials) {
        console.error('Error fetching credentials:', error);
        return {
            totalScanned: 0,
            totalLoadsFound: 0,
            errors: [error?.message || 'Failed to fetch credentials'],
        };
    }

    const results = {
        totalScanned: 0,
        totalLoadsFound: 0,
        errors: [] as string[],
    };

    // Scan for each user
    for (const { user_id } of credentials) {
        const result = await scanLoadsForUser(user_id);
        results.totalScanned++;

        if (result.success) {
            results.totalLoadsFound += result.loadsFound;
        } else {
            results.errors.push(`User ${user_id}: ${result.error}`);
        }
    }

    console.log(`Scan complete. Scanned ${results.totalScanned} users, found ${results.totalLoadsFound} loads.`);

    return results;
}
