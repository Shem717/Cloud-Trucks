"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, MapPin, DollarSign, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { extractLoadAddresses } from '@/lib/address-utils';

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface LoadData {
    id: string;
    details: {
        id: string;
        origin_city?: string;
        origin_state?: string;
        dest_city?: string;
        dest_state?: string;
        rate?: number | string;
        trip_rate?: number | string;
        distance?: number | string;
        trip_distance_mi?: number | string;
        stops?: Array<{
            type?: string;
            type_detail?: string;
            location_lat?: number;
            location_long?: number;
            location_lon?: number;
            location_city?: string;
            location_state?: string;
            location_address1?: string;
            [key: string]: unknown;
        }>;
        [key: string]: any;
    };
}

interface MultiStopRouteModalProps {
    isOpen: boolean;
    onClose: () => void;
    loads: LoadData[]; // Array of loads to visualize as a multi-stop route
    title?: string;
}

/**
 * Get coordinates for a load (from stops or city geocoding)
 */
async function getLoadCoordinates(load: LoadData): Promise<{
    origin: [number, number] | null;
    destination: [number, number] | null;
}> {
    const addresses = extractLoadAddresses(load.details);

    // Try to get from stops first
    if (addresses.origin.lat && addresses.origin.lon) {
        const origin: [number, number] = [addresses.origin.lon, addresses.origin.lat];
        const destination: [number, number] | null = 
            addresses.destination.lat && addresses.destination.lon
                ? [addresses.destination.lon, addresses.destination.lat]
                : null;
        return { origin, destination };
    }

    // Fallback: geocode city names
    const geocodeCity = async (city?: string, state?: string): Promise<[number, number] | null> => {
        if (!city || !state) return null;
        try {
            const query = encodeURIComponent(`${city}, ${state}`);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxgl.accessToken}&limit=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0].center as [number, number];
            }
        } catch (e) {
            console.error('Geocoding error:', e);
        }
        return null;
    };

    const origin = await geocodeCity(load.details.origin_city, load.details.origin_state);
    const destination = await geocodeCity(load.details.dest_city, load.details.dest_state);

    return { origin, destination };
}

export function MultiStopRouteModal({
    isOpen,
    onClose,
    loads,
    title = 'Round Trip Route',
}: MultiStopRouteModalProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [routeMetrics, setRouteMetrics] = useState<{
        totalDistance: number;
        totalRevenue: number;
        totalStops: number;
    } | null>(null);

    /**
     * Initialize map and load multi-stop route
     */
    useEffect(() => {
        if (!isOpen || !mapContainer.current || loads.length === 0) return;

        const initializeMap = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Get all coordinates
                const coordinatePairs = await Promise.all(
                    loads.map((load) => getLoadCoordinates(load))
                );

                // 2. Build waypoints list
                const waypoints: [number, number][] = [];
                for (let i = 0; i < coordinatePairs.length; i++) {
                    const { origin, destination } = coordinatePairs[i];
                    if (i === 0 && origin) {
                        waypoints.push(origin); // First origin
                    }
                    if (destination) {
                        waypoints.push(destination); // Each destination
                    }
                }

                if (waypoints.length < 2) {
                    throw new Error('Not enough valid coordinates to build route');
                }

                // 3. Fetch multi-stop route from Mapbox
                const waypointsString = waypoints.map(([lon, lat]) => `${lon},${lat}`).join(';');
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsString}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Failed to fetch route');
                }

                const data = await response.json();
                const route = data.routes[0];

                if (!route) {
                    throw new Error('No route found');
                }

                // 4. Calculate metrics
                const totalDistance = route.distance * 0.000621371; // meters to miles
                const totalRevenue = loads.reduce((sum, load) => {
                    const rawRate = load.details.rate || load.details.trip_rate || 0;
                    const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                    return sum + rate;
                }, 0);

                setRouteMetrics({
                    totalDistance,
                    totalRevenue,
                    totalStops: waypoints.length,
                });

                // 5. Initialize map
                const mapInstance = new mapboxgl.Map({
                    container: mapContainer.current!,
                    style: 'mapbox://styles/mapbox/dark-v11',
                    center: waypoints[0],
                    zoom: 5,
                });

                map.current = mapInstance;

                mapInstance.on('load', () => {
                    // Add route polyline
                    mapInstance.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: route.geometry,
                        },
                    });

                    mapInstance.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round',
                        },
                        paint: {
                            'line-color': '#3b82f6', // Blue for multi-stop
                            'line-width': 6,
                            'line-opacity': 0.8,
                        },
                    });

                    // Add markers for each waypoint
                    waypoints.forEach((coord, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === waypoints.length - 1;
                        const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#3b82f6';

                        new mapboxgl.Marker({ color })
                            .setLngLat(coord)
                            .setPopup(
                                new mapboxgl.Popup().setHTML(
                                    `<strong>Stop ${idx + 1}</strong>${isFirst ? ' (Start)' : isLast ? ' (End)' : ''}`
                                )
                            )
                            .addTo(mapInstance);
                    });

                    // Fit bounds to route
                    const bounds = new mapboxgl.LngLatBounds();
                    waypoints.forEach((coord) => bounds.extend(coord));
                    mapInstance.fitBounds(bounds, { padding: 80 });

                    setLoading(false);
                });
            } catch (err) {
                console.error('[MULTI-STOP] Initialization error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load route');
                setLoading(false);
            }
        };

        initializeMap();

        // Cleanup
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isOpen, loads]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                    className="relative w-full max-w-6xl h-[80vh] glass-panel rounded-xl overflow-hidden border-white/10 dark:border-white/5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-background/40 backdrop-blur-md border-b border-white/10 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {loads.length} stop{loads.length !== 1 ? 's' : ''} • Round trip visualization
                                    </p>
                                </div>

                                {routeMetrics && (
                                    <div className="flex items-center gap-2 animate-in fade-in duration-500">
                                        <Badge variant="outline" className="text-sm bg-background/50 backdrop-blur-sm">
                                            <Truck className="h-3 w-3 mr-1" />
                                            {routeMetrics.totalDistance.toFixed(0)} mi
                                        </Badge>

                                        <Badge variant="outline" className="text-sm bg-green-500/10 text-green-500 border-green-500/30">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            ${routeMetrics.totalRevenue.toFixed(0)} total
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 hover:text-red-500 transition-colors rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Map Container */}
                    <div className="w-full h-full pt-20 pb-0 bg-black/5">
                        {error ? (
                            <div className="flex items-center justify-center h-full">
                                <Card className="max-w-md border-destructive glass-panel bg-background/50">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <MapPin className="h-12 w-12 text-destructive" />
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
                                    className={cn('w-full h-full', loading && 'opacity-50 blur-sm transition-all duration-700')}
                                />
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="glass-panel rounded-full px-6 py-3 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                                                <span className="text-sm font-medium">Building multi-stop route...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
