import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRequestContext } from '@/lib/request-context';

const USER_CRITERIA_TABLE = 'search_criteria';
const GUEST_CRITERIA_TABLE = 'guest_search_criteria';

/**
 * POST /api/criteria - Create new search criteria
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        // Guest sandbox tables are server-only (RLS enabled without policies).
        // Use the admin client for guest DB operations while still using the
        // request-scoped client for auth/session detection.
        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const table = isGuest ? GUEST_CRITERIA_TABLE : USER_CRITERIA_TABLE;

        const formData = await request.formData();

        const rawDate = formData.get('pickup_date') as string;
        // Postgres date format is YYYY-MM-DD
        // Date input sends YYYY-MM-DD, but empty string should be null
        const pickupDate = rawDate && rawDate.trim() !== '' ? rawDate : null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parseStates = (val: any): string[] | null => {
            if (!val || val.toString().trim() === '') return null;
            const states = val.toString().split(',').map((s: string) => s.trim()).filter(Boolean);
            return states.length > 0 ? states : null;
        };

        const originStates = parseStates(formData.get('origin_states'));
        const destStates = parseStates(formData.get('destination_states'));

        const criteriaBase = {
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
            // Validate min_rpm: min $0, max $50
            min_rpm: parseNumeric(formData.get('min_rpm'), 'float', 0, 50),
            // Validate weights: min 0 lbs, max 100,000 lbs
            min_weight: parseNumeric(formData.get('min_weight'), 'int', 0, 100000),
            max_weight: parseNumeric(formData.get('max_weight'), 'int', 0, 100000),
            equipment_type: formData.get('equipment_type') === 'Any' ? null : (formData.get('equipment_type') as string || null),
            booking_type: formData.get('booking_type') === 'Any' ? null : (formData.get('booking_type') as string || null),
            active: true,
            is_backhaul: formData.get('is_backhaul') === 'true',
        };

        // Enforce guest sandbox limits server-side.
        if (isGuest && guestSession) {
            const { count } = await db
                .from(GUEST_CRITERIA_TABLE)
                .select('id', { count: 'exact', head: true })
                .eq('guest_session', guestSession)
                .is('deleted_at', null);

            if ((count ?? 0) >= 10) {
                return NextResponse.json({
                    error: 'Guest sandbox limit reached (10 active scouts). Please delete a scout or sign in.',
                }, { status: 429 });
            }
        }

        const criteria = isGuest
            ? { guest_session: guestSession, ...criteriaBase }
            : { user_id: userId, ...criteriaBase };

        const { data, error } = await db
            .from(table)
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

        return NextResponse.json({ success: true, criteria: data });


    } catch (error: unknown) {
        console.error('API Unexpected Error:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error instanceof Error ? error.message : String(error)
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
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const table = isGuest ? GUEST_CRITERIA_TABLE : USER_CRITERIA_TABLE;

        const { searchParams } = new URL(request.url);
        const view = searchParams.get('view');

        let query = db
            .from(table)
            .select('*')
            .order('created_at', { ascending: false });

        query = isGuest
            ? query.eq('guest_session', guestSession)
            : query.eq('user_id', userId);

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
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const table = isGuest ? GUEST_CRITERIA_TABLE : USER_CRITERIA_TABLE;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const permanent = searchParams.get('permanent') === 'true';

        if (!id) {
            return NextResponse.json({ error: 'Missing criteria ID' }, { status: 400 });
        }

        let error;

        if (permanent) {
            // Hard Delete
            let query = db.from(table).delete().eq('id', id);

            query = isGuest
                ? query.eq('guest_session', guestSession as string)
                : query.eq('user_id', userId as string);

            const res = await query;
            error = res.error;
        } else {
            // Soft Delete
            let query = db
                .from(table)
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            query = isGuest
                ? query.eq('guest_session', guestSession as string)
                : query.eq('user_id', userId as string);

            const res = await query;
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
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const table = isGuest ? GUEST_CRITERIA_TABLE : USER_CRITERIA_TABLE;

        const body = await request.json();
        const { id, action, updates } = body;

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        if (action === 'restore') {
            let query = db
                .from(table)
                .update({ deleted_at: null })
                .eq('id', id);

            query = isGuest
                ? query.eq('guest_session', guestSession as string)
                : query.eq('user_id', userId as string);

            const res = await query;
            if (res.error) throw new Error('Failed to restore');

            return NextResponse.json({ success: true });
        }

        if (action === 'update') {
            // Sanitize updates - allow only specific fields
            const allowedFields = [
                'origin_city', 'origin_state', 'origin_states',
                'dest_city', 'destination_state', 'destination_states',
                'pickup_distance', 'pickup_date',
                'min_rate', 'min_rpm', 'min_weight', 'max_weight',
                'equipment_type', 'booking_type'
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const safeUpdates: any = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    safeUpdates[key] = updates[key];
                }
            });

            if (Object.keys(safeUpdates).length === 0) {
                return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
            }

            let query = db
                .from(table)
                .update(safeUpdates)
                .eq('id', id);

            query = isGuest
                ? query.eq('guest_session', guestSession as string)
                : query.eq('user_id', userId as string);

            const { data, error } = await query.select();

            if (error) {
                console.error("Update error:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, criteria: data });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("API Patch Error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
