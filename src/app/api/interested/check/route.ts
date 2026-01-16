import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decrypt } from '@/lib/crypto';
import { fetchLoadsViaApi } from '@/workers/cloudtrucks-api-client';

/**
 * POST /api/interested/check - Check availability of interested loads
 * 
 * This re-scans using the CloudTrucks API and matches by load ID to verify
 * if the interested loads are still available.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's interested loads
        const { data: interestedLoads, error: loadError } = await supabase
            .from('interested_loads')
            .select('*')
            .eq('user_id', user.id);

        if (loadError || !interestedLoads || interestedLoads.length === 0) {
            return NextResponse.json({
                message: 'No interested loads to check',
                results: []
            });
        }

        // Get user's credentials
        const { data: creds, error: credError } = await supabase
            .from('cloudtrucks_credentials')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (credError || !creds) {
            return NextResponse.json(
                { error: 'No CloudTrucks credentials found. Please reconnect.' },
                { status: 400 }
            );
        }

        // Decrypt credentials
        let sessionCookie: string;
        let csrfToken: string;
        try {
            sessionCookie = decrypt(creds.encrypted_session_cookie);
            csrfToken = decrypt(creds.encrypted_csrf_token);
        } catch (decryptError: any) {
            console.error('[API] Decryption error:', decryptError);
            return NextResponse.json(
                { error: 'Failed to decrypt credentials' },
                { status: 500 }
            );
        }

        // Group loads by origin city to minimize API calls
        const loadsByOrigin: Record<string, typeof interestedLoads> = {};
        for (const load of interestedLoads) {
            const origin = load.details.origin_city || 'Unknown';
            if (!loadsByOrigin[origin]) {
                loadsByOrigin[origin] = [];
            }
            loadsByOrigin[origin].push(load);
        }

        const results: { id: string; status: 'available' | 'expired' | 'unknown' }[] = [];
        const availableLoadIds = new Set<string>();

        // Scan each origin and collect available load IDs
        for (const [originCity, loads] of Object.entries(loadsByOrigin)) {
            const sample = loads[0].details;
            try {
                const freshLoads = await fetchLoadsViaApi(
                    sessionCookie,
                    csrfToken,
                    {
                        origin_city: sample.origin_city || originCity,
                        origin_state: sample.origin_state,
                        pickup_distance: 100, // Wider search to catch loads
                    },
                    15000 // 15 second timeout
                );

                for (const freshLoad of freshLoads) {
                    availableLoadIds.add(freshLoad.id);
                }
            } catch (scanError: any) {
                console.error(`[API] Scan error for ${originCity}:`, scanError.message);
                // Mark all loads from this origin as unknown
                for (const load of loads) {
                    results.push({ id: load.id, status: 'unknown' });
                }
                continue;
            }
        }

        // Update each interested load's status
        for (const load of interestedLoads) {
            const isAvailable = availableLoadIds.has(load.cloudtrucks_load_id);
            const newStatus = isAvailable ? 'available' : 'expired';

            // Skip if we already handled this as unknown
            if (results.some(r => r.id === load.id)) continue;

            // Update in database
            await supabase
                .from('interested_loads')
                .update({
                    status: newStatus,
                    last_checked_at: new Date().toISOString()
                })
                .eq('id', load.id);

            results.push({ id: load.id, status: newStatus });
        }

        return NextResponse.json({
            success: true,
            message: `Checked ${results.length} loads`,
            results
        });

    } catch (error: any) {
        console.error('[API] Check availability error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
