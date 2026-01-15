import { createClient } from '@supabase/supabase-js';
import { decryptCredentials } from '@/lib/crypto';

//  @ts-nocheck - Disable type checking for Supabase client until types are generated

// Lazy initialization to avoid build-time errors
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
async function getUserCredentials(userId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('encrypted_email, encrypted_session_cookie')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error(`No credentials found for user ${userId}`);
    }

    const { email, password: cookie } = await decryptCredentials(
        (data as any).encrypted_email,
        (data as any).encrypted_session_cookie
    );

    return { email, cookie };
}

/**
 * Fetch loads from CloudTrucks using Playwright web scraping
 */
async function fetchLoadsFromCloudTrucks(
    credentials: { email: string; cookie: string },
    criteria: any
): Promise<any[]> {
    try {
        // Import the scraper (dynamic import to avoid loading Playwright at build time)
        const { scrapeCloudTrucksLoads } = await import('./cloudtrucks-scraper');

        // Cast criteria to any to match the updated scraper interface
        // In a real app we would share the interface
        const loads = await scrapeCloudTrucksLoads(
            credentials.email,
            credentials.cookie,
            criteria
        );

        return loads;
    } catch (error) {
        console.error('CloudTrucks scraping error:', error);
        // Fallback to empty array if scraping fails
        return [];
    }
}

/**
 * Save newly found loads to database (avoiding duplicates)
 */
async function saveNewLoads(criteriaId: string, loads: any[]) {
    if (loads.length === 0) return 0;

    const supabase = getSupabaseClient();

    // Get existing load IDs for this criteria
    const { data: existingLoads } = await supabase
        .from('found_loads')
        .select('cloudtrucks_load_id')
        .eq('criteria_id', criteriaId);

    const existingIds = new Set(existingLoads?.map((l: any) => l.cloudtrucks_load_id) || []);

    // Filter out loads we've already saved
    const newLoads = loads.filter(load => !existingIds.has(load.id));

    if (newLoads.length === 0) {
        console.log(`No new loads for criteria ${criteriaId}`);
        return 0;
    }

    // Insert new loads
    const { data, error } = await supabase
        .from('found_loads')
        .insert(
            newLoads.map(load => ({
                criteria_id: criteriaId,
                cloudtrucks_load_id: load.id,
                details: load,
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
export async function scanLoadsForUser(userId: string): Promise<{
    success: boolean;
    loadsFound: number;
    error?: string;
}> {
    try {
        console.log(`Starting scan for user ${userId}`);

        // 1. Get user's credentials
        const credentials = await getUserCredentials(userId);

        // 2. Get user's active search criteria
        const supabase = getSupabaseClient();
        const { data: criteriaList, error: criteriaError } = await supabase
            .from('search_criteria')
            .select('*')
            .eq('user_id', userId)
            .eq('active', true);

        if (criteriaError) {
            throw criteriaError;
        }

        if (!criteriaList || criteriaList.length === 0) {
            console.log(`No active criteria for user ${userId}`);
            return { success: true, loadsFound: 0 };
        }

        let totalLoadsFound = 0;

        // 3. For each criteria, fetch and filter loads
        for (const criteria of criteriaList) {
            try {
                const allLoads = await fetchLoadsFromCloudTrucks(credentials, criteria);
                const savedCount = await saveNewLoads(criteria.id, allLoads);
                totalLoadsFound += savedCount;

            } catch (error) {
                console.error(`Error processing criteria ${criteria.id}:`, error);
                // Continue with next criteria even if one fails
            }
        }

        console.log(`Scan complete for user ${userId}. Found ${totalLoadsFound} new loads.`);

        return {
            success: true,
            loadsFound: totalLoadsFound,
        };

    } catch (error: any) {
        console.error(`Scan failed for user ${userId}:`, error);
        return {
            success: false,
            loadsFound: 0,
            error: error.message,
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
