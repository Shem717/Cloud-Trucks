"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeatherData {
    current: {
        temperature: number;
        icon: string;
        description: string;
        windSpeed: number;
    };
    forecast: {
        date: string;
        high: number;
        low: number;
        icon: string;
        description: string;
    }[];
    lastUpdated: string;
}

interface WeatherBadgeProps {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
    className?: string;
    size?: "sm" | "md";
    showForecast?: boolean;
}

// Simple geocoding cache
const geocodeCache = new Map<string, { lat: number; lon: number }>();

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
    const cacheKey = `${city},${state}`;
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey)!;
    }

    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.results || data.results.length === 0) return null;

        // Try to find a match in the correct state
        const match = data.results.find((r: any) =>
            r.admin1?.toLowerCase().includes(state.toLowerCase()) ||
            r.country_code === 'US'
        ) || data.results[0];

        const coords = { lat: match.latitude, lon: match.longitude };
        geocodeCache.set(cacheKey, coords);
        return coords;
    } catch {
        return null;
    }
}

export function WeatherBadge({ lat, lon, city, state, className, size = "sm", showForecast = true }: WeatherBadgeProps) {

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
        lat && lon ? { lat, lon } : null
    );

    // Geocode if we have city/state but no coordinates
    useEffect(() => {
        if (coords) return; // Already have coordinates
        if (!city || !state) return; // Can't geocode without city/state

        geocodeCity(city, state).then(result => {
            if (result) setCoords(result);
        });
    }, [city, state, coords]);

    // Fetch weather once we have coordinates
    useEffect(() => {
        if (!coords) return;

        const fetchWeather = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}`);
                if (res.ok) {
                    const data = await res.json();
                    setWeather(data);
                } else {
                    setError(true);
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [coords]);

    // Show nothing if we can't get coordinates
    if (!coords && !city) return null;
    if (loading) return <span className="text-xs text-muted-foreground animate-pulse">...</span>;
    if (error || !weather) return null;


    const sizeClasses = {
        sm: "text-sm",
        md: "text-base"
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn(
                        "inline-flex items-center gap-1 cursor-help",
                        sizeClasses[size],
                        className
                    )}>
                        <span>{weather.current.icon}</span>
                        <span className="font-medium">{weather.current.temperature}°</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-3" side="top">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div>
                                <div className="font-semibold">{city || 'Location'}</div>
                                <div className="text-xs text-muted-foreground">
                                    {weather.current.description}
                                </div>
                            </div>
                            <div className="text-2xl">{weather.current.icon}</div>
                        </div>

                        <div className="flex justify-between text-xs">
                            <span>Current: {weather.current.temperature}°F</span>
                            <span>Wind: {weather.current.windSpeed} mph</span>
                        </div>

                        {showForecast && weather.forecast.length > 0 && (
                            <div className="border-t pt-2 mt-2">
                                <div className="text-xs font-medium mb-1">7-Day Forecast</div>
                                <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                                    {weather.forecast.slice(0, 7).map((day, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <span className="text-muted-foreground">
                                                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                                            </span>
                                            <span>{day.icon}</span>
                                            <span className="font-medium">{day.high}°</span>
                                            <span className="text-muted-foreground">{day.low}°</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-[10px] text-muted-foreground/50 text-right">
                            Updated: {new Date(weather.lastUpdated).toLocaleTimeString()}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
