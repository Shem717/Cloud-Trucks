import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchMarketInsights } from '@/workers/cloudtrucks-api-client';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's CloudTrucks credentials
        const { data: credentials } = await supabase
            .from('cloudtrucks_credentials')
            .select('session_cookie, csrf_token')
            .eq('user_id', user.id)
            .single();

        if (!credentials?.session_cookie || !credentials?.csrf_token) {
            return NextResponse.json({
                error: 'CloudTrucks credentials not configured',
                needsCredentials: true
            }, { status: 400 });
        }

        // Parse query params
        const url = new URL(request.url);
        const equipmentType = url.searchParams.get('equipment') || 'DRY_VAN';
        const distanceType = url.searchParams.get('distance') || 'Long';

        // Fetch market insights
        const insights = await fetchMarketInsights(
            credentials.session_cookie,
            credentials.csrf_token,
            equipmentType,
            distanceType,
            (msg) => console.log(msg)
        );

        if (!insights) {
            // Return a helpful message if the API endpoint wasn't found
            return NextResponse.json({
                error: 'Market insights API not available',
                message: 'The CloudTrucks market conditions API endpoint could not be found. This feature may require API documentation from CloudTrucks.',
                fallback: true
            }, { status: 404 });
        }

        return NextResponse.json(insights);
    } catch (error) {
        console.error('[Market Insights API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
