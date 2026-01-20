import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

// Public read client (uses anon key; respects RLS and public policies)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicSupabase = createSupabaseClient(supabaseUrl, anonKey);

// Admin write client (service role; bypasses RLS)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = serviceKey ? createSupabaseClient(supabaseUrl, serviceKey) : null;

// Chain law level descriptions
const chainLevelDescriptions: Record<string, string> = {
    none: 'No chain requirements',
    r1: 'R1: Chains required on drive axles OR tire chains alternatives (AWD/4WD with snow tires)',
    r2: 'R2: Chains required on drive axles (no alternatives)',
    r3: 'R3: Chains required on ALL axles (commercial vehicles prohibited)',
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const route = searchParams.get('route');

    try {
        let query = publicSupabase
            .from('chain_laws')
            .select('*')
            .order('route_name');

        // Filter by state if provided
        if (state) {
            query = query.eq('state', state.toUpperCase());
        }

        // Filter by route if provided
        if (route) {
            query = query.ilike('route_name', `%${route}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Chain laws fetch error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch chain law data' },
                { status: 500 }
            );
        }

        // Enrich data with descriptions
        const enrichedData = data?.map(law => ({
            ...law,
            statusDescription: chainLevelDescriptions[law.status] || 'Unknown',
            isActive: law.status !== 'none',
        }));

        return NextResponse.json({
            chainLaws: enrichedData || [],
            lastUpdated: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Chain laws API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chain law data' },
            { status: 500 }
        );
    }
}

// POST endpoint to update chain law status (for admin use)
export async function POST(request: NextRequest) {
    try {
        // Admin guard (API-enforced)
        const serverSupabase = await createServerClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!adminSupabase) {
            return NextResponse.json({ error: 'Missing Supabase service role config' }, { status: 500 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: id, status' },
                { status: 400 }
            );
        }

        if (!['none', 'r1', 'r2', 'r3'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be one of: none, r1, r2, r3' },
                { status: 400 }
            );
        }

        const { data, error } = await adminSupabase
            .from('chain_laws')
            .update({ status, last_updated: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Chain law update error:', error);
            return NextResponse.json(
                { error: 'Failed to update chain law status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            chainLaw: data,
        });
    } catch (error) {
        console.error('Chain laws POST error:', error);
        return NextResponse.json(
            { error: 'Failed to update chain law data' },
            { status: 500 }
        );
    }
}
