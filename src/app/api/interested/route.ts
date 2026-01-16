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

        const { data: loads, error } = await supabase
            .from('interested_loads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[API] Error fetching interested loads:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ loads });
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
 * DELETE /api/interested - Remove a load from interested list
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const loadId = searchParams.get('id');

        if (!loadId) {
            return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
        }

        const { error } = await supabase
            .from('interested_loads')
            .delete()
            .eq('user_id', user.id)
            .eq('id', loadId);

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
