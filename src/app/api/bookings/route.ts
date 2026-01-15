import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch booked loads for this user
    const { data, error } = await supabase
        .from('booked_loads')
        .select('*')
        .eq('user_id', user.id)
        .order('pickup_date', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
        .from('booked_loads')
        .insert({
            user_id: user.id,
            cloudtrucks_load_id: body.load_id,
            origin: body.origin,
            destination: body.destination,
            pickup_date: body.pickup_date,
            rate: body.rate,
            equipment: body.equipment,
            broker: body.broker,
            status: 'booked',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}
