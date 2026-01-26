import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRequestContext } from '@/lib/request-context';

const USER_INTERESTED_TABLE = 'interested_loads';
const USER_FOUND_TABLE = 'found_loads';
const GUEST_INTERESTED_TABLE = 'guest_interested_loads';
const GUEST_FOUND_TABLE = 'guest_found_loads';

/**
 * GET /api/interested - Fetch user's interested loads
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const interestedTable = isGuest ? GUEST_INTERESTED_TABLE : USER_INTERESTED_TABLE;
        const foundTable = isGuest ? GUEST_FOUND_TABLE : USER_FOUND_TABLE;
        const ownerKey = isGuest ? 'guest_session' : 'user_id';
        const ownerValue = isGuest ? guestSession : userId;
        const criteriaJoin = isGuest ? 'guest_search_criteria' : 'search_criteria';

        // Fetch interested loads
        const { data: interestedLoads, error: interestedError } = await db
            .from(interestedTable)
            .select('id, cloudtrucks_load_id, details, status, created_at')
            .eq(ownerKey, ownerValue)
            .eq('status', 'interested')
            .order('created_at', { ascending: false });

        if (interestedError) {
            console.error('[API] Error fetching interested loads:', interestedError);
            return NextResponse.json({ error: interestedError.message }, { status: 500 });
        }

        // FIX: Batch fetch all found_loads in a single query instead of N+1 queries
        const loadIds = (interestedLoads || []).map(l => l.cloudtrucks_load_id);

        // Fetch all matching found_loads in one query
        const foundLoadsMap: Record<string, unknown> = {};
        if (loadIds.length > 0) {
            const { data: foundLoads, error: foundError } = await db
                .from(foundTable)
                // Filter to ONLY the current user/guest's loads to avoid cross-tenant leakage
                .select(`cloudtrucks_load_id, details, created_at, ${criteriaJoin}!inner(${ownerKey})`)
                .in('cloudtrucks_load_id', loadIds)
                .eq(`${criteriaJoin}.${ownerKey}`, ownerValue)
                .order('created_at', { ascending: false });

            if (foundError) {
                console.error('[API] Error fetching found_loads:', foundError);
                // Continue with stored details as fallback
            } else if (foundLoads) {
                // Build a map of cloudtrucks_load_id -> latest details (first occurrence due to ordering)
                foundLoads.forEach(fl => {
                    if (!foundLoadsMap[fl.cloudtrucks_load_id]) {
                        foundLoadsMap[fl.cloudtrucks_load_id] = fl.details;
                    }
                });
            }
        }

        // Helper to normalize details with proper error handling
        const normalizeDetails = (rawDetails: unknown): Record<string, unknown> | { error: string } => {
            if (!rawDetails || typeof rawDetails !== 'object') {
                return { error: 'Invalid load details' };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = rawDetails as any; // Safe cast for normalization logic

            return {
                ...d,
                pickup_date: d.pickup_date || d.origin_pickup_date || d.date_start,
                rate: d.rate || d.trip_rate || d.estimated_rate,
                distance: d.distance || d.trip_distance_mi, // CRITICAL: UI reads 'distance'
                broker_name: d.broker_name || d.broker,
                origin_address: d.origin_address || d.location_address1,
                dest_address: d.dest_address || d.location_address2,
                is_estimated_rate: !d.rate && !d.trip_rate && !!d.estimated_rate
            };
        };

        // Enrich loads with error handling per item (single failure won't crash all)
        const enrichedLoads = (interestedLoads || []).map(intLoad => {
            try {
                // Get details from found_loads or fallback to stored details
                const rawDetails = foundLoadsMap[intLoad.cloudtrucks_load_id] || intLoad.details;
                const normalizedDetails = normalizeDetails(rawDetails);

                return {
                    ...intLoad,
                    details: normalizedDetails
                };
            } catch (enrichError: unknown) {
                const message = enrichError instanceof Error ? enrichError.message : String(enrichError);
                console.error(`[API] Error enriching load ${intLoad.cloudtrucks_load_id}:`, message);
                // Return load with original details as fallback
                return {
                    ...intLoad,
                    details: intLoad.details || { error: 'Failed to enrich load' }
                };
            }
        });

        return NextResponse.json({ loads: enrichedLoads });
    } catch (error: unknown) {
        console.error('[API] Interested loads GET error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

/**
 * POST /api/interested - Add a load to interested list
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const interestedTable = isGuest ? GUEST_INTERESTED_TABLE : USER_INTERESTED_TABLE;
        const ownerKey = isGuest ? 'guest_session' : 'user_id';
        const ownerValue = isGuest ? guestSession : userId;

        const body = await request.json();
        const { cloudtrucks_load_id, details } = body;

        if (!cloudtrucks_load_id || !details) {
            return NextResponse.json(
                { error: 'Missing cloudtrucks_load_id or details' },
                { status: 400 }
            );
        }

        // Upsert to handle duplicates gracefully
        const { data, error } = await db
            .from(interestedTable)
            .upsert({
                [ownerKey]: ownerValue,
                cloudtrucks_load_id,
                details,
                status: 'interested',
                created_at: new Date().toISOString(),
            }, {
                onConflict: isGuest ? 'guest_session,cloudtrucks_load_id' : 'user_id,cloudtrucks_load_id',
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error adding interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, load: data });
    } catch (error: unknown) {
        console.error('[API] Interested loads POST error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PATCH /api/interested - Update load status (e.g. move to trash)
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const interestedTable = isGuest ? GUEST_INTERESTED_TABLE : USER_INTERESTED_TABLE;
        const ownerKey = isGuest ? 'guest_session' : 'user_id';
        const ownerValue = isGuest ? guestSession : userId;

        const body = await request.json();
        const { ids, status } = body;

        if (!ids || !status || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const { error } = await db
            .from(interestedTable)
            .update({ status })
            .eq(ownerKey, ownerValue)
            .in('id', ids);

        if (error) {
            console.error('[API] Error updating interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

/**
 * DELETE /api/interested - Permanently remove a load
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const interestedTable = isGuest ? GUEST_INTERESTED_TABLE : USER_INTERESTED_TABLE;
        const ownerKey = isGuest ? 'guest_session' : 'user_id';
        const ownerValue = isGuest ? guestSession : userId;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const ids = searchParams.get('ids')?.split(',');
        const cloudtrucksLoadId = searchParams.get('cloudtrucks_load_id');

        if (!id && !ids && !cloudtrucksLoadId) {
            return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
        }

        let query = db.from(interestedTable).delete().eq(ownerKey, ownerValue);

        if (ids) {
            query = query.in('id', ids);
        } else if (id) {
            query = query.eq('id', id);
        } else if (cloudtrucksLoadId) {
            query = query.eq('cloudtrucks_load_id', cloudtrucksLoadId);
        }

        const { error } = await query;

        if (error) {
            console.error('[API] Error deleting interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[API] Interested loads DELETE error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
