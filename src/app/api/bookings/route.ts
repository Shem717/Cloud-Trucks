import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { bookingCreateSchema } from '@/lib/validators/api-validators';
import { validateAndSanitize } from '@/lib/validators/common';
import { requireCSRFToken } from '@/lib/csrf';
import { logAudit, getRequestMetadata } from '@/lib/audit-logger';

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
    // Validate CSRF token for state-changing operations (production only)
    const csrfValid = await requireCSRFToken(request);
    if (!csrfValid && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = validateAndSanitize(bookingCreateSchema, body);
    if (!validation.success) {
        return NextResponse.json(
            { error: validation.error },
            { status: 400 }
        );
    }

    const validatedData = validation.data;

    // CRITICAL SECURITY FIX: Verify user owns the load they're booking
    // Step 1: Check if load exists in user's found_loads
    const { data: loadCheck, error: loadCheckError } = await supabase
        .from('found_loads')
        .select('id, criteria_id')
        .eq('cloudtrucks_load_id', validatedData.load_id)
        .maybeSingle();

    if (loadCheckError || !loadCheck) {
        return NextResponse.json(
            { error: 'Load not found or access denied' },
            { status: 403 }
        );
    }

    // Step 2: Verify criteria belongs to authenticated user
    const { data: criteriaCheck, error: criteriaError } = await supabase
        .from('search_criteria')
        .select('user_id')
        .eq('id', loadCheck.criteria_id)
        .single();

    if (criteriaError || criteriaCheck.user_id !== user.id) {
        return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
        );
    }

    // Step 3: Now safe to create booking - user owns this load
    const { data, error } = await supabase
        .from('booked_loads')
        .insert({
            user_id: user.id,
            cloudtrucks_load_id: validatedData.load_id,
            origin: validatedData.origin,
            destination: validatedData.destination,
            pickup_date: validatedData.pickup_date,
            rate: validatedData.rate,
            equipment: validatedData.equipment,
            broker: validatedData.broker,
            status: 'booked',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log booking creation
    await logAudit({
        userId: user.id,
        action: 'booking.created',
        resourceType: 'booked_load',
        resourceId: data.id.toString(),
        details: {
            load_id: data.cloudtrucks_load_id,
            rate: data.rate,
            origin: data.origin,
            destination: data.destination,
        },
        ...getRequestMetadata(request),
    });

    return NextResponse.json({ data });
}
