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

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await scanLoadsForAllUsers();
        return NextResponse.json({ success: true, result });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
