import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/loads - Get user's found loads
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch loads where the criteria belongs to the user
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
            .eq('search_criteria.user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);

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
