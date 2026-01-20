import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRequestContext } from '@/lib/request-context';

const USER_LOADS_TABLE = 'found_loads';
const USER_CRITERIA_TABLE = 'search_criteria';
const GUEST_LOADS_TABLE = 'guest_found_loads';
const GUEST_CRITERIA_TABLE = 'guest_search_criteria';

/**
 * GET /api/loads - Get user's found loads
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        const db = isGuest ? createAdminClient() : supabase;

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const loadsTable = isGuest ? GUEST_LOADS_TABLE : USER_LOADS_TABLE;
        const criteriaJoin = isGuest ? GUEST_CRITERIA_TABLE : USER_CRITERIA_TABLE;

        // Fetch loads where the criteria belongs to the current user or guest session.
        // For guest mode, we store loads in guest_found_loads and join guest_search_criteria.
        const { data, error } = await db
            .from(loadsTable)
            .select(`
                *,
                ${criteriaJoin}!inner (
                    id,
                    origin_city,
                    origin_state,
                    dest_city,
                    destination_state,
                    equipment_type,
                    ${isGuest ? 'guest_session' : 'user_id'}
                )
            `)
            .eq(`${criteriaJoin}.${isGuest ? 'guest_session' : 'user_id'}`, isGuest ? guestSession : userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loads:', error);
            return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
