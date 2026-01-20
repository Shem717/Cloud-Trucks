import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/interested - Fetch user's interested loads
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch interested loads
        const { data: interestedLoads, error: interestedError } = await supabase
            .from('interested_loads')
            .select('id, cloudtrucks_load_id, details, status, created_at')
            .eq('user_id', user.id)
            .eq('status', 'interested') // Only fetch active interested loads
            .order('created_at', { ascending: false });

        if (interestedError) {
            console.error('[API] Error fetching interested loads:', interestedError);
            return NextResponse.json({ error: interestedError.message }, { status: 500 });
        }

        // FIX: Batch fetch all found_loads in a single query instead of N+1 queries
        const loadIds = (interestedLoads || []).map(l => l.cloudtrucks_load_id);

        // Fetch all matching found_loads in one query
        let foundLoadsMap: Record<string, any> = {};
        if (loadIds.length > 0) {
            const { data: foundLoads, error: foundError } = await supabase
                .from('found_loads')
                .select('cloudtrucks_load_id, details, created_at')
                .in('cloudtrucks_load_id', loadIds)
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
        const normalizeDetails = (rawDetails: any) => {
            if (!rawDetails || typeof rawDetails !== 'object') {
                return { error: 'Invalid load details' };
            }
            return {
                ...rawDetails,
                pickup_date: rawDetails.pickup_date || rawDetails.origin_pickup_date || rawDetails.date_start,
                rate: rawDetails.rate || rawDetails.trip_rate || rawDetails.estimated_rate,
                distance: rawDetails.distance || rawDetails.trip_distance_mi, // CRITICAL: UI reads 'distance'
                broker_name: rawDetails.broker_name || rawDetails.broker,
                origin_address: rawDetails.origin_address || rawDetails.location_address1,
                dest_address: rawDetails.dest_address || rawDetails.location_address2,
                is_estimated_rate: !rawDetails.rate && !rawDetails.trip_rate && !!rawDetails.estimated_rate
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
            } catch (enrichError: any) {
                console.error(`[API] Error enriching load ${intLoad.cloudtrucks_load_id}:`, enrichError.message);
                // Return load with original details as fallback
                return {
                    ...intLoad,
                    details: intLoad.details || { error: 'Failed to enrich load' }
                };
            }
        });

        return NextResponse.json({ loads: enrichedLoads });
    } catch (error: any) {
        console.error('[API] Interested loads GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/interested - Add a load to interested list
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { cloudtrucks_load_id, details } = body;

        if (!cloudtrucks_load_id || !details) {
            return NextResponse.json(
                { error: 'Missing cloudtrucks_load_id or details' },
                { status: 400 }
            );
        }

        // Upsert to handle duplicates gracefully
        const { data, error } = await supabase
            .from('interested_loads')
            .upsert({
                user_id: user.id,
                cloudtrucks_load_id,
                details,
                status: 'interested',
                created_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,cloudtrucks_load_id',
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error adding interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, load: data });
    } catch (error: any) {
        console.error('[API] Interested loads POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/interested - Update load status (e.g. move to trash)
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { ids, status } = body;

        if (!ids || !status || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const { error } = await supabase
            .from('interested_loads')
            .update({ status })
            .eq('user_id', user.id)
            .in('id', ids);

        if (error) {
            console.error('[API] Error updating interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/interested - Permanently remove a load
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
        const ids = searchParams.get('ids')?.split(',');

        if (!id && !ids) {
            return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
        }

        let query = supabase.from('interested_loads').delete().eq('user_id', user.id);

        if (ids) {
            query = query.in('id', ids);
        } else if (id) {
            query = query.eq('id', id);
        }

        const { error } = await query;

        if (error) {
            console.error('[API] Error deleting interested load:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Interested loads DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
