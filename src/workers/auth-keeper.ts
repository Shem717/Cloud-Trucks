
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';
import { testApiConnection } from './cloudtrucks-api-client';

// Lazy initialization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any | null = null;
function getSupabaseClient() {
    if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase Config');
        }
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return supabase;
}

/**
 * Check health of all stored credentials
 */
export async function checkAllCredentialsHealth() {
    console.log('[AUTH KEEPER] Starting credential health check...');
    const supabase = getSupabaseClient();

    // 1. Fetch all credentials
    const { data: credentials, error } = await supabase
        .from('cloudtrucks_credentials')
        .select('user_id, encrypted_session_cookie, encrypted_csrf_token, updated_at');

    if (error || !credentials) {
        console.error('[AUTH KEEPER] Failed to fetch credentials:', error);
        return;
    }

    console.log(`[AUTH KEEPER] Checking ${credentials.length} users...`);

    let validCount = 0;
    let expiredCount = 0;

    for (const cred of credentials) {
        try {
            const cookie = decrypt(cred.encrypted_session_cookie);
            const csrf = cred.encrypted_csrf_token ? decrypt(cred.encrypted_csrf_token) : '';

            // 2. Ping CloudTrucks API
            const { success, error: apiError } = await testApiConnection(cookie, csrf);

            const status = success ? 'valid' : 'expired';

            // 3. Update Status in DB
            await supabase
                .from('cloudtrucks_credentials')
                .update({
                    status: status,
                    last_checked_at: new Date().toISOString(),
                    // If failed, maybe store the error message?
                    validation_error: success ? null : apiError
                })
                .eq('user_id', cred.user_id);

            if (success) {
                validCount++;
            } else {
                expiredCount++;
                console.log(`[AUTH KEEPER] User ${cred.user_id} session is EXPIRED.`);
                // TODO: Trigger email notification here
            }

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[AUTH KEEPER] Error processing user ${cred.user_id}:`, message);
        }
    }

    console.log(`[AUTH KEEPER] Check complete. Valid: ${validCount}, Expired: ${expiredCount}`);
    return { validCount, expiredCount };
}
