import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isAuthorized(request: NextRequest) {
    // Vercel sets this header for scheduled invocations.
    if (request.headers.get('x-vercel-cron') === '1') return true;

    const secret = process.env.CRON_SECRET;
    if (!secret) return true;

    const auth = request.headers.get('authorization');
    if (auth === `Bearer ${secret}`) return true;

    const headerSecret = request.headers.get('x-cron-secret');
    return headerSecret === secret;
}

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Missing Supabase admin config' }, { status: 500 });
    }

    const cutoff = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

    try {
        // Delete old guest criteria (cascades guest_found_loads).
        const { count: criteriaCount } = await supabase
            .from('guest_search_criteria')
            .select('id', { count: 'exact', head: true })
            .lt('created_at', cutoff);

        const criteriaDelete = await supabase
            .from('guest_search_criteria')
            .delete()
            .lt('created_at', cutoff);

        if (criteriaDelete.error) {
            return NextResponse.json({ error: criteriaDelete.error.message }, { status: 500 });
        }

        // Delete old guest interested loads.
        const { count: interestedCount } = await supabase
            .from('guest_interested_loads')
            .select('id', { count: 'exact', head: true })
            .lt('created_at', cutoff);

        const interestedDelete = await supabase
            .from('guest_interested_loads')
            .delete()
            .lt('created_at', cutoff);

        if (interestedDelete.error) {
            return NextResponse.json({ error: interestedDelete.error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            cutoff,
            deleted: {
                guest_search_criteria: criteriaCount ?? 0,
                guest_interested_loads: interestedCount ?? 0,
            },
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
