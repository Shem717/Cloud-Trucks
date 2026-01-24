import { NextRequest, NextResponse } from 'next/server';
import { scanLoadsForAllUsers } from '@/workers/scanner';

function isAuthorized(request: NextRequest) {
    // Vercel sets this header for scheduled invocations.
    if (request.headers.get('x-vercel-cron') === '1') return true;

    const secret = process.env.CRON_SECRET;
    if (!secret) return true;

    const auth = request.headers.get('authorization');
    if (auth === `Bearer ${secret}`) return true;

    const headerSecret = request.headers.get('x-cron-secret');
    return headerSecret === secret;
}

/**
 * Add randomization to scan execution to avoid predictable patterns.
 * 30% chance to skip any given cron execution.
 * This creates further unpredictability in scan timing.
 */
function shouldSkipExecution(): boolean {
    // 30% chance to skip
    return Math.random() < 0.30;
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Randomization: skip some executions to add unpredictability
    // Only applies to scheduled crons, not manual triggers
    const isScheduledCron = request.headers.get('x-vercel-cron') === '1';
    if (isScheduledCron && shouldSkipExecution()) {
        console.log('[CRON] Skipping this scan execution (randomization)');
        return NextResponse.json({ 
            success: true, 
            skipped: true, 
            reason: 'Randomized skip for unpredictable scanning pattern' 
        });
    }

    try {
        console.log('[CRON] Executing scan for all users');
        const result = await scanLoadsForAllUsers();
        return NextResponse.json({ success: true, result });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
