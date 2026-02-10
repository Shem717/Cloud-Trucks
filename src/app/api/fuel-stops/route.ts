import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAndSanitize } from '@/lib/validators/common';

// Request validation schema
const fuelStopsSchema = z.object({
    originLat: z.coerce.number().min(-90).max(90),
    originLon: z.coerce.number().min(-180).max(180),
    destLat: z.coerce.number().min(-90).max(90),
    destLon: z.coerce.number().min(-180).max(180),
    maxStops: z.coerce.number().min(1).max(10).default(5),
});

interface FuelStop {
    id: string;
    name: string;
    brand: string;
    address: string;
    city: string;
    state: string;
    lat: number;
    lon: number;
    price?: number; // Google Places may not have pricing
    priceLevel?: number; // 1-4 scale from Google
    amenities: string[];
    distanceFromRoute: number;
    milesAlongRoute: number;
    hasParking: boolean;
    hasDiesel: boolean;
    rating: number;
    userRatingsTotal: number;
}

interface FuelStopCandidate extends FuelStop {
    // Normalized quality score for ranking choices near each target segment.
    score: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface RoutePath {
    coordinates: [number, number][];
    distanceMiles: number;
    encodedPolyline: string;
}

interface GooglePlaceAddressComponent {
    types?: string[];
    longText?: string;
    shortText?: string;
    long_name?: string;
    short_name?: string;
}

interface GoogleFuelPrice {
    type?: string;
    fuelType?: string;
    // Google Money object can include units (string) + nanos.
    price?: {
        units?: string | number;
        nanos?: number;
    } | number;
}

interface GooglePlace {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    addressComponents?: GooglePlaceAddressComponent[];
    priceLevel?: number;
    fuelOptions?: {
        fuelPrices?: GoogleFuelPrice[];
    };
}

interface GooglePlacesSearchResponse {
    places?: GooglePlace[];
}

interface RouteProjection {
    milesAlongRoute: number;
    distanceFromRoute: number;
}

function simplifyCoordinatesForPolyline(
    coordinates: [number, number][],
    maxPoints: number = 180
): [number, number][] {
    if (coordinates.length <= maxPoints) return coordinates;

    const simplified: [number, number][] = [];
    for (let i = 0; i < maxPoints; i++) {
        const index = Math.round((i * (coordinates.length - 1)) / (maxPoints - 1));
        simplified.push(coordinates[index]);
    }
    return simplified;
}

function encodePolyline(coordinates: [number, number][]): string {
    let lastLat = 0;
    let lastLon = 0;
    let encoded = '';

    const encodeValue = (value: number): string => {
        let result = '';
        let shifted = value < 0 ? ~(value << 1) : value << 1;
        while (shifted >= 0x20) {
            result += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
            shifted >>= 5;
        }
        result += String.fromCharCode(shifted + 63);
        return result;
    };

    for (const [lon, lat] of coordinates) {
        const latE5 = Math.round(lat * 1e5);
        const lonE5 = Math.round(lon * 1e5);
        encoded += encodeValue(latE5 - lastLat);
        encoded += encodeValue(lonE5 - lastLon);
        lastLat = latE5;
        lastLon = lonE5;
    }

    return encoded;
}

function buildRouteCumulativeMiles(coordinates: [number, number][]): number[] {
    const cumulative = [0];
    for (let index = 1; index < coordinates.length; index++) {
        const [prevLon, prevLat] = coordinates[index - 1];
        const [currLon, currLat] = coordinates[index];
        cumulative[index] = cumulative[index - 1] + calculateDistance(prevLat, prevLon, currLat, currLon);
    }
    return cumulative;
}

function latLonToMiles(lat: number, lon: number, refLat: number, refLon: number): { x: number; y: number } {
    const milesPerLat = 69.0;
    const milesPerLon = Math.cos((refLat * Math.PI) / 180) * 69.172;
    return {
        x: (lon - refLon) * milesPerLon,
        y: (lat - refLat) * milesPerLat,
    };
}

function projectPointOntoRoute(
    lat: number,
    lon: number,
    coordinates: [number, number][],
    cumulativeMiles: number[]
): RouteProjection {
    if (coordinates.length < 2) {
        return { milesAlongRoute: 0, distanceFromRoute: 0 };
    }

    let bestDistance = Number.POSITIVE_INFINITY;
    let bestMilesAlong = 0;

    for (let index = 0; index < coordinates.length - 1; index++) {
        const [startLon, startLat] = coordinates[index];
        const [endLon, endLat] = coordinates[index + 1];
        const refLat = (startLat + endLat) / 2;
        const refLon = (startLon + endLon) / 2;

        const start = latLonToMiles(startLat, startLon, refLat, refLon);
        const end = latLonToMiles(endLat, endLon, refLat, refLon);
        const point = latLonToMiles(lat, lon, refLat, refLon);

        const segmentX = end.x - start.x;
        const segmentY = end.y - start.y;
        const segmentLenSq = segmentX * segmentX + segmentY * segmentY;
        if (segmentLenSq === 0) continue;

        const pointX = point.x - start.x;
        const pointY = point.y - start.y;
        const rawT = (pointX * segmentX + pointY * segmentY) / segmentLenSq;
        const t = Math.max(0, Math.min(1, rawT));

        const projectedX = start.x + segmentX * t;
        const projectedY = start.y + segmentY * t;
        const dx = point.x - projectedX;
        const dy = point.y - projectedY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bestDistance) {
            bestDistance = distance;
            const segmentMiles = Math.sqrt(segmentLenSq);
            bestMilesAlong = cumulativeMiles[index] + segmentMiles * t;
        }
    }

    if (!Number.isFinite(bestDistance)) {
        return { milesAlongRoute: 0, distanceFromRoute: 0 };
    }

    return {
        milesAlongRoute: bestMilesAlong,
        distanceFromRoute: bestDistance,
    };
}

function parseMoneyToNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (!value || typeof value !== 'object') return undefined;

    const money = value as { units?: string | number; nanos?: number };
    if (money.units === undefined && money.nanos === undefined) return undefined;

    const units = typeof money.units === 'string' ? parseFloat(money.units) : (money.units || 0);
    if (!Number.isFinite(units)) return undefined;
    const nanos = typeof money.nanos === 'number' ? money.nanos / 1e9 : 0;
    const total = units + nanos;
    return Number.isFinite(total) ? total : undefined;
}

function extractDieselPrice(place: GooglePlace): number | undefined {
    const fuelPrices = place.fuelOptions?.fuelPrices || [];
    if (fuelPrices.length === 0) return undefined;

    const dieselKeywords = ['TRUCK_DIESEL', 'HIGH_FLOW_DIESEL', 'DIESEL', 'BIO_DIESEL'];

    const ranked = [...fuelPrices].sort((left, right) => {
        const leftType = String(left.type || left.fuelType || '').toUpperCase();
        const rightType = String(right.type || right.fuelType || '').toUpperCase();
        const leftRank = dieselKeywords.findIndex((keyword) => leftType.includes(keyword));
        const rightRank = dieselKeywords.findIndex((keyword) => rightType.includes(keyword));
        const normalizedLeft = leftRank === -1 ? Number.POSITIVE_INFINITY : leftRank;
        const normalizedRight = rightRank === -1 ? Number.POSITIVE_INFINITY : rightRank;
        return normalizedLeft - normalizedRight;
    });

    for (const entry of ranked) {
        const parsed = parseMoneyToNumber(entry.price);
        if (parsed !== undefined) return parsed;
    }
    return undefined;
}

/**
 * Fetch route geometry from Mapbox so fuel lookups follow drivable roads, not a straight line.
 */
async function fetchRoutePath(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
): Promise<RoutePath | null> {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
        return null;
    }

    try {
        const url = new URL(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destLon},${destLat}`
        );
        url.searchParams.set('geometries', 'geojson');
        url.searchParams.set('overview', 'full');
        url.searchParams.set('access_token', mapboxToken);

        const response = await fetch(url.toString(), { cache: 'no-store' });
        if (!response.ok) {
            const text = await response.text();
            console.error('[FUEL API] Mapbox route fetch failed:', text);
            return null;
        }

        const data = await response.json();
        const route = data.routes?.[0];
        const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
        if (!coordinates || coordinates.length < 2) {
            return null;
        }

        const simplified = simplifyCoordinatesForPolyline(coordinates);

        return {
            coordinates,
            distanceMiles: (route.distance || 0) * 0.000621371,
            encodedPolyline: encodePolyline(simplified),
        };
    } catch (error) {
        console.error('[FUEL API] Mapbox route lookup error:', error);
        return null;
    }
}

function dedupeSearchPoints(points: Array<{ lat: number; lon: number }>): Array<{ lat: number; lon: number }> {
    const seen = new Set<string>();
    const deduped: Array<{ lat: number; lon: number }> = [];
    for (const point of points) {
        const key = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(point);
    }
    return deduped;
}

/**
 * Sample points along the route and always include both endpoints.
 */
function buildRouteSearchPoints(
    coordinates: [number, number][],
    totalDistanceMiles: number,
    maxStops: number
): Array<{ lat: number; lon: number }> {
    const minPoints = Math.max(4, maxStops + 2); // include endpoints + enough route samples
    const distanceBasedPoints = Math.ceil(totalDistanceMiles / 120);
    const desiredPoints = Math.min(12, Math.max(minPoints, distanceBasedPoints));

    const points: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i < desiredPoints; i++) {
        const index = Math.round((i * (coordinates.length - 1)) / (desiredPoints - 1));
        const [lon, lat] = coordinates[index];
        points.push({ lat, lon });
    }
    return dedupeSearchPoints(points);
}

/**
 * Fallback linear interpolation (still includes endpoints).
 */
function buildLinearSearchPoints(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
    totalDistanceMiles: number,
    maxStops: number
): Array<{ lat: number; lon: number }> {
    const points: Array<{ lat: number; lon: number }> = [
        { lat: originLat, lon: originLon },
        { lat: destLat, lon: destLon },
    ];

    const between = Math.min(8, Math.max(2, Math.ceil(totalDistanceMiles / 150), maxStops));
    for (let i = 1; i <= between; i++) {
        const fraction = i / (between + 1);
        points.push({
            lat: originLat + (destLat - originLat) * fraction,
            lon: originLon + (destLon - originLon) * fraction,
        });
    }

    return dedupeSearchPoints(points);
}

function scoreStationCandidate(station: FuelStop): number {
    const ratingScore = Math.min(5, station.rating || 0) * 4;
    const reviewScore = Math.min(20, Math.log10((station.userRatingsTotal || 0) + 1) * 6);
    const routePenalty = Math.min(20, station.distanceFromRoute * 1.5);
    const parkingBonus = station.hasParking ? 8 : 0;
    return ratingScore + reviewScore + parkingBonus - routePenalty;
}

/**
 * Choose stops distributed across the route (instead of "first N near origin").
 */
function pickDistributedStops(stations: FuelStop[], totalDistance: number, maxStops: number): FuelStop[] {
    if (stations.length <= maxStops) {
        return stations.sort((a, b) => a.milesAlongRoute - b.milesAlongRoute);
    }

    const candidates: FuelStopCandidate[] = stations.map((station) => ({
        ...station,
        score: scoreStationCandidate(station),
    }));

    // Limit one top candidate per ~25-mile bucket to avoid local clustering.
    const bucketMap = new Map<number, FuelStopCandidate>();
    for (const candidate of candidates) {
        const bucket = Math.floor(candidate.milesAlongRoute / 25);
        const existing = bucketMap.get(bucket);
        if (!existing || candidate.score > existing.score) {
            bucketMap.set(bucket, candidate);
        }
    }

    const bucketed = Array.from(bucketMap.values());
    const targetCount = Math.min(maxStops, bucketed.length);
    const chosen: FuelStopCandidate[] = [];
    const used = new Set<string>();

    // Place stops near equally spaced target distances along the full route.
    for (let slot = 1; slot <= targetCount; slot++) {
        const targetMiles = (slot * totalDistance) / (targetCount + 1);
        const best = bucketed
            .filter((candidate) => !used.has(candidate.id))
            .sort((left, right) => {
                const leftDelta = Math.abs(left.milesAlongRoute - targetMiles);
                const rightDelta = Math.abs(right.milesAlongRoute - targetMiles);
                if (leftDelta !== rightDelta) return leftDelta - rightDelta;
                return right.score - left.score;
            })[0];

        if (!best) continue;
        used.add(best.id);
        chosen.push(best);
    }

    // Fill gaps with highest-scored remaining candidates if any slots are left.
    if (chosen.length < maxStops) {
        const fill = bucketed
            .filter((candidate) => !used.has(candidate.id))
            .sort((left, right) => right.score - left.score)
            .slice(0, maxStops - chosen.length);
        fill.forEach((candidate) => chosen.push(candidate));
    }

    return chosen
        .sort((a, b) => a.milesAlongRoute - b.milesAlongRoute)
        .slice(0, maxStops)
        .map(({ score: _score, ...station }) => station);
}

/**
 * Extract city and state from Google Places address components
 */
function extractLocationFromAddress(addressComponents: GooglePlaceAddressComponent[] = []): { city: string; state: string } {
    let city = '';
    let state = '';

    for (const component of addressComponents) {
        const types = component.types || [];
        if (types.includes('locality')) {
            city = component.longText || component.long_name || city;
        }
        if (types.includes('administrative_area_level_1')) {
            state = component.shortText || component.short_name || state;
        }
    }

    return { city, state };
}

/**
 * Determine truck stop brand from place name
 */
function determineBrand(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pilot') || lowerName.includes('flying j')) return 'pilot';
    if (lowerName.includes('love')) return 'loves';
    if (lowerName.includes('ta ') || lowerName.includes('petro')) return 'ta';
    if (lowerName.includes('sapp')) return 'sapp';
    if (lowerName.includes('buc-ee')) return 'bucees';
    if (lowerName.includes('shell')) return 'shell';
    if (lowerName.includes('exxon')) return 'exxon';
    if (lowerName.includes('chevron')) return 'chevron';
    if (lowerName.includes('bp')) return 'bp';
    return 'generic';
}

/**
 * Estimate amenities based on place types and brand
 */
function estimateAmenities(types: string[], brand: string): string[] {
    const amenities: string[] = [];

    // Major truck stops typically have these
    if (['pilot', 'loves', 'ta'].includes(brand)) {
        amenities.push('Showers', 'Restaurant', 'WiFi', 'Parking');
    } else {
        if (types.includes('restaurant') || types.includes('food')) amenities.push('Restaurant');
        if (types.includes('convenience_store')) amenities.push('Convenience Store');
        if (types.includes('car_wash')) amenities.push('Car Wash');
        amenities.push('Restrooms');
    }

    return amenities;
}

/**
 * Search for gas stations near a specific location using Google Places API
 */
async function searchGasStationsNearLocation(
    lat: number,
    lon: number,
    apiKey: string,
    radius: number = 15000 // 15km (~9 miles)
): Promise<GooglePlace[]> {
    const url = new URL('https://places.googleapis.com/v1/places:searchNearby');

    const requestBody = {
        includedTypes: ['gas_station'],
        maxResultCount: 10,
        locationRestriction: {
            circle: {
                center: {
                    latitude: lat,
                    longitude: lon,
                },
                radius: radius,
            },
        },
    };

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.addressComponents,places.priceLevel',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[FUEL API] Google Places error:', errorText);
        throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json() as GooglePlacesSearchResponse;
    return data.places || [];
}

/**
 * Search gas stations directly along a route polyline using Places Text Search.
 */
async function searchGasStationsAlongRoute(
    encodedPolyline: string,
    apiKey: string,
    maxResultCount: number
): Promise<GooglePlace[]> {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
                'places.id',
                'places.displayName',
                'places.formattedAddress',
                'places.location',
                'places.rating',
                'places.userRatingCount',
                'places.types',
                'places.addressComponents',
                'places.priceLevel',
                'places.fuelOptions'
            ].join(','),
        },
        body: JSON.stringify({
            textQuery: 'truck stop diesel',
            includedType: 'gas_station',
            rankPreference: 'DISTANCE',
            maxResultCount: Math.max(5, Math.min(20, maxResultCount)),
            strictTypeFiltering: true,
            searchAlongRouteParameters: {
                polyline: {
                    encodedPolyline,
                },
            },
            languageCode: 'en',
            regionCode: 'US',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Places search-along-route error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as GooglePlacesSearchResponse;
    return data.places || [];
}

/**
 * GET /api/fuel-stops - Find fuel stops along a route
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Validate request parameters
        const validation = validateAndSanitize(fuelStopsSchema, {
            originLat: searchParams.get('originLat'),
            originLon: searchParams.get('originLon'),
            destLat: searchParams.get('destLat'),
            destLon: searchParams.get('destLon'),
            maxStops: searchParams.get('maxStops') ?? undefined,
        });

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const { originLat, originLon, destLat, destLon, maxStops } = validation.data;

        // Get API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            console.error('[FUEL API] Google Places API key not configured');
            return NextResponse.json(
                { error: 'Google Places API not configured' },
                { status: 500 }
            );
        }

        // Use drivable route geometry when possible, fallback to straight-line interpolation.
        const routePath = await fetchRoutePath(originLat, originLon, destLat, destLon);
        const routeCoordinates = routePath?.coordinates || [];
        const totalDistance = routePath?.distanceMiles || calculateDistance(originLat, originLon, destLat, destLon);
        const cumulativeMiles = routeCoordinates.length > 1 ? buildRouteCumulativeMiles(routeCoordinates) : [];

        const allStations: FuelStop[] = [];
        const seenPlaceIds = new Set<string>();
        const maxOffRouteMiles = 30;
        let searchPointCount = 0;
        let usedSearchAlongRoute = false;

        const placeToFuelStop = (place: GooglePlace): FuelStop | null => {
            const placeId = place.id;
            const latitude = place.location?.latitude;
            const longitude = place.location?.longitude;
            if (!placeId || latitude === undefined || longitude === undefined) return null;
            if (seenPlaceIds.has(placeId)) return null;

            let projection: RouteProjection;
            if (routeCoordinates.length > 1) {
                projection = projectPointOntoRoute(latitude, longitude, routeCoordinates, cumulativeMiles);
            } else {
                const distFromOrigin = calculateDistance(originLat, originLon, latitude, longitude);
                projection = { milesAlongRoute: distFromOrigin, distanceFromRoute: 0 };
            }

            if (projection.distanceFromRoute > maxOffRouteMiles) return null;

            seenPlaceIds.add(placeId);

            const location = extractLocationFromAddress(place.addressComponents || []);
            const brand = determineBrand(place.displayName?.text || '');
            const amenities = estimateAmenities(place.types || [], brand);
            const dieselPrice = extractDieselPrice(place);

            return {
                id: placeId,
                name: place.displayName?.text || 'Gas Station',
                brand,
                address: place.formattedAddress || '',
                city: location.city || 'Unknown',
                state: location.state || '',
                lat: latitude,
                lon: longitude,
                price: dieselPrice,
                priceLevel: place.priceLevel,
                amenities,
                distanceFromRoute: Math.round(projection.distanceFromRoute * 10) / 10,
                milesAlongRoute: Math.round(projection.milesAlongRoute),
                hasParking: brand !== 'generic',
                hasDiesel: dieselPrice !== undefined || (place.types || []).includes('gas_station'),
                rating: place.rating || 0,
                userRatingsTotal: place.userRatingCount || 0,
            };
        };

        if (routePath?.encodedPolyline) {
            try {
                const routePlaces = await searchGasStationsAlongRoute(
                    routePath.encodedPolyline,
                    apiKey,
                    maxStops * 6
                );
                usedSearchAlongRoute = true;
                searchPointCount = 1;

                for (const place of routePlaces) {
                    const station = placeToFuelStop(place);
                    if (station) allStations.push(station);
                }
            } catch (error) {
                console.error('[FUEL API] Search-along-route failed, falling back to waypoint search:', error);
            }
        }

        if (allStations.length === 0) {
            const waypoints = routePath
                ? buildRouteSearchPoints(routePath.coordinates, totalDistance, maxStops)
                : buildLinearSearchPoints(originLat, originLon, destLat, destLon, totalDistance, maxStops);
            searchPointCount = waypoints.length;

            for (let index = 0; index < waypoints.length; index++) {
                const waypoint = waypoints[index];
                try {
                    const places = await searchGasStationsNearLocation(
                        waypoint.lat,
                        waypoint.lon,
                        apiKey
                    );

                    for (const place of places) {
                        const station = placeToFuelStop(place);
                        if (station) allStations.push(station);
                    }
                } catch (error) {
                    console.error(`[FUEL API] Error searching waypoint ${index}:`, error);
                }
            }
        }

        // Choose a route-distributed subset so markers appear along the trip.
        const sortedStations = pickDistributedStops(allStations, totalDistance, maxStops);

        console.log(`[FUEL API] Found ${sortedStations.length} fuel stops along ${totalDistance.toFixed(0)} mile route (${searchPointCount} search points, mode=${usedSearchAlongRoute ? 'sar' : 'waypoint'})`);

        return NextResponse.json({
            success: true,
            fuelStops: sortedStations,
            totalDistance: Math.round(totalDistance),
            routeInfo: {
                origin: { lat: originLat, lon: originLon },
                destination: { lat: destLat, lon: destLon },
            },
        });

    } catch (error) {
        console.error('[FUEL API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fuel stops' },
            { status: 500 }
        );
    }
}
