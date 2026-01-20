import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/loads - Get user's found loads
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const guestSession = request.cookies.get('guest_session')?.value;

        if (!user && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user?.id || guestSession;

        // Fetch loads where the criteria belongs to the user (or guest)
        const { data, error } = await supabase
            .from('found_loads')
            .select(`
                *,
                search_criteria!inner (
                    id,
                    origin_city,
                    origin_state,
                    dest_city,
                    destination_state,
                    equipment_type,
                    user_id
                )
            `)
            .eq('search_criteria.user_id', userId)
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
