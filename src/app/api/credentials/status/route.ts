import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

type CredentialsRow = {
    is_valid?: boolean | null;
};

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;
    return createAdminClient(supabaseUrl, serviceKey);
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const guestSession = request.cookies.get('guest_session')?.value;

        // This endpoint is used to power UI warnings. Prefer returning 200 with flags.
        if (!user && !guestSession) {
            return NextResponse.json({ hasCredentials: false, isValid: false });
        }

        const admin = getAdminClient();
        if (!admin) {
            return NextResponse.json({ hasCredentials: false, isValid: false });
        }

        let row: CredentialsRow | null = null;

        if (user) {
            const { data } = await admin
                .from('cloudtrucks_credentials')
                .select('is_valid')
                .eq('user_id', user.id)
                .single();
            row = (data ?? null) as CredentialsRow | null;
        } else {
            const { data } = await admin
                .from('cloudtrucks_credentials')
                .select('is_valid')
                .eq('is_valid', true)
                .order('last_validated_at', { ascending: false })
                .limit(1)
                .single();
            row = (data ?? null) as CredentialsRow | null;
        }

        return NextResponse.json({
            hasCredentials: !!row,
            isValid: !!row?.is_valid,
        });
    } catch {
        return NextResponse.json({ hasCredentials: false, isValid: false });
    }
}
