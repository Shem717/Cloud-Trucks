import { NextRequest, NextResponse } from 'next/server';
import { scanLoadsForAllUsers } from '@/workers/scanner';

/**
 * API Route: /api/cron/scan
 * 
 * Triggered by Vercel Cron or external scheduler to scan loads for all users
 * 
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('CRON_SECRET not configured');
        return NextResponse.json(
            { error: 'Server misconfigured' },
            { status: 500 }
        );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron access attempt');
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    console.log('[CRON] Starting load scan...');

    try {
        const startTime = Date.now();
        const results = await scanLoadsForAllUsers();
        const duration = Date.now() - startTime;

        console.log('[CRON] Scan completed:', results);

        return NextResponse.json({
            success: true,
            results: {
                totalScanned: results.totalScanned,
                totalLoadsFound: results.totalLoadsFound,
                errors: results.errors,
                durationMs: duration,
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('[CRON] Scan failed:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        }, {
            status: 500
        });
    }
}

// For manual testing
export async function POST(request: NextRequest) {
    // Allow POST for manual triggers (with same auth)
    return GET(request);
}
