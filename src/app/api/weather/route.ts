import { NextRequest, NextResponse } from 'next/server';

// Open-Meteo weather codes to icons/descriptions
const weatherCodes: Record<number, { icon: string; description: string }> = {
    0: { icon: '☀️', description: 'Clear sky' },
    1: { icon: '🌤️', description: 'Mainly clear' },
    2: { icon: '⛅', description: 'Partly cloudy' },
    3: { icon: '☁️', description: 'Overcast' },
    45: { icon: '🌫️', description: 'Fog' },
    48: { icon: '🌫️', description: 'Depositing rime fog' },
    51: { icon: '🌧️', description: 'Light drizzle' },
    53: { icon: '🌧️', description: 'Moderate drizzle' },
    55: { icon: '🌧️', description: 'Dense drizzle' },
    61: { icon: '🌧️', description: 'Slight rain' },
    63: { icon: '🌧️', description: 'Moderate rain' },
    65: { icon: '🌧️', description: 'Heavy rain' },
    66: { icon: '🌨️', description: 'Light freezing rain' },
    67: { icon: '🌨️', description: 'Heavy freezing rain' },
    71: { icon: '❄️', description: 'Slight snow' },
    73: { icon: '❄️', description: 'Moderate snow' },
    75: { icon: '❄️', description: 'Heavy snow' },
    77: { icon: '🌨️', description: 'Snow grains' },
    80: { icon: '🌧️', description: 'Slight rain showers' },
    81: { icon: '🌧️', description: 'Moderate rain showers' },
    82: { icon: '⛈️', description: 'Violent rain showers' },
    85: { icon: '🌨️', description: 'Slight snow showers' },
    86: { icon: '🌨️', description: 'Heavy snow showers' },
    95: { icon: '⛈️', description: 'Thunderstorm' },
    96: { icon: '⛈️', description: 'Thunderstorm with slight hail' },
    99: { icon: '⛈️', description: 'Thunderstorm with heavy hail' },
};

// In-memory cache with size limit and cleanup
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 500; // Limit to prevent memory leak

// Cleanup expired entries and enforce size limit
const cleanupCache = () => {
    const now = Date.now();

    // First, remove expired entries
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
            cache.delete(key);
        }
    }

    // If still over limit, remove oldest entries (LRU-style)
    if (cache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => cache.delete(key));
    }
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json(
            { error: 'Missing required parameters: lat, lon' },
            { status: 400 }
        );
    }

    const cacheKey = `${lat},${lon}`;
    const cached = cache.get(cacheKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
    }

    try {
        // Fetch from Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

        const res = await fetch(url, { next: { revalidate: 1800 } });

        if (!res.ok) {
            throw new Error(`Open-Meteo API error: ${res.status}`);
        }

        const data = await res.json();

        // Transform response
        const current = {
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
            icon: weatherCodes[data.current.weather_code]?.icon || '🌡️',
            description: weatherCodes[data.current.weather_code]?.description || 'Unknown',
            windSpeed: Math.round(data.current.wind_speed_10m),
        };

        const forecast = data.daily.time.map((date: string, i: number) => ({
            date,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            weatherCode: data.daily.weather_code[i],
            icon: weatherCodes[data.daily.weather_code[i]]?.icon || '🌡️',
            description: weatherCodes[data.daily.weather_code[i]]?.description || 'Unknown',
        }));

        const result = {
            current,
            forecast,
            lastUpdated: new Date().toISOString(),
        };

        // Cache the result and cleanup if needed
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        cleanupCache();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
