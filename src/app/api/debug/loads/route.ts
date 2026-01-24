import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getRequestContext } from '@/lib/request-context';

/**
 * GET /api/debug/loads - Debug endpoint to inspect raw load data
 * Returns sample loads with all available fields for inspection
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { userId } = await getRequestContext(request, supabase);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get a few sample loads with full details
        const { data: loads, error } = await supabase
            .from('found_loads')
            .select(`
                id,
                cloudtrucks_load_id,
                details,
                created_at,
                search_criteria!inner (
                    id,
                    user_id
                )
            `)
            .eq('search_criteria.user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching loads:', error);
            return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
        }

        if (!loads || loads.length === 0) {
            return NextResponse.json({ message: 'No loads found', data: [] });
        }

        // Analyze the data structure
        const analysis = loads.map((load: any) => {
            const details = load.details || {};
            
            // Check for address-related fields
            const addressFields = {
                origin_address: details.origin_address,
                dest_address: details.dest_address,
                origin_street: details.origin_street,
                dest_street: details.dest_street,
                origin_zip: details.origin_zip,
                dest_zip: details.dest_zip,
                pickup_address: details.pickup_address,
                delivery_address: details.delivery_address,
            };

            // Check stops for address info
            const stopsWithAddresses = (details.stops || []).map((stop: any) => ({
                type: stop.type,
                city: stop.city,
                state: stop.state,
                address: stop.address,
                street: stop.street,
                zip: stop.zip,
                postal_code: stop.postal_code,
                // Include all keys to see what's available
                allKeys: Object.keys(stop),
            }));

            // Get all top-level keys for analysis
            const allTopLevelKeys = Object.keys(details);

            return {
                load_id: load.cloudtrucks_load_id,
                instant_book: details.instant_book,
                broker_name: details.broker_name,
                origin: `${details.origin_city}, ${details.origin_state}`,
                dest: `${details.dest_city}, ${details.dest_state}`,
                addressFields,
                stopsWithAddresses,
                allTopLevelKeys,
                // Include full details for deep inspection
                fullDetails: details,
            };
        });

        // Summary of fields found across all loads
        const allFieldsFound = new Set<string>();
        const addressFieldsFound: Record<string, number> = {};
        
        analysis.forEach((a: any) => {
            a.allTopLevelKeys.forEach((key: string) => allFieldsFound.add(key));
            
            Object.entries(a.addressFields).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    addressFieldsFound[key] = (addressFieldsFound[key] || 0) + 1;
                }
            });
        });

        return NextResponse.json({
            summary: {
                loadsAnalyzed: loads.length,
                allFieldsFound: Array.from(allFieldsFound).sort(),
                addressFieldsFound,
                instantBookCount: analysis.filter((a: any) => a.instant_book).length,
                standardBookCount: analysis.filter((a: any) => !a.instant_book).length,
            },
            loads: analysis,
        });

    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
