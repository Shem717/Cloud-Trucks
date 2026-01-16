
import { NextRequest, NextResponse } from 'next/server';
import { scanLoadsForAllUsers } from '@/workers/scanner';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        console.log('[DEBUG] Manually triggering scan loads...');
        const startTime = Date.now();
        const results = await scanLoadsForAllUsers();
        const duration = Date.now() - startTime;

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
        console.error('[DEBUG] Scan failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
