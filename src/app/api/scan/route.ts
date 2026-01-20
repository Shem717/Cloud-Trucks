import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scanLoadsForGuestSession, scanLoadsForUser } from '@/workers/scanner';
import { getRequestContext } from '@/lib/request-context';

/**
 * POST /api/scan - Manually trigger a scan for the current user's active criteria
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { userId, guestSession, isGuest } = await getRequestContext(request, supabase);

        if (!userId && !guestSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Run the scan
        const result = isGuest
            ? await scanLoadsForGuestSession(guestSession as string)
            : await scanLoadsForUser(userId as string, supabase);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Scan complete. Found ${result.loadsFound} new loads.`,
                loadsFound: result.loadsFound
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Scan failed'
            }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('[API] Manual scan error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            success: false,
            error: message || 'Server error'
        }, { status: 500 });
    }
}
