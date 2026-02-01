import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

/**
 * GET /api/cron/backhaul-cleanup
 *
 * Cleans up expired backhaul suggestions to prevent table bloat.
 * Runs daily via Vercel cron.
 *
 * Deletes:
 * - Suggestions with expires_at in the past
 * - Suggestions older than 7 days with status 'no_results' or 'error'
 * - Orphaned suggestions where the saved load no longer exists
 */
export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Missing Supabase admin config' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
        // 1. Delete expired suggestions (expires_at < now)
        const { count: expiredCount } = await supabase
            .from('suggested_backhauls')
            .select('id', { count: 'exact', head: true })
            .lt('expires_at', now);

        const expiredDelete = await supabase
            .from('suggested_backhauls')
            .delete()
            .lt('expires_at', now);

        if (expiredDelete.error) {
            console.error('[BACKHAUL-CLEANUP] Error deleting expired:', expiredDelete.error);
        }

        // 2. Delete old failed suggestions (no_results or error, older than 7 days)
        const { count: failedCount } = await supabase
            .from('suggested_backhauls')
            .select('id', { count: 'exact', head: true })
            .in('status', ['no_results', 'error', 'no_preferences'])
            .lt('created_at', sevenDaysAgo);

        const failedDelete = await supabase
            .from('suggested_backhauls')
            .delete()
            .in('status', ['no_results', 'error', 'no_preferences'])
            .lt('created_at', sevenDaysAgo);

        if (failedDelete.error) {
            console.error('[BACKHAUL-CLEANUP] Error deleting failed:', failedDelete.error);
        }

        // 3. Delete orphaned suggestions (saved load was deleted)
        // Get all saved_load_ids from suggestions
        const { data: suggestions } = await supabase
            .from('suggested_backhauls')
            .select('id, saved_load_id');

        let orphanedCount = 0;
        if (suggestions && suggestions.length > 0) {
            const savedLoadIds = Array.from(new Set(suggestions.map(s => s.saved_load_id)));

            // Check which saved loads still exist
            const { data: existingLoads } = await supabase
                .from('interested_loads')
                .select('id')
                .in('id', savedLoadIds);

            const existingIds = new Set(existingLoads?.map(l => l.id) || []);
            const orphanedSuggestionIds = suggestions
                .filter(s => !existingIds.has(s.saved_load_id))
                .map(s => s.id);

            if (orphanedSuggestionIds.length > 0) {
                orphanedCount = orphanedSuggestionIds.length;
                const orphanDelete = await supabase
                    .from('suggested_backhauls')
                    .delete()
                    .in('id', orphanedSuggestionIds);

                if (orphanDelete.error) {
                    console.error('[BACKHAUL-CLEANUP] Error deleting orphaned:', orphanDelete.error);
                }
            }
        }

        const totalDeleted = (expiredCount ?? 0) + (failedCount ?? 0) + orphanedCount;

        console.log(`[BACKHAUL-CLEANUP] Deleted ${totalDeleted} suggestions (expired: ${expiredCount ?? 0}, failed: ${failedCount ?? 0}, orphaned: ${orphanedCount})`);

        return NextResponse.json({
            success: true,
            timestamp: now,
            deleted: {
                expired: expiredCount ?? 0,
                failed: failedCount ?? 0,
                orphaned: orphanedCount,
                total: totalDeleted,
            },
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[BACKHAUL-CLEANUP] Fatal error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
