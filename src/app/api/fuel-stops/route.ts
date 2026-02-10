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

        return {
            coordinates,
            distanceMiles: (route.distance || 0) * 0.000621371,
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

/**
 * Extract city and state from Google Places address components
 */
function extractLocationFromAddress(addressComponents: any[]): { city: string; state: string } {
    let city = '';
    let state = '';

    for (const component of addressComponents) {
        if (component.types.includes('locality')) {
            city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
            state = component.short_name;
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
): Promise<any[]> {
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

    const data = await response.json();
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
        const totalDistance = routePath?.distanceMiles || calculateDistance(originLat, originLon, destLat, destLon);
        const waypoints = routePath
            ? buildRouteSearchPoints(routePath.coordinates, totalDistance, maxStops)
            : buildLinearSearchPoints(originLat, originLon, destLat, destLon, totalDistance, maxStops);

        // Search for gas stations near each waypoint
        const allStations: FuelStop[] = [];
        const seenPlaceIds = new Set<string>();

        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];

            try {
                const places = await searchGasStationsNearLocation(
                    waypoint.lat,
                    waypoint.lon,
                    apiKey
                );

                for (const place of places) {
                    // Skip duplicates
                    if (seenPlaceIds.has(place.id)) continue;
                    seenPlaceIds.add(place.id);

                    const location = extractLocationFromAddress(place.addressComponents || []);
                    const brand = determineBrand(place.displayName?.text || '');
                    const amenities = estimateAmenities(place.types || [], brand);

                    // Calculate distance along route (approximate)
                    const distFromOrigin = calculateDistance(
                        originLat,
                        originLon,
                        place.location.latitude,
                        place.location.longitude
                    );

                    // Calculate distance from ideal route line
                    const idealLat = originLat + (destLat - originLat) * (distFromOrigin / totalDistance);
                    const idealLon = originLon + (destLon - originLon) * (distFromOrigin / totalDistance);
                    const distFromRoute = calculateDistance(
                        idealLat,
                        idealLon,
                        place.location.latitude,
                        place.location.longitude
                    );

                    allStations.push({
                        id: place.id,
                        name: place.displayName?.text || 'Gas Station',
                        brand,
                        address: place.formattedAddress || '',
                        city: location.city || 'Unknown',
                        state: location.state || '',
                        lat: place.location.latitude,
                        lon: place.location.longitude,
                        priceLevel: place.priceLevel,
                        amenities,
                        distanceFromRoute: Math.round(distFromRoute * 10) / 10,
                        milesAlongRoute: Math.round(distFromOrigin),
                        hasParking: brand !== 'generic', // Assume major brands have parking
                        hasDiesel: true, // Most gas stations have diesel
                        rating: place.rating || 0,
                        userRatingsTotal: place.userRatingCount || 0,
                    });
                }
            } catch (error) {
                console.error(`[FUEL API] Error searching waypoint ${i}:`, error);
                // Continue with other waypoints even if one fails
            }
        }

        // Sort by distance along route and limit to maxStops
        const sortedStations = allStations
            .sort((a, b) => a.milesAlongRoute - b.milesAlongRoute)
            .slice(0, maxStops);

        console.log(`[FUEL API] Found ${sortedStations.length} fuel stops along ${totalDistance.toFixed(0)} mile route (${waypoints.length} search points)`);

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
