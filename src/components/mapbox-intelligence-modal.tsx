"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, AlertTriangle, TrendingUp, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    calculateRouteMetrics,
    type RouteData,
    type LoadDetails,
    type CalculationResult,
    type WeatherPoint,
    type ChainLaw,
} from '@/workers/profit-calculator';

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapboxIntelligenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    load: {
        id: string;
        details: {
            id: string;
            origin_city?: string;
            origin_state?: string;
            origin_lat?: number;
            origin_lon?: number;
            dest_city?: string;
            dest_state?: string;
            dest_lat?: number;
            dest_lon?: number;
            rate?: number | string;
            trip_rate?: number | string;
            distance?: number | string;
            trip_distance_mi?: number | string;
            pickup_date?: string | number;
            origin_pickup_date?: string | number;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key: string]: any;
        };
    };
}

interface CachedRoute {
    polyline: GeoJSON.Feature<GeoJSON.LineString>;
    timestamp: number;
    coordinates: [number, number][];
    distance: number;
    duration: number;
}

// Route cache with 1-hour TTL (FR-6)
const routeCache = new Map<string, CachedRoute>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

export function MapboxIntelligenceModal({
    isOpen,
    onClose,
    load,
}: MapboxIntelligenceModalProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<CalculationResult | null>(null);

    // Extract coordinates
    const originLat = load.details.origin_lat;
    const originLon = load.details.origin_lon;
    const destLat = load.details.dest_lat;
    const destLon = load.details.dest_lon;

    const hasCoordinates = originLat && originLon && destLat && destLon;

    /**
     * Fetch route from Mapbox Directions API with caching
     */
    const fetchRoute = useCallback(async (): Promise<CachedRoute | null> => {
        if (!hasCoordinates) return null;

        const cacheKey = `${originLon},${originLat}-${destLon},${destLat}`;

        // Check cache first
        const cached = routeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('[MAPBOX] Using cached route');
            return cached;
        }

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destLon},${destLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch route');
            }

            const data = await response.json();
            const route = data.routes[0];

            if (!route) {
                throw new Error('No route found');
            }

            const cachedRoute: CachedRoute = {
                polyline: {
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry,
                },
                timestamp: Date.now(),
                coordinates: route.geometry.coordinates,
                distance: route.distance * 0.000621371, // meters to miles
                duration: route.duration / 3600, // seconds to hours
            };

            // Cache the route
            routeCache.set(cacheKey, cachedRoute);

            return cachedRoute;
        } catch (err) {
            console.error('[MAPBOX] Route fetch error:', err);
            return null;
        }
    }, [hasCoordinates, originLat, originLon, destLat, destLon]);

    /**
     * Fetch weather data along route
     */
    const fetchWeatherAlongRoute = useCallback(
        async (coordinates: [number, number][]): Promise<WeatherPoint[]> => {
            // Sample points every 50 miles along route
            const sampleInterval = Math.max(1, Math.floor(coordinates.length / 10));
            const samplePoints = coordinates.filter(
                (_, i) => i % sampleInterval === 0
            );

            const weatherPromises = samplePoints.map(async ([lon, lat]) => {
                try {
                    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
                    const data = await res.json();

                    return {
                        lat,
                        lon,
                        temperature: data.current?.temperature || 50,
                        windSpeed: data.current?.windSpeed || 0,
                        precipitation: 0, // Would need additional API for precipitation
                        description: data.current?.description || '',
                        timestamp: Date.now(),
                    };
                } catch {
                    return null;
                }
            });

            const results = await Promise.all(weatherPromises);
            return results.filter((w): w is WeatherPoint => w !== null);
        },
        []
    );

    /**
     * Fetch chain laws for route states
     */
    const fetchChainLaws = useCallback(async (): Promise<ChainLaw[]> => {
        const states = [load.details.origin_state, load.details.dest_state].filter(
            Boolean
        );

        const chainLawPromises = states.map(async (state) => {
            try {
                const res = await fetch(`/api/chain-laws?state=${state}`);
                const data = await res.json();
                return data.chainLaws || [];
            } catch {
                return [];
            }
        });

        const results = await Promise.all(chainLawPromises);
        return results.flat();
    }, [load.details.origin_state, load.details.dest_state]);

    /**
     * Initialize map and load route data
     */
    useEffect(() => {
        if (!isOpen || !mapContainer.current || !hasCoordinates) return;

        const initializeMap = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Fetch route
                const route = await fetchRoute();
                if (!route) {
                    throw new Error('Could not load route');
                }

                // 2. Initialize map
                const mapInstance = new mapboxgl.Map({
                    container: mapContainer.current!,
                    style: 'mapbox://styles/mapbox/dark-v11',
                    center: [originLon!, originLat!],
                    zoom: 5,
                });

                map.current = mapInstance;

                mapInstance.on('load', async () => {
                    // 3. Fetch weather and chain laws
                    const [weatherPoints, chainLaws] = await Promise.all([
                        fetchWeatherAlongRoute(route.coordinates),
                        fetchChainLaws(),
                    ]);

                    // 4. Calculate metrics using Web Worker logic
                    const routeData: RouteData = {
                        coordinates: route.coordinates,
                        distance: route.distance,
                        duration: route.duration,
                        weatherPoints,
                        chainLaws,
                    };

                    // Convert string/number types to numbers
                    const rawRate = load.details.rate || load.details.trip_rate || 0;
                    const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;

                    const rawDistance = load.details.distance || load.details.trip_distance_mi || route.distance;
                    const distance = typeof rawDistance === 'string' ? parseFloat(rawDistance) : rawDistance;

                    const loadDetails: LoadDetails = {
                        rate,
                        distance,
                        pickup_date: load.details.pickup_date || load.details.origin_pickup_date || Date.now(),
                    };

                    const calculatedMetrics = calculateRouteMetrics(routeData, loadDetails);
                    setMetrics(calculatedMetrics);

                    // 5. Add route polyline with gradient
                    mapInstance.addSource('route', {
                        type: 'geojson',
                        data: route.polyline,
                    });

                    // Gradient based on profit per mile
                    const profitPerMile = calculatedMetrics.profitPerMile;
                    const lineColor =
                        profitPerMile > 2.5
                            ? '#22c55e' // Green: High profit
                            : profitPerMile > 1.5
                                ? '#eab308' // Yellow: Medium profit
                                : '#ef4444'; // Red: Low profit

                    mapInstance.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round',
                        },
                        paint: {
                            'line-color': lineColor,
                            'line-width': 6,
                            'line-opacity': 0.8,
                        },
                    });

                    // 6. Add origin/destination markers
                    new mapboxgl.Marker({ color: '#22c55e' })
                        .setLngLat([originLon!, originLat!])
                        .setPopup(
                            new mapboxgl.Popup().setHTML(
                                `<strong>Origin</strong><br/>${load.details.origin_city}, ${load.details.origin_state}`
                            )
                        )
                        .addTo(mapInstance);

                    new mapboxgl.Marker({ color: '#ef4444' })
                        .setLngLat([destLon!, destLat!])
                        .setPopup(
                            new mapboxgl.Popup().setHTML(
                                `<strong>Destination</strong><br/>${load.details.dest_city}, ${load.details.dest_state}`
                            )
                        )
                        .addTo(mapInstance);

                    // 7. Add hazard markers
                    calculatedMetrics.hazards.forEach((hazard) => {
                        const icon = hazard.type === 'ice' ? '❄️' : hazard.type === 'wind' ? '💨' : '⛈️';
                        const el = document.createElement('div');
                        el.className = 'hazard-marker';
                        el.innerHTML = icon;
                        el.style.fontSize = '24px';
                        el.style.cursor = 'pointer';

                        new mapboxgl.Marker({ element: el })
                            .setLngLat([hazard.lon, hazard.lat])
                            .setPopup(
                                new mapboxgl.Popup().setHTML(
                                    `<strong>${hazard.type.toUpperCase()} Hazard</strong><br/>${hazard.description}`
                                )
                            )
                            .addTo(mapInstance);
                    });

                    // 8. Fit bounds to route
                    const bounds = new mapboxgl.LngLatBounds();
                    route.coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
                    mapInstance.fitBounds(bounds, { padding: 50 });

                    setLoading(false);
                });
            } catch (err) {
                console.error('[MAPBOX] Initialization error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load map');
                setLoading(false);
            }
        };

        initializeMap();

        // Cleanup on unmount (memory management - FR-4)
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isOpen, hasCoordinates, originLat, originLon, destLat, destLon, fetchRoute, fetchWeatherAlongRoute, fetchChainLaws, load.details]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="relative w-full max-w-6xl h-[80vh] bg-background rounded-xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold">Route Intelligence</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {load.details.origin_city} → {load.details.dest_city}
                                    </p>
                                </div>

                                {metrics && (
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                metrics.riskScore > 7
                                                    ? 'destructive'
                                                    : metrics.riskScore > 4
                                                        ? 'default'
                                                        : 'outline'
                                            }
                                            className="text-sm"
                                        >
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Risk: {metrics.riskScore}/10
                                        </Badge>

                                        <Badge variant="outline" className="text-sm">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            ${metrics.profitPerMile.toFixed(2)}/mi
                                        </Badge>

                                        {metrics.delayHours > 0 && (
                                            <Badge variant="outline" className="text-sm text-orange-500">
                                                <Clock className="h-3 w-3 mr-1" />
                                                +{metrics.delayHours.toFixed(1)}hr delay
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Map Container */}
                    <div className="w-full h-full pt-20 pb-4">
                        {!hasCoordinates ? (
                            <div className="flex items-center justify-center h-full">
                                <Card className="max-w-md">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <MapPin className="h-12 w-12 text-muted-foreground" />
                                            <div>
                                                <h3 className="font-semibold mb-2">Coordinates Unavailable</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This load doesn&apos;t have GPS coordinates. Route visualization requires
                                                    origin and destination coordinates.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full">
                                <Card className="max-w-md border-destructive">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <AlertTriangle className="h-12 w-12 text-destructive" />
                                            <div>
                                                <h3 className="font-semibold mb-2">Failed to Load Route</h3>
                                                <p className="text-sm text-muted-foreground">{error}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <>
                                <div
                                    ref={mapContainer}
                                    className={cn('w-full h-full rounded-lg', loading && 'opacity-50')}
                                />
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 shadow-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                                <span className="text-sm font-medium">Loading route intelligence...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Metrics Panel */}
                    {metrics && (
                        <div className="absolute bottom-4 left-4 right-4 z-10">
                            <Card className="bg-background/95 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-green-500">
                                                ${metrics.projectedNet.toFixed(0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Projected Net</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{metrics.riskScore}/10</div>
                                            <div className="text-xs text-muted-foreground">Risk Score</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{metrics.hazards.length}</div>
                                            <div className="text-xs text-muted-foreground">Hazards</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {metrics.delayHours > 0 ? `+${metrics.delayHours.toFixed(1)}` : '0'}hr
                                            </div>
                                            <div className="text-xs text-muted-foreground">Est. Delay</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
