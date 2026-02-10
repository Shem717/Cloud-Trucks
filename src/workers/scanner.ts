/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';
import { CloudTrucksLoad, SearchCriteria } from './cloudtrucks-api-client';

// Lazy initialization to avoid build-time errors
let supabase: any | null = null;

const USER_CRITERIA_TABLE = 'search_criteria';
const USER_FOUND_TABLE = 'found_loads';
const GUEST_CRITERIA_TABLE = 'guest_search_criteria';
const GUEST_FOUND_TABLE = 'guest_found_loads';

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
export async function getUserCredentials(userId: string, supabaseClient?: SupabaseClient<Database>): Promise<UserCredentials> {
    const supabase = supabaseClient || getSupabaseClient();
    const { data, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('encrypted_email, encrypted_session_cookie, encrypted_csrf_token')
        .eq('user_id', userId)
        .single();

    const typedData = data as Database['public']['Tables']['cloudtrucks_credentials']['Row'] | null;

    if (error || !typedData) {
        throw new Error(`No credentials found for user ${userId}`);
    }

    // Decrypt credentials using decrypt() directly
    const email = decrypt(typedData.encrypted_email);
    const cookie = decrypt(typedData.encrypted_session_cookie);

    // Decrypt CSRF token if available
    let csrfToken = '';
    if (data.encrypted_csrf_token) {
        csrfToken = decrypt(data.encrypted_csrf_token);
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
 * Save newly found loads to database (updating latest + preserving history)
 */
 
export async function saveNewLoads(criteriaId: string, loads: CloudTrucksLoad[], supabaseClient?: any) {
    if (loads.length === 0) return 0;

    const supabase = supabaseClient || getSupabaseClient();

    // Prepare rows with update tracking
    const rows = loads.map((load) => ({
        criteria_id: criteriaId,
        cloudtrucks_load_id: load.id,
         
        details: (load.raw || load) as any,
        status: 'found',
        updated_at: new Date().toISOString(),
    }));

    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    let totalUpdated = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        // Fetch existing IDs to determine which are updates vs inserts
        const loadIds = batch.map(b => b.cloudtrucks_load_id);
        const { data: existing } = await supabase
            .from(USER_FOUND_TABLE)
            .select('cloudtrucks_load_id')
            .eq('criteria_id', criteriaId)
            .in('cloudtrucks_load_id', loadIds);

        const existingIds = new Set((existing || []).map((e: any) => e.cloudtrucks_load_id));

        // Step 1: Insert into load_history to preserve all scan data
        const historyRows = batch.map(row => ({
            criteria_id: row.criteria_id,
            cloudtrucks_load_id: row.cloudtrucks_load_id,
            details: row.details,
            status: row.status,
            scanned_at: row.updated_at,
        }));

        const { error: historyError } = await supabase
            .from('load_history')
            .insert(historyRows);

        if (historyError) {
            console.error('Error saving load history:', historyError);
            // Non-fatal: continue with upsert even if history fails
        }

        // Step 2: Upsert into found_loads (latest version)
        const { data, error } = await supabase
            .from(USER_FOUND_TABLE)
            .upsert(batch, {
                onConflict: 'cloudtrucks_load_id,criteria_id',
                // Removed: ignoreDuplicates: true
            })
            .select('cloudtrucks_load_id');

        if (error) {
            console.error('Error upserting loads:', error);
            throw error;
        }

        const upsertedCount = data?.length ?? 0;
        totalUpserted += upsertedCount;

        // Increment scan_count for loads that already existed (were updated)
        const updatedIds = loadIds.filter(id => existingIds.has(id));
        if (updatedIds.length > 0) {
            try {
                await supabase.rpc('increment_scan_count', {
                    load_ids: updatedIds,
                    criteria_id_param: criteriaId
                });
                totalUpdated += updatedIds.length;
            } catch (rpcError) {
                console.error('Error incrementing scan count:', rpcError);
                // Non-fatal: continue even if RPC fails
            }
        }
    }

    if (totalUpserted === 0) {
        console.log(`No loads upserted for criteria ${criteriaId}`);
        return 0;
    }

    console.log(`✓ Upserted ${totalUpserted} loads for criteria ${criteriaId} (${totalUpdated} updated, ${totalUpserted - totalUpdated} new)`);
    return totalUpserted;
}

/**
 * Main scan function - scans loads for a specific user
 */
 
type ScanScope = 'all' | 'fronthaul' | 'backhaul';

export async function scanLoadsForUser(
    userId: string,
    supabaseClient?: any,
    specificCriteriaId?: string,
    scope: ScanScope = 'all'
): Promise<{
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
        let query = supabase
            .from(USER_CRITERIA_TABLE)
            .select('*')
            .eq('user_id', userId)
            .eq('active', true)
            .is('deleted_at', null);

        if (scope === 'fronthaul') {
            query = query.or('is_backhaul.is.null,is_backhaul.eq.false');
        } else if (scope === 'backhaul') {
            query = query.eq('is_backhaul', true);
        }

        if (specificCriteriaId) {
            query = query.eq('id', specificCriteriaId);
        }

        const { data: criteriaList, error: criteriaError } = await query;

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
                // Update status to scanning
                await supabase
                    .from(USER_CRITERIA_TABLE)
                    .update({
                        last_scanned_at: new Date().toISOString(),
                        scan_status: 'scanning',
                        scan_error: null,
                    })
                    .eq('id', criteria.id);

                console.log(`[SCANNER] Processing criteria: ${criteria.origin_city} -> ${criteria.dest_city || 'Any'}`);
                const allLoads = await fetchLoadsFromCloudTrucks(credentials, criteria);

                if (allLoads && allLoads.length > 0) {
                    // ALWAYS use the Service Role client for saving to bypass RLS
                    const savedCount = await saveNewLoads(criteria.id, allLoads, getSupabaseClient());
                    totalLoadsFound += savedCount;

                    // Update status to success
                    await supabase
                        .from(USER_CRITERIA_TABLE)
                        .update({
                            scan_status: 'success',
                            last_scan_loads_found: savedCount,
                            scan_error: null,
                        })
                        .eq('id', criteria.id);
                } else {
                    console.log(`[SCANNER] No loads found for criteria ${criteria.id}`);

                    // Update status to success (but 0 loads)
                    await supabase
                        .from(USER_CRITERIA_TABLE)
                        .update({
                            scan_status: 'success',
                            last_scan_loads_found: 0,
                            scan_error: null,
                        })
                        .eq('id', criteria.id);
                }

            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`[SCANNER] Error processing criteria ${criteria.id}:`, message);
                scanErrors.push(message);

                // Update status to error
                await supabase
                    .from(USER_CRITERIA_TABLE)
                    .update({
                        scan_status: 'error',
                        scan_error: message,
                        last_scan_loads_found: 0,
                    })
                    .eq('id', criteria.id);
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

type GuestAdminCredentials = {
    cookie: string;
    csrfToken: string;
};

async function getGuestAdminCredentials(supabase: any): Promise<GuestAdminCredentials> {
    const { data, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('encrypted_session_cookie, encrypted_csrf_token')
        .eq('is_valid', true)
        .order('last_validated_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        throw new Error('No valid CloudTrucks credentials available for guest sandbox scans');
    }

    const cookie = decrypt(data.encrypted_session_cookie);
    const csrfToken = data.encrypted_csrf_token ? decrypt(data.encrypted_csrf_token) : '';

    return { cookie, csrfToken };
}

// Save guest loads in guest_found_loads, updating latest + preserving history.
 
async function saveNewGuestLoads(criteriaId: string, loads: CloudTrucksLoad[], supabaseClient: any) {
    if (loads.length === 0) return 0;

    // Cap guest storage per criteria to reduce abuse.
    const uniqueLoads = Array.from(new Map(loads.map((l) => [l.id, l])).values());
    const capped = uniqueLoads.slice(0, 200);

    const rows = capped.map((load) => ({
        criteria_id: criteriaId,
        cloudtrucks_load_id: load.id,
         
        details: (load.raw || load) as any,
        status: 'found',
        updated_at: new Date().toISOString(),
    }));

    // Fetch existing IDs to determine updates vs inserts
    const loadIds = rows.map(r => r.cloudtrucks_load_id);
    const { data: existing } = await supabaseClient
        .from(GUEST_FOUND_TABLE)
        .select('cloudtrucks_load_id')
        .eq('criteria_id', criteriaId)
        .in('cloudtrucks_load_id', loadIds);

    const existingIds = new Set((existing || []).map((e: any) => e.cloudtrucks_load_id));

    // Step 1: Insert into guest_load_history to preserve all scan data
    const historyRows = rows.map(row => ({
        criteria_id: row.criteria_id,
        cloudtrucks_load_id: row.cloudtrucks_load_id,
        details: row.details,
        status: row.status,
        scanned_at: row.updated_at,
    }));

    const { error: historyError } = await supabaseClient
        .from('guest_load_history')
        .insert(historyRows);

    if (historyError) {
        console.error('Error saving guest load history:', historyError);
        // Non-fatal
    }

    // Step 2: Upsert into guest_found_loads (latest version)
    const { data, error } = await supabaseClient
        .from(GUEST_FOUND_TABLE)
        .upsert(rows, {
            onConflict: 'cloudtrucks_load_id,criteria_id',
            // Removed: ignoreDuplicates: true
        })
        .select('cloudtrucks_load_id');

    if (error) throw error;

    const upsertedCount = data?.length ?? 0;

    // Increment scan_count for existing loads
    const updatedIds = loadIds.filter(id => existingIds.has(id));
    if (updatedIds.length > 0) {
        try {
            await supabaseClient.rpc('increment_guest_scan_count', {
                load_ids: updatedIds,
                criteria_id_param: criteriaId
            });
        } catch (rpcError) {
            console.error('Error incrementing guest scan count:', rpcError);
            // Non-fatal
        }
    }

    return upsertedCount;
}

export async function scanLoadsForGuestSession(guestSession: string): Promise<{
    success: boolean;
    loadsFound: number;
    error?: string;
}> {
    try {
        const supabase = getSupabaseClient();

        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

        const { data: criteriaList, error: criteriaError } = await supabase
            .from(GUEST_CRITERIA_TABLE)
            .select('*')
            .eq('guest_session', guestSession)
            .eq('active', true)
            .is('deleted_at', null)
            // TTL safety: ignore very old guest criteria
            .gte('created_at', fourDaysAgo)
            .limit(10);

        if (criteriaError) throw criteriaError;
        if (!criteriaList || criteriaList.length === 0) {
            return { success: true, loadsFound: 0 };
        }

        // Simple scan throttle: if any criteria was scanned in the last minute, block.
        const mostRecentScan = (criteriaList || [])
            .map((c) => c.last_scanned_at)
            .filter(Boolean)
            .map((d: string) => new Date(d).getTime())
            .sort((a: number, b: number) => b - a)[0];

        if (mostRecentScan && Date.now() - mostRecentScan < 60_000) {
            return {
                success: false,
                loadsFound: 0,
                error: 'Guest scans are rate-limited. Please wait a moment and try again.',
            };
        }

        const adminCreds = await getGuestAdminCredentials(supabase);
        const credentials = { email: 'guest', cookie: adminCreds.cookie, csrfToken: adminCreds.csrfToken };

        let totalLoadsFound = 0;

        for (const criteria of (criteriaList || [])) {
            // Mark scanning
            await supabase
                .from(GUEST_CRITERIA_TABLE)
                .update({
                    last_scanned_at: new Date().toISOString(),
                    scan_status: 'scanning',
                    scan_error: null,
                })
                .eq('id', criteria.id)
                .eq('guest_session', guestSession);

            try {
                const loads = await fetchLoadsFromCloudTrucks(credentials, criteria);
                const saved = await saveNewGuestLoads(criteria.id, loads || [], supabase);
                totalLoadsFound += saved;

                await supabase
                    .from(GUEST_CRITERIA_TABLE)
                    .update({
                        scan_status: 'success',
                        last_scan_loads_found: saved,
                        scan_error: null,
                    })
                    .eq('id', criteria.id)
                    .eq('guest_session', guestSession);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                await supabase
                    .from(GUEST_CRITERIA_TABLE)
                    .update({
                        scan_status: 'error',
                        scan_error: message,
                        last_scan_loads_found: 0,
                    })
                    .eq('id', criteria.id)
                    .eq('guest_session', guestSession);
            }
        }

        return { success: true, loadsFound: totalLoadsFound };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, loadsFound: 0, error: message };
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
