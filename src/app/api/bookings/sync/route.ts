import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/bookings/sync - Sync booked loads from CloudTrucks
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get user's CloudTrucks credentials
        const { data: credentials, error: credError } = await supabase
            .from('cloudtrucks_credentials')
            .select('encrypted_session_cookie')
            .eq('user_id', user.id)
            .single();

        if (credError || !credentials) {
            return NextResponse.json({ error: 'No CloudTrucks credentials found' }, { status: 400 });
        }

        // Decrypt the cookie
        const { decryptCredentials } = await import('@/lib/crypto');
        const { password: cookie } = await decryptCredentials(
            '', // email not needed for decryption
            credentials.encrypted_session_cookie
        );

        // Scrape booked loads
        const { scrapeBookedLoads } = await import('@/workers/cloudtrucks-scraper');
        const loads = await scrapeBookedLoads(cookie);

        // Upsert booked loads (update existing, insert new)
        for (const load of loads) {
            await supabase
                .from('booked_loads')
                .upsert({
                    user_id: user.id,
                    cloudtrucks_load_id: load.id,
                    origin: load.origin,
                    destination: load.destination,
                    pickup_date: load.pickup_date || null,
                    rate: load.rate,
                    equipment: load.equipment,
                    broker: load.broker,
                    status: (load as any).status || 'booked',
                }, {
                    onConflict: 'cloudtrucks_load_id',
                });
        }

        return NextResponse.json({
            success: true,
            synced: loads.length,
            loads
        });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync booked loads'
        }, { status: 500 });
    }
}
