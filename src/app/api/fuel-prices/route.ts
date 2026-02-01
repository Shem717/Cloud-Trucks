import { NextRequest, NextResponse } from 'next/server';

interface TruckStop {
  name: string;
  placeId: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  fuelPrice?: number;
  amenities?: string[];
  rating?: number;
  distance?: number;
}

interface FuelPriceCache {
  data: TruckStop[];
  timestamp: number;
  location: string;
}

// In-memory cache (consider Redis for production)
const cache = new Map<string, FuelPriceCache>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Major truck stop chains
const TRUCK_STOP_CHAINS = [
  'Pilot Flying J',
  "Love's Travel Stops",
  'TA Travel Centers',
  'Petro Stopping Centers',
  'TravelCenters of America',
  'Speedway',
  'Kwik Trip',
  'Casey\'s General Store',
  'Buc-ee\'s',
  'Maverik',
];

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a place is a truck stop based on name and types
 */
function isTruckStop(place: any): boolean {
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];

  // Check if it's a known truck stop chain
  const isKnownChain = TRUCK_STOP_CHAINS.some(chain =>
    name.includes(chain.toLowerCase())
  );

  // Check if it has truck-related keywords
  const hasTruckKeywords =
    name.includes('truck stop') ||
    name.includes('travel center') ||
    name.includes('travel plaza') ||
    name.includes('truck plaza');

  // Check if it's a gas station
  const isGasStation = types.includes('gas_station');

  return (isKnownChain || hasTruckKeywords) && isGasStation;
}

/**
 * Fetch fuel prices from Google Places API
 */
async function fetchFuelPrices(
  latitude: number,
  longitude: number,
  radius: number = 50000 // 50km default
): Promise<TruckStop[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  try {
    // Use Places API Nearby Search
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${latitude},${longitude}`);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('type', 'gas_station');
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
    }

    // Filter and map truck stops
    const truckStops: TruckStop[] = data.results
      .filter(isTruckStop)
      .map((place: any) => ({
        name: place.name,
        placeId: place.place_id,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        address: place.vicinity || place.formatted_address || '',
        rating: place.rating,
        distance: calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        ),
      }))
      .sort((a: TruckStop, b: TruckStop) => (a.distance || 0) - (b.distance || 0));

    return truckStops;
  } catch (error) {
    console.error('Error fetching fuel prices:', error);
    throw error;
  }
}

/**
 * GET /api/fuel-prices
 * Query params:
 * - lat: latitude
 * - lng: longitude
 * - radius: search radius in meters (optional, default 50000)
 * - chain: filter by specific chain (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.url ? new URL(request.url) : { searchParams: new URLSearchParams() };
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const chain = searchParams.get('chain');

    // Validate required parameters
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lng' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = radius ? parseInt(radius) : 50000;

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)},${searchRadius}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      let results = cached.data;

      // Filter by chain if specified
      if (chain) {
        results = results.filter(stop =>
          stop.name.toLowerCase().includes(chain.toLowerCase())
        );
      }

      return NextResponse.json({
        truckStops: results,
        cached: true,
        timestamp: cached.timestamp,
      });
    }

    // Fetch fresh data
    const truckStops = await fetchFuelPrices(latitude, longitude, searchRadius);

    // Cache the results
    cache.set(cacheKey, {
      data: truckStops,
      timestamp: Date.now(),
      location: cacheKey,
    });

    let results = truckStops;

    // Filter by chain if specified
    if (chain) {
      results = results.filter(stop =>
        stop.name.toLowerCase().includes(chain.toLowerCase())
      );
    }

    return NextResponse.json({
      truckStops: results,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Fuel prices API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch fuel prices',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
