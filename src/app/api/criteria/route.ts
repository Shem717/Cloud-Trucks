import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchLoadsFromCloudTrucks } from '@/workers/scanner';

/**
 * POST /api/criteria - Create new search criteria
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        console.log('Received criteria form data:', Object.fromEntries(formData));

        const rawDate = formData.get('pickup_date') as string;
        // Postgres date format is YYYY-MM-DD
        // Date input sends YYYY-MM-DD, but empty string should be null
        const pickupDate = rawDate && rawDate.trim() !== '' ? rawDate : null;

        const parseNumeric = (val: any, type: 'int' | 'float', min?: number, max?: number) => {
            if (!val || val.toString().trim() === '' || val === 'Any') return null;
            // Remove ' mi', ',' or other non-numeric characters except dot
            const cleaned = val.toString().replace(/[^0-9.]/g, '');
            const parsed = type === 'int' ? parseInt(cleaned) : parseFloat(cleaned);
            if (isNaN(parsed)) return null;
            // Apply bounds validation
            if (min !== undefined && parsed < min) return min;
            if (max !== undefined && parsed > max) return max;
            return parsed;
        };

        const parseStates = (val: any): string[] | null => {
            if (!val || val.toString().trim() === '') return null;
            const states = val.toString().split(',').map((s: string) => s.trim()).filter(Boolean);
            return states.length > 0 ? states : null;
        };

        const originStates = parseStates(formData.get('origin_states'));
        const destStates = parseStates(formData.get('destination_states'));

        const criteria = {
            user_id: user.id,
            origin_city: formData.get('origin_city') as string || null,
            origin_state: formData.get('origin_state') as string || (originStates?.[0] ?? null),
            origin_states: originStates,
            // Validate pickup_distance: min 1 mile, max 500 miles
            pickup_distance: parseNumeric(formData.get('pickup_distance'), 'int', 1, 500) || 50,
            pickup_date: pickupDate,
            dest_city: formData.get('dest_city') as string || null,
            destination_state: formData.get('destination_state') === 'any' ? null : (formData.get('destination_state') as string || (destStates?.[0] ?? null)),
            destination_states: destStates,
            // Validate min_rate: min $0, max $50,000
            min_rate: parseNumeric(formData.get('min_rate'), 'float', 0, 50000),
            // Validate weights: min 0 lbs, max 100,000 lbs
            min_weight: parseNumeric(formData.get('min_weight'), 'int', 0, 100000),
            max_weight: parseNumeric(formData.get('max_weight'), 'int', 0, 100000),
            equipment_type: formData.get('equipment_type') === 'Any' ? null : (formData.get('equipment_type') as string || null),
            booking_type: formData.get('booking_type') === 'Any' ? null : (formData.get('booking_type') as string || null),
            active: true,
            is_backhaul: formData.get('is_backhaul') === 'true',
        };

        console.log('Inserting criteria:', criteria);

        const { data, error } = await supabase
            .from('search_criteria')
            .insert(criteria)
            .select()
            .single();

        if (error) {
            console.error('Supabase DB Error on Insert:', error);
            console.error('Error Details:', JSON.stringify(error, null, 2));
            return NextResponse.json({
                error: error.message || 'Failed to create search criteria',
                details: error
            }, { status: 500 });
        }

        // --- IMMEDIATE SCAN TRIGGER (Fire-and-forget for speed) ---
        // We do NOT await this in the main thread to prevent timeouts,
        // but we update the criteria record with scan status for visibility.
        (async () => {
            const updateScanStatus = async (status: 'scanning' | 'success' | 'error', errorMessage?: string, loadsFound?: number) => {
                try {
                    await supabase
                        .from('search_criteria')
                        .update({
                            last_scanned_at: new Date().toISOString(),
                            scan_status: status,
                            scan_error: errorMessage || null,
                            last_scan_loads_found: loadsFound ?? null,
                        })
                        .eq('id', data.id);
                } catch (updateError) {
                    console.error('[API] Failed to update scan status:', updateError);
                }
            };

            try {
                console.log(`[API] Triggering synchronous scan for criteria ${data.id}`);
                await updateScanStatus('scanning');

                // 1. Get Credentials (inline to use user session)
                const { data: creds, error: credError } = await supabase
                    .from('cloudtrucks_credentials')
                    .select('encrypted_email, encrypted_session_cookie, encrypted_csrf_token')
                    .eq('user_id', user.id)
                    .single();

                if (credError || !creds) {
                    console.error('[API] No credentials found for scan');
                    await updateScanStatus('error', 'No credentials found. Please connect your CloudTrucks account.');
                    return;
                }

                // Use decrypt() directly - same fix as debugger route
                let cookie: string;
                let csrfToken = '';
                try {
                    const { decrypt } = await import('@/lib/crypto');
                    cookie = decrypt(creds.encrypted_session_cookie);
                    console.log(`[API] Session cookie decrypted: ${cookie?.substring(0, 10)}...`);

                    if (creds.encrypted_csrf_token) {
                        csrfToken = decrypt(creds.encrypted_csrf_token);
                        console.log(`[API] CSRF token decrypted: ${csrfToken?.substring(0, 10)}...`);
                    }
                } catch (decryptError: any) {
                    console.error('[API] Decryption failed:', decryptError.message);
                    await updateScanStatus('error', 'Failed to decrypt credentials. Please reconnect your account.');
                    return;
                }

                // 2. Fetch Loads
                const loads = await fetchLoadsFromCloudTrucks({ email: '', cookie, csrfToken }, data);

                console.log(`[API] fetchLoadsFromCloudTrucks returned ${loads?.length} loads`);

                // 3. Save Loads
                let newLoadsCount = 0;
                if (loads && loads.length > 0) {
                    const { data: existing } = await supabase
                        .from('found_loads')
                        .select('cloudtrucks_load_id')
                        .eq('criteria_id', data.id);

                    const existingIds = new Set(existing?.map((x: any) => x.cloudtrucks_load_id));
                    const newLoads = loads.filter(l => !existingIds.has(l.id));

                    if (newLoads.length > 0) {
                        const { error: saveError } = await supabase.from('found_loads').insert(
                            newLoads.map(load => ({
                                criteria_id: data.id,
                                cloudtrucks_load_id: load.id,
                                details: load,
                                status: 'found'
                            }))
                        );

                        if (saveError) {
                            console.error('[API] Error saving loads:', saveError);
                            await updateScanStatus('error', `Failed to save loads: ${saveError.message}`);
                            return;
                        }
                        newLoadsCount = newLoads.length;
                        console.log(`[API] Saved ${newLoadsCount} new loads`);
                    } else {
                        console.log('[API] No new loads to save (duplicates)');
                    }
                } else {
                    console.log('[API] Scan found 0 loads');
                }

                await updateScanStatus('success', undefined, newLoadsCount);
            } catch (scanError: any) {
                console.error('[API] Background Scan failed:', scanError.message);
                await updateScanStatus('error', scanError.message || 'Unknown scan error');
            }
        })();

        return NextResponse.json({ success: true, criteria: data });


    } catch (error: any) {
        console.error('API Unexpected Error:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/criteria - Get user's search criteria
 * Query Params: ?view=trash (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const view = searchParams.get('view');

        let query = supabase
            .from('search_criteria')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (view === 'trash') {
            query = query.not('deleted_at', 'is', null);
        } else {
            query = query.is('deleted_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching criteria:', error);
            return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/criteria?id=xxx - Soft Delete a specific criteria
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const permanent = searchParams.get('permanent') === 'true';

        if (!id) {
            return NextResponse.json({ error: 'Missing criteria ID' }, { status: 400 });
        }

        let error;

        if (permanent) {
            // Hard Delete
            const res = await supabase
                .from('search_criteria')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            error = res.error;
        } else {
            // Soft Delete
            const res = await supabase
                .from('search_criteria')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            error = res.error;
        }

        if (error) {
            console.error('Error deleting criteria:', error);
            return NextResponse.json({ error: 'Failed to delete criteria' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/criteria - Restore valid criteria or update settings
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, action } = body;

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        if (action === 'restore') {
            const { error } = await supabase
                .from('search_criteria')
                .update({ deleted_at: null })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("API Patch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
