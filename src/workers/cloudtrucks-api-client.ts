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
    pickup_date?: string; // origin_pickup_date__min
    dest_city?: string;
    destination_state?: string;
    min_rate?: number;
    max_weight?: number; // truck_weight_lb__max
    equipment_type?: string; // 'Dry Van' -> 'DRY_VAN'
    booking_type?: string; // 'ALL', 'INSTANT', 'STANDARD'
}

export interface CloudTrucksLoad {
    id: string;
    origin_city: string;
    origin_state: string;
    dest_city: string;
    dest_state: string;
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

    return {
        origin_location: origin,
        origin_range_mi__max: criteria.pickup_distance || 50,
        origin_pickup_date__min: criteria.pickup_date || new Date().toISOString(),
        dest_location: dest,
        equipment: criteria.equipment_type
            ? [equipmentMap[criteria.equipment_type] || 'DRY_VAN']
            : ['DRY_VAN'],
        sort_type: 'BEST_PRICE',
        booking_type: criteria.booking_type || 'ALL',
        trip_distances: ['Local', 'Short', 'Long'],
        masked_data: true,
        age_min__min: 30,
        truck_weight_lb__max: criteria.max_weight || 45000,
        requested_states: criteria.destination_state ? [criteria.destination_state] : [],
        is_offline_book_compatible: true,
    };
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
                    dest_city: loadData.dest_city,
                    dest_state: loadData.dest_state,
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
                    raw: loadData,
                };

                loads.push(load);
                if (DEBUG) {
                    console.log(`[CT API] Received load: ${load.origin_city}, ${load.origin_state} -> ${load.dest_city}, ${load.dest_state} | $${load.trip_rate}`);
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
