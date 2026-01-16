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

        const parseNumeric = (val: any, type: 'int' | 'float') => {
            if (!val || val.toString().trim() === '' || val === 'Any') return null;
            // Remove ' mi', ',' or other non-numeric characters except dot
            const cleaned = val.toString().replace(/[^0-9.]/g, '');
            const parsed = type === 'int' ? parseInt(cleaned) : parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
        };

        const criteria = {
            user_id: user.id,
            origin_city: formData.get('origin_city') as string || null,
            origin_state: formData.get('origin_state') as string || null,
            // Fallback to 50 if null, but ensure usage of parsed result
            pickup_distance: parseNumeric(formData.get('pickup_distance'), 'int') || 50,
            pickup_date: pickupDate,
            dest_city: formData.get('dest_city') as string || null,
            destination_state: formData.get('destination_state') === 'any' ? null : (formData.get('destination_state') as string || null),
            min_rate: parseNumeric(formData.get('min_rate'), 'float'),
            min_weight: parseNumeric(formData.get('min_weight'), 'int'),
            max_weight: parseNumeric(formData.get('max_weight'), 'int'),
            equipment_type: formData.get('equipment_type') === 'Any' ? null : (formData.get('equipment_type') as string || null),
            booking_type: formData.get('booking_type') === 'Any' ? null : (formData.get('booking_type') as string || null),
            active: true,
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
        // but we log heavily for debugging.
        (async () => {
            try {
                console.log(`[API] Triggering synchronous scan for criteria ${data.id}`);

                // 1. Get Credentials (inline to use user session)
                const { data: creds, error: credError } = await supabase
                    .from('cloudtrucks_credentials')
                    .select('encrypted_email, encrypted_session_cookie, encrypted_csrf_token')
                    .eq('user_id', user.id)
                    .single();

                if (credError || !creds) {
                    console.error('[API] No credentials found for scan');
                    return;
                }

                // Use decrypt() directly - same fix as debugger route
                const { decrypt } = await import('@/lib/crypto');

                const cookie = decrypt(creds.encrypted_session_cookie);
                console.log(`[API] Session cookie decrypted: ${cookie.substring(0, 10)}...`);

                let csrfToken = '';
                if (creds.encrypted_csrf_token) {
                    csrfToken = decrypt(creds.encrypted_csrf_token);
                    console.log(`[API] CSRF token decrypted: ${csrfToken.substring(0, 10)}...`);
                }

                // 2. Fetch Loads
                const loads = await fetchLoadsFromCloudTrucks({ email: '', cookie, csrfToken }, data);

                console.log(`[API] fetchLoadsFromCloudTrucks returned ${loads?.length} loads`);

                // 3. Save Loads
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

                        if (saveError) console.error('[API] Error saving loads:', saveError);
                        else console.log(`[API] Saved ${newLoads.length} new loads`);
                    } else {
                        console.log('[API] No new loads to save (duplicates)');
                    }
                } else {
                    console.log('[API] Scan found 0 loads');
                }
            } catch (scanError: any) {
                console.error('[API] Background Scan failed:', scanError.message);
            }
        })();

        return NextResponse.json({ success: true, data });

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
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('search_criteria')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

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
 * DELETE /api/criteria?id=xxx - Delete a specific criteria
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

        if (!id) {
            return NextResponse.json({ error: 'Missing criteria ID' }, { status: 400 });
        }

        const { error } = await supabase
            .from('search_criteria')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user owns this criteria

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
