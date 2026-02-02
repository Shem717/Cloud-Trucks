/**
 * CloudTrucks API Client
 *
 * Uses the internal CloudTrucks API + Pusher WebSocket to fetch loads.
 * This replaces the Puppeteer-based scraper for better reliability on Vercel.
 */

import Pusher from 'pusher-js';
import { request, Agent } from 'undici';

// Create a custom agent that allows cookie headers
const httpAgent = new Agent({ allowH2: false });

const CLOUDTRUCKS_API_BASE = 'https://app.cloudtrucks.com';
const PUSHER_APP_KEY = 'de4428b1e46e9db8fda0';
const PUSHER_CLUSTER = 'us3';

const DEBUG = process.env.CLOUDTRUCKS_DEBUG === '1';

export interface SearchCriteria {
    origin_city: string;
    origin_state?: string;
    pickup_distance?: number; // origin_range_mi__max
    pickup_date?: string | null; // origin_pickup_date__min
    pickup_date_end?: string | null; // origin_pickup_date__max
    dest_city?: string;
    destination_state?: string;
    min_rate?: number;
    min_rpm?: number;
    max_weight?: number; // truck_weight_lb__max
    equipment_type?: string; // 'Dry Van' -> 'DRY_VAN'
    booking_type?: string; // 'ALL', 'INSTANT', 'STANDARD'
}

export interface CloudTrucksLoad {
    id: string;
    origin_city: string;
    origin_state: string;
    origin_address?: string;
    dest_city: string;
    dest_state: string;
    dest_address?: string;
    trip_rate: string;
    trip_distance_mi: number;
    equipment: string[];
    broker_name: string;
    origin_pickup_date: string;
    dest_delivery_date: string;
    instant_book: boolean;
    estimated_rate: number;
    estimated_rate_min: number;
    estimated_rate_max: number;
    truck_weight_lb: number;
    total_deadhead_mi: number;
    stops: CloudTrucksLoadStop[];
    // New fields from audit
    age_min?: number;
    is_team_load?: boolean;
    estimated_fuel_cost?: number;
    estimated_toll_cost?: number;
    estimated_revenue_per_hour?: number;
    broker_mc_number?: string;
    contact_phone?: string;
    contact_email?: string;
    truck_length_ft?: number;
    booking_instructions?: string;
    has_auto_bid?: boolean;
    origin_deadhead_mi?: number;
    dest_deadhead_mi?: number;
    trailer_drop_warnings?: string[];
    // Raw data for storage
    raw: unknown;
}

export interface CloudTrucksLoadStop {
    type: string;
    city: string;
    state: string;
    date_start?: string;
    date_end?: string;
    [key: string]: unknown;
}

/**
 * Normalize booking_type to API-expected uppercase values
 */
function normalizeBookingType(bookingType: string | undefined | null): string {
    if (!bookingType || bookingType.toLowerCase() === 'any' || bookingType.toLowerCase() === 'all') {
        return 'ALL';
    }
    const upper = bookingType.toUpperCase();
    if (upper === 'INSTANT') return 'INSTANT';
    if (upper === 'STANDARD') return 'STANDARD';
    return 'ALL'; // Default fallback
}

/**
 * Convert our SearchCriteria to CloudTrucks API format
 */
function buildApiPayload(criteria: SearchCriteria): object {
    const equipmentMap: Record<string, string> = {
        'Dry Van': 'DRY_VAN',
        'DRY_VAN': 'DRY_VAN',
        'Power Only': 'POWER_ONLY',
        'POWER_ONLY': 'POWER_ONLY',
    };

    const origin = criteria.origin_city + (criteria.origin_state ? `, ${criteria.origin_state}` : '');
    const dest = criteria.dest_city
        ? criteria.dest_city + (criteria.destination_state ? `, ${criteria.destination_state}` : '')
        : '';

    // For Instant Book loads, try requesting unmasked data to get addresses
    const isInstantOnly = normalizeBookingType(criteria.booking_type) === 'INSTANT';

    // Construct base payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
        origin_location: origin,
        origin_range_mi__max: criteria.pickup_distance || 50,
        origin_pickup_date__min: criteria.pickup_date || new Date().toISOString(),
        dest_location: dest,
        equipment: criteria.equipment_type
            ? [equipmentMap[criteria.equipment_type] || 'DRY_VAN']
            : ['DRY_VAN'],
        sort_type: 'BEST_PRICE',
        booking_type: normalizeBookingType(criteria.booking_type),
        trip_distances: ['Local', 'Short', 'Long'],
        // Try unmasked data for instant book loads, masked for others
        masked_data: !isInstantOnly,
        age_min__min: 30,
        truck_weight_lb__max: criteria.max_weight || 45000,
        requested_states: criteria.destination_state ? [criteria.destination_state] : [],
        is_offline_book_compatible: true,
    };

    if (criteria.pickup_date_end) {
        payload.origin_pickup_date__max = criteria.pickup_date_end;
    }

    return payload;
}


/**
 * Helper to clean cookie values (remove name= prefix if user pasted it)
 */
function cleanCookieValue(value: string, name: string): string {
    if (!value) return '';
    if (value.startsWith(`${name}=`)) {
        return value.substring(name.length + 1);
    }
    return value.trim();
}

/**
 * Fetch loads from CloudTrucks using API + Pusher
 */
export async function fetchLoadsViaApi(
    sessionCookie: string,
    csrfToken: string,
    criteria: SearchCriteria,
    timeoutMs: number = 30000,
    onLog?: (message: string) => void
): Promise<CloudTrucksLoad[]> {
    const log = (msg: string) => {
        if (DEBUG) console.log(msg);
        if (onLog) onLog(msg);
    };

    log('[CT API] Starting API-based load fetch...');

    const cleanSession = cleanCookieValue(sessionCookie, '__Secure-sessionid-v2');
    const cleanCsrf = cleanCookieValue(csrfToken, '__Secure-csrftoken-v2');

    // Never log tokens/cookies in production logs.

    // Step 1: Trigger async search
    const payload = buildApiPayload(criteria);
    if (DEBUG) log(`[CT API] Search payload: ${JSON.stringify(payload)}`);

    // Use undici with custom agent to ensure Cookie header is sent properly
    const { statusCode, body } = await request(`${CLOUDTRUCKS_API_BASE}/api/v2/query_loads_async`, {
        method: 'POST',
        dispatcher: httpAgent,
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'cookie': `__Secure-csrftoken-v2=${cleanCsrf}; __Secure-sessionid-v2=${cleanSession}`,
            'origin': 'https://app.cloudtrucks.com',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'x-csrftoken': cleanCsrf,
        },
        body: JSON.stringify(payload),
    });

    const responseText = await body.text();

    if (statusCode !== 200) {
        const errorMsg = `HTTP Error ${statusCode}: ${responseText}`;
        console.error(`[CT API] ${errorMsg}`);
        log(errorMsg);
        throw new Error(`CloudTrucks API error ${statusCode}: ${responseText}`);
    }

    const { channel_name } = JSON.parse(responseText);
    log(`[CT API] Got channel: ${channel_name}`);

    if (!channel_name) {
        throw new Error('No channel name returned from CloudTrucks API');
    }

    // Step 2: Subscribe to Pusher channel and collect loads
    const loads = await collectLoadsFromPusher(channel_name, timeoutMs, log);
    log(`[CT API] Collected ${loads.length} loads from Pusher`);

    return loads;
}

/**
 * Subscribe to Pusher channel and collect all pushing_loads events
 */
function collectLoadsFromPusher(channelName: string, timeoutMs: number, log: (msg: string) => void): Promise<CloudTrucksLoad[]> {
    return new Promise((resolve, reject) => {
        const loads: CloudTrucksLoad[] = [];
        let resolved = false;

        log('[CT API] Connecting to Pusher...');

        const pusher = new Pusher(PUSHER_APP_KEY, {
            cluster: PUSHER_CLUSTER,
        });

        const channel = pusher.subscribe(channelName);

        // Debug: Log all events
        if (DEBUG) {
            channel.bind_global((eventName: string, data: unknown) => {
                log(`[CT API DEBUG] Received event '${eventName}' on channel '${channelName}'`);
                if (eventName !== 'pushing_loads') {
                    try {
                        log(`Event Data: ${JSON.stringify(data)}`);
                    } catch {
                        log('Event Data: [Circular/Unserializable]');
                    }
                }
            });
        }

        // Set timeout to stop collecting
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                log('[CT API] Timeout reached, closing Pusher connection');
                pusher.disconnect();
                resolve(loads);
            }
        }, timeoutMs);

        // Handle subscription success
        channel.bind('pusher:subscription_succeeded', () => {
            log(`[CT API] Subscribed to channel: ${channelName}`);
        });

        // Handle subscription error
        channel.bind('pusher:subscription_error', (error: unknown) => {
            log(`[CT API] Subscription error: ${JSON.stringify(error)}`);
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                pusher.disconnect();
                reject(new Error(`Pusher subscription failed: ${JSON.stringify(error)}`));
            }
        });

        // Handle incoming loads
        channel.bind('pushing_loads', (data: unknown) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loadData = typeof data === 'string' ? JSON.parse(data) : data as Record<string, any>; // Temporary cast to access properties

                const load: CloudTrucksLoad = {
                    id: loadData.id,
                    origin_city: loadData.origin_city,
                    origin_state: loadData.origin_state,
                    origin_address: loadData.origin_address,
                    dest_city: loadData.dest_city,
                    dest_state: loadData.dest_state,
                    dest_address: loadData.dest_address,
                    trip_rate: loadData.trip_rate,
                    trip_distance_mi: loadData.trip_distance_mi,
                    equipment: loadData.equipment,
                    broker_name: loadData.broker_name,
                    origin_pickup_date: loadData.origin_pickup_date,
                    dest_delivery_date: loadData.dest_delivery_date,
                    instant_book: loadData.instant_book,
                    estimated_rate: loadData.estimated_rate,
                    estimated_rate_min: loadData.estimated_rate_min,
                    estimated_rate_max: loadData.estimated_rate_max,
                    truck_weight_lb: loadData.truck_weight_lb,
                    total_deadhead_mi: loadData.total_deadhead_mi,
                    stops: loadData.stops,
                    // Map new fields
                    age_min: loadData.age_min,
                    is_team_load: loadData.is_team_load,
                    estimated_fuel_cost: loadData.estimated_fuel_cost,
                    estimated_toll_cost: loadData.estimated_toll_cost,
                    estimated_revenue_per_hour: loadData.estimated_revenue_per_hour,
                    broker_mc_number: loadData.broker_mc_number,
                    contact_phone: loadData.contact_phone,
                    contact_email: loadData.contact_email,
                    truck_length_ft: loadData.truck_length_ft,
                    booking_instructions: loadData.booking_instructions,
                    has_auto_bid: loadData.has_auto_bid,
                    origin_deadhead_mi: loadData.origin_deadhead_mi,
                    dest_deadhead_mi: loadData.dest_deadhead_mi,
                    trailer_drop_warnings: loadData.trailer_drop_warnings,
                    raw: loadData,
                };

                loads.push(load);

                // Always log address info for debugging (even without DEBUG flag)
                const hasAddressData = loadData.origin_address || loadData.dest_address;
                if (hasAddressData) {
                    console.log(`[CT API] ADDRESS FOUND for load ${load.id}:`, {
                        instant_book: loadData.instant_book,
                        origin_address: loadData.origin_address,
                        dest_address: loadData.dest_address,
                    });
                }

                // Check stops for address data
                if (loadData.stops && Array.isArray(loadData.stops)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    loadData.stops.forEach((stop: any, idx: number) => {
                        if (stop.address || stop.street || stop.full_address) {
                            console.log(`[CT API] STOP ADDRESS FOUND for load ${load.id}, stop ${idx}:`, {
                                type: stop.type,
                                address: stop.address,
                                street: stop.street,
                                full_address: stop.full_address,
                                zip: stop.zip || stop.postal_code,
                            });
                        }
                    });
                }

                if (DEBUG) {
                    console.log(`[CT API] Received load: ${load.origin_city}, ${load.origin_state} -> ${load.dest_city}, ${load.dest_state} | $${load.trip_rate} | instant=${load.instant_book}`);
                    // DEBUG: Log all available fields to identify unused data
                    console.log('[CT API DEBUG] Full loadData keys:', Object.keys(loadData));
                    // Log any fields we're not currently capturing
                    const capturedFields = new Set(['id', 'origin_city', 'origin_state', 'origin_address', 'dest_city', 'dest_state', 'dest_address', 'trip_rate', 'trip_distance_mi', 'equipment', 'broker_name', 'origin_pickup_date', 'dest_delivery_date', 'instant_book', 'estimated_rate', 'estimated_rate_min', 'estimated_rate_max', 'truck_weight_lb', 'total_deadhead_mi', 'stops']);
                    const allFields = Object.keys(loadData);
                    const uncaptured = allFields.filter(k => !capturedFields.has(k));
                    if (uncaptured.length > 0) {
                        console.log('[CT API DEBUG] Uncaptured fields:', uncaptured);
                    }

                    // Log stop structure for analysis
                    if (loadData.stops && loadData.stops.length > 0) {
                        console.log('[CT API DEBUG] Stop keys:', Object.keys(loadData.stops[0]));
                    }
                }
            } catch (e) {
                if (DEBUG) console.error('[CT API] Error parsing load:', e);
            }
        });

        // Handle channel completion signal (if any)
        channel.bind('query_complete', () => {
            if (DEBUG) console.log('[CT API] Query complete signal received');
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                pusher.disconnect();
                resolve(loads);
            }
        });

        // Also listen for any end signal variations
        channel.bind('pushing_loads_complete', () => {
            if (DEBUG) console.log('[CT API] Pushing loads complete signal received');
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                pusher.disconnect();
                resolve(loads);
            }
        });
    });
}

/**
 * Test the API connection
 */
export async function testApiConnection(
    sessionCookie: string,
    csrfToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const testResponse = await fetch(`${CLOUDTRUCKS_API_BASE}/api/v1/saved-searches/`, {
            headers: {
                'accept': 'application/json',
                'cookie': `__Secure-sessionid-v2=${sessionCookie}; __Secure-csrftoken-v2=${csrfToken}`,
                'x-csrftoken': csrfToken,
            },
        });

        if (testResponse.ok) {
            return { success: true };
        } else {
            return { success: false, error: `Status ${testResponse.status}` };
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}

/**
 * Market Insights Types
 */
export interface MarketRegion {
    region_id: string;
    region_name: string;
    state?: string;
    load_count: number;
    avg_rate_per_mile: number;
    avg_rate: number;
    demand_level: 'low' | 'medium' | 'high' | 'very_high';
    trend: 'up' | 'down' | 'stable';
    trend_percent: number;
}

export interface MarketInsightsData {
    equipment_type: string;
    distance_type: string;
    last_updated: string;
    regions: MarketRegion[];
    national_avg_rpm: number;
    total_loads: number;
}

/**
 * Fetch market insights/conditions from CloudTrucks
 * This data powers the heat map at https://app.cloudtrucks.com/market-conditions/
 */
export async function fetchMarketInsights(
    sessionCookie: string,
    csrfToken: string,
    equipmentType: string = 'DRY_VAN',
    distanceType: string = 'Long',
    onLog?: (message: string) => void
): Promise<MarketInsightsData | null> {
    const log = (msg: string) => {
        if (DEBUG) console.log(msg);
        if (onLog) onLog(msg);
    };

    log('[CT API] Fetching market insights...');

    const cleanSession = cleanCookieValue(sessionCookie, '__Secure-sessionid-v2');
    const cleanCsrf = cleanCookieValue(csrfToken, '__Secure-csrftoken-v2');

    // Try multiple possible API endpoints for market conditions
    const possibleEndpoints = [
        '/api/v1/market-conditions/',
        '/api/v2/market-conditions/',
        '/api/v1/market-insights/',
        '/api/v2/market-insights/',
        '/api/v1/heat-map/',
        '/api/v1/market/',
    ];

    for (const endpoint of possibleEndpoints) {
        try {
            const url = new URL(endpoint, CLOUDTRUCKS_API_BASE);
            url.searchParams.set('equipment', equipmentType);
            url.searchParams.set('distance_type', distanceType);

            log(`[CT API] Trying endpoint: ${url.toString()}`);

            const { statusCode, body } = await request(url.toString(), {
                method: 'GET',
                dispatcher: httpAgent,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'cookie': `__Secure-csrftoken-v2=${cleanCsrf}; __Secure-sessionid-v2=${cleanSession}`,
                    'origin': 'https://app.cloudtrucks.com',
                    'referer': 'https://app.cloudtrucks.com/market-conditions/',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
                    'x-csrftoken': cleanCsrf,
                },
            });

            const responseText = await body.text();

            if (statusCode === 200) {
                log(`[CT API] Market insights found at ${endpoint}`);
                try {
                    const data = JSON.parse(responseText);
                    // Try to normalize the response to our expected format
                    return normalizeMarketInsightsResponse(data, equipmentType, distanceType);
                } catch (parseError) {
                    log(`[CT API] Failed to parse response from ${endpoint}`);
                }
            } else {
                log(`[CT API] Endpoint ${endpoint} returned ${statusCode}`);
            }
        } catch (error) {
            log(`[CT API] Error fetching from ${endpoint}: ${error}`);
        }
    }

    log('[CT API] Could not find market insights endpoint');
    return null;
}

/**
 * Normalize market insights response to our expected format
 */
function normalizeMarketInsightsResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    equipmentType: string,
    distanceType: string
): MarketInsightsData {
    // Handle various possible response formats
    const regions: MarketRegion[] = [];

    // If data has a regions/markets/areas array
    const rawRegions = data.regions || data.markets || data.areas || data.data || [];

    if (Array.isArray(rawRegions)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawRegions.forEach((r: any, index: number) => {
            regions.push({
                region_id: r.id || r.region_id || r.code || `region-${index}`,
                region_name: r.name || r.region_name || r.market || r.area || 'Unknown',
                state: r.state || r.state_code,
                load_count: r.load_count || r.loads || r.count || 0,
                avg_rate_per_mile: r.avg_rate_per_mile || r.rpm || r.rate_per_mile || 0,
                avg_rate: r.avg_rate || r.rate || r.average_rate || 0,
                demand_level: normalizeDemandLevel(r.demand || r.demand_level || r.load_count),
                trend: normalizeTrend(r.trend || r.direction),
                trend_percent: r.trend_percent || r.change_percent || 0,
            });
        });
    }

    return {
        equipment_type: equipmentType,
        distance_type: distanceType,
        last_updated: data.last_updated || data.updated_at || new Date().toISOString(),
        regions,
        national_avg_rpm: data.national_avg_rpm || data.avg_rpm || calculateAvgRpm(regions),
        total_loads: data.total_loads || regions.reduce((sum, r) => sum + r.load_count, 0),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDemandLevel(value: any): 'low' | 'medium' | 'high' | 'very_high' {
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower.includes('very') || lower.includes('hot')) return 'very_high';
        if (lower.includes('high')) return 'high';
        if (lower.includes('low')) return 'low';
        return 'medium';
    }
    if (typeof value === 'number') {
        if (value > 100) return 'very_high';
        if (value > 50) return 'high';
        if (value > 20) return 'medium';
        return 'low';
    }
    return 'medium';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTrend(value: any): 'up' | 'down' | 'stable' {
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower.includes('up') || lower.includes('increas')) return 'up';
        if (lower.includes('down') || lower.includes('decreas')) return 'down';
    }
    if (typeof value === 'number') {
        if (value > 0) return 'up';
        if (value < 0) return 'down';
    }
    return 'stable';
}

function calculateAvgRpm(regions: MarketRegion[]): number {
    if (regions.length === 0) return 0;
    const total = regions.reduce((sum, r) => sum + r.avg_rate_per_mile, 0);
    return total / regions.length;
}
