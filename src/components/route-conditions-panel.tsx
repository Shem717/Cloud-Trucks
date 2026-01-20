"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Cloud, Link2, AlertTriangle, Thermometer } from 'lucide-react';
import { cn } from "@/lib/utils";

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

interface ChainLaw {
    id: string;
    state: string;
    route_name: string;
    description?: string;
    status: 'none' | 'r1' | 'r2' | 'r3';
    statusDescription: string;
    isActive: boolean;
    last_updated: string;
}

interface RouteConditionsPanelProps {
    originCity?: string;
    originState?: string;
    originLat?: number;
    originLon?: number;
    destCity?: string;
    destState?: string;
    destLat?: number;
    destLon?: number;
    className?: string;
}

const statusColors: Record<string, string> = {
    none: 'text-green-500 bg-green-500/10',
    r1: 'text-yellow-500 bg-yellow-500/10',
    r2: 'text-orange-500 bg-orange-500/10',
    r3: 'text-red-500 bg-red-500/10',
};

// Geocoding cache
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = data.results.find((r: any) => r.admin1?.toLowerCase().includes(state.toLowerCase()) || r.country_code === 'US') || data.results[0];
        const coords = { lat: match.latitude, lon: match.longitude };
        geocodeCache.set(cacheKey, coords);
        return coords;
    } catch {
        return null;
    }
}

export function RouteConditionsPanel({
    originCity,
    originState,
    originLat,
    originLon,
    destCity,
    destState,
    destLat,
    destLon,
    className
}: RouteConditionsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [originWeather, setOriginWeather] = useState<WeatherData | null>(null);
    const [destWeather, setDestWeather] = useState<WeatherData | null>(null);
    const [chainLaws, setChainLaws] = useState<ChainLaw[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isExpanded) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Get coordinates for origin (use provided or geocode)
                let oCoords = originLat && originLon ? { lat: originLat, lon: originLon } : null;
                if (!oCoords && originCity && originState) {
                    oCoords = await geocodeCity(originCity, originState);
                }

                // Get coordinates for destination (use provided or geocode)
                let dCoords = destLat && destLon ? { lat: destLat, lon: destLon } : null;
                if (!dCoords && destCity && destState) {
                    dCoords = await geocodeCity(destCity, destState);
                }

                // Fetch weather and chain laws in parallel
                const [originRes, destRes, chainRes] = await Promise.all([
                    oCoords ? fetch(`/api/weather?lat=${oCoords.lat}&lon=${oCoords.lon}`).then(r => r.json()).catch(() => null) : null,
                    dCoords ? fetch(`/api/weather?lat=${dCoords.lat}&lon=${dCoords.lon}`).then(r => r.json()).catch(() => null) : null,
                    originState ? fetch(`/api/chain-laws?state=${originState}`).then(r => r.json()).catch(() => ({ chainLaws: [] })) : { chainLaws: [] },
                ]);

                if (originRes) setOriginWeather(originRes);
                if (destRes) setDestWeather(destRes);
                if (chainRes?.chainLaws) setChainLaws(chainRes.chainLaws);

                // Also fetch destination state chain laws
                if (destState && destState !== originState) {
                    const destChainRes = await fetch(`/api/chain-laws?state=${destState}`).then(r => r.json()).catch(() => ({ chainLaws: [] }));
                    if (destChainRes?.chainLaws) {
                        setChainLaws(prev => [...prev, ...destChainRes.chainLaws]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch route conditions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isExpanded, originLat, originLon, destLat, destLon, originState, destState, originCity, destCity]);


    const activeChainLaws = chainLaws.filter(law => law.isActive);
    const hasActiveChainLaws = activeChainLaws.length > 0;

    return (
        <div className={cn("border-t border-dashed pt-3 mt-3", className)}>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Route Conditions
                    {hasActiveChainLaws && (
                        <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                            ⛓️ Chain Control
                        </Badge>
                    )}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {isExpanded && (
                <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    {loading ? (
                        <div className="text-center text-sm text-muted-foreground py-4 animate-pulse">
                            Loading route conditions...
                        </div>
                    ) : (
                        <>
                            {/* Weather Section */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Origin Weather */}
                                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-black/50 border-blue-100 dark:border-blue-900">
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {originCity || 'Origin'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3">
                                        {originWeather ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-4xl">{originWeather.current.icon}</span>
                                                    <span className="text-4xl font-extrabold">{originWeather.current.temperature}°F</span>
                                                </div>
                                                <div className="text-sm font-bold">
                                                    {originWeather.current.description}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-medium">
                                                    Wind: {originWeather.current.windSpeed} mph
                                                </div>
                                                {/* Mini forecast */}
                                                <div className="flex justify-between text-[10px] border-t pt-2 mt-2">
                                                    {originWeather.forecast.slice(0, 5).map((day, i) => (
                                                        <div key={i} className="flex flex-col items-center">
                                                            <span className="text-muted-foreground">
                                                                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                                                            </span>
                                                            <span>{day.icon}</span>
                                                            <span className="font-medium">{day.high}°</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground">Weather unavailable</div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Destination Weather */}
                                <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-black/50 border-indigo-100 dark:border-indigo-900">
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-sm bg-red-500"></span>
                                            {destCity || 'Destination'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3">
                                        {destWeather ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-4xl">{destWeather.current.icon}</span>
                                                    <span className="text-4xl font-extrabold">{destWeather.current.temperature}°F</span>
                                                </div>
                                                <div className="text-sm font-bold">
                                                    {destWeather.current.description}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-medium">
                                                    Wind: {destWeather.current.windSpeed} mph
                                                </div>
                                                {/* Mini forecast */}
                                                <div className="flex justify-between text-[10px] border-t pt-2 mt-2">
                                                    {destWeather.forecast.slice(0, 5).map((day, i) => (
                                                        <div key={i} className="flex flex-col items-center">
                                                            <span className="text-muted-foreground">
                                                                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                                                            </span>
                                                            <span>{day.icon}</span>
                                                            <span className="font-medium">{day.high}°</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground">Weather unavailable</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Chain Laws Section */}
                            {chainLaws.length > 0 && (
                                <Card className={cn(
                                    "border",
                                    hasActiveChainLaws ? "border-orange-200 dark:border-orange-900" : "border-green-200 dark:border-green-900"
                                )}>
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <CardTitle className="text-xs font-medium flex items-center gap-2">
                                            <Link2 className="h-4 w-4" />
                                            Chain Control Zones
                                            {hasActiveChainLaws ? (
                                                <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                                                    {activeChainLaws.length} Active
                                                </Badge>
                                            ) : (
                                                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                                                    All Clear
                                                </Badge>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3">
                                        <div className="space-y-2">
                                            {chainLaws.map(law => (
                                                <div
                                                    key={law.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded text-xs",
                                                        statusColors[law.status]
                                                    )}
                                                >
                                                    <div>
                                                        <div className="font-medium">{law.route_name}</div>
                                                        {law.description && (
                                                            <div className="text-muted-foreground text-[10px]">{law.description}</div>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[10px]", statusColors[law.status])}>
                                                        {law.status === 'none' ? 'CLEAR' : law.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Last Updated */}
                            <div className="text-[10px] text-muted-foreground/50 text-right">
                                Last updated: {new Date().toLocaleTimeString()}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
