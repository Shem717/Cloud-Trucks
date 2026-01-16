import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scanLoadsForUser } from '@/workers/scanner';

/**
 * POST /api/scan - Manually trigger a scan for the current user's active criteria
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[API] Manual scan triggered for user ${user.id}`);

        // Run the scan
        const result = await scanLoadsForUser(user.id, supabase);

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

    } catch (error: any) {
        console.error('[API] Manual scan error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Server error'
        }, { status: 500 });
    }
}
