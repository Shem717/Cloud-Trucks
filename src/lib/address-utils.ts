/**
 * Utility functions for extracting address data from CloudTrucks load details
 */

export interface ExtractedAddress {
    address: string;
    city: string;
    state: string;
    zip: string;
    cityStateZip: string;
    lat?: number;
    lon?: number;
    hasAddress: boolean;
}

export interface StopData {
    type?: string;
    type_detail?: string;
    location_address1?: string;
    location_address2?: string;
    location_city?: string;
    location_state?: string;
    location_zip?: string;
    location_lat?: number;
    location_long?: number;
    location_lon?: number;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    [key: string]: unknown;
}

/**
 * Extract address info from a single stop object
 */
export function extractStopAddress(stop: StopData | null | undefined): ExtractedAddress {
    if (!stop) {
        return {
            address: '',
            city: '',
            state: '',
            zip: '',
            cityStateZip: '',
            hasAddress: false,
        };
    }

    const addr1 = stop.location_address1 || stop.address || '';
    const addr2 = stop.location_address2 || '';
    const city = stop.location_city || stop.city || '';
    const state = stop.location_state || stop.state || '';
    const zip = stop.location_zip || stop.zip || '';
    const lat = stop.location_lat;
    const lon = stop.location_long || stop.location_lon;

    const fullAddress = [addr1, addr2].filter(Boolean).join(', ');
    const cityStateZip = [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '');

    return {
        address: fullAddress,
        city,
        state,
        zip,
        cityStateZip,
        lat,
        lon,
        hasAddress: fullAddress.trim().length > 0,
    };
}

/**
 * Extract origin and destination addresses from a load's details
 */
export function extractLoadAddresses(details: {
    stops?: StopData[];
    origin_address?: string;
    dest_address?: string;
    origin_city?: string;
    origin_state?: string;
    dest_city?: string;
    dest_state?: string;
}): {
    origin: ExtractedAddress;
    destination: ExtractedAddress;
} {
    const stops = details.stops || [];
    
    // Find origin and destination stops
    const originStop = stops.find((s) => s.type === 'ORIGIN' || s.type_detail === 'PICKUP');
    const destStop = stops.find((s) => s.type === 'DESTINATION' || s.type_detail === 'DELIVERY');

    // Extract from stops or fall back to top-level fields
    const origin = originStop
        ? extractStopAddress(originStop)
        : {
            address: details.origin_address || '',
            city: details.origin_city || '',
            state: details.origin_state || '',
            zip: '',
            cityStateZip: [details.origin_city, details.origin_state].filter(Boolean).join(', '),
            hasAddress: !!(details.origin_address && details.origin_address.trim()),
        };

    const destination = destStop
        ? extractStopAddress(destStop)
        : {
            address: details.dest_address || '',
            city: details.dest_city || '',
            state: details.dest_state || '',
            zip: '',
            cityStateZip: [details.dest_city, details.dest_state].filter(Boolean).join(', '),
            hasAddress: !!(details.dest_address && details.dest_address.trim()),
        };

    return { origin, destination };
}

/**
 * Format an address for display
 */
export function formatAddress(extracted: ExtractedAddress): string {
    if (!extracted.hasAddress) {
        return extracted.cityStateZip || 'Address not available';
    }
    return `${extracted.address}, ${extracted.cityStateZip}`;
}

/**
 * Open address in Google Maps
 */
export function openInMaps(extracted: ExtractedAddress): void {
    if (extracted.lat && extracted.lon) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${extracted.lat},${extracted.lon}`, '_blank');
    } else if (extracted.hasAddress) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(extracted))}`, '_blank');
    }
}
