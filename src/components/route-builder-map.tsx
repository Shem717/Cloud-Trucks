"use client";

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { extractLoadAddresses } from '@/lib/address-utils'; // Assuming this exists based on previous file view
import { MapPin, AlertTriangle } from 'lucide-react';

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
        [key: string]: any;
    };
}

interface RouteBuilderMapProps {
    loads: LoadData[];
    className?: string;
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

export function RouteBuilderMap({ loads, className }: RouteBuilderMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Re-initialize map when loads change
    useEffect(() => {
        if (!mapContainer.current || loads.length === 0) {
            setLoading(false);
            return;
        }

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
                    // If only one point (or less), just center on it if possible
                    if (waypoints.length === 1) {
                        if (!map.current) {
                            map.current = new mapboxgl.Map({
                                container: mapContainer.current!,
                                style: 'mapbox://styles/mapbox/dark-v11',
                                center: waypoints[0],
                                zoom: 10,
                            });
                        } else {
                            map.current.flyTo({ center: waypoints[0], zoom: 10 });
                        }
                        setLoading(false);
                        return;
                    }
                    // No valid points
                    setLoading(false);
                    return;
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
                    // Fallback if no route found (e.g. across ocean)
                    throw new Error('No drivable route found');
                }

                // 4. Initialize or Update Map
                if (!map.current) {
                    map.current = new mapboxgl.Map({
                        container: mapContainer.current!,
                        style: 'mapbox://styles/mapbox/dark-v11',
                        center: waypoints[0],
                        zoom: 5,
                    });
                }

                const mapInstance = map.current;

                // Ensure map is loaded before adding sources
                if (!mapInstance.isStyleLoaded()) {
                    await new Promise(resolve => mapInstance.once('load', resolve));
                }

                // Remove existing layers/sources if updating
                if (mapInstance.getSource('route')) {
                    mapInstance.removeLayer('route-line');
                    mapInstance.removeSource('route');
                }

                // Clear existing markers (naive approach: remove all markers from DOM if we tracked them, 
                // but for now we rely on re-init or just adding new ones. 
                // Better: clear specific markers. For this specific implementation, let's just re-create map if drastic change, 
                // or simpler: just clear markers. 
                // SINCE we are essentially rebuilding the route view, simpler to just clean up markers.
                // We will store markers in a ref to clean them up.

                // ... actually, adapting from the modal code, let's keep it simple for v1.

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
                        'line-color': '#10b981', // Emerald-500
                        'line-width': 4,
                        'line-opacity': 0.8,
                    },
                });

                // Fit bounds
                const bounds = new mapboxgl.LngLatBounds();
                waypoints.forEach((coord) => bounds.extend(coord));
                mapInstance.fitBounds(bounds, { padding: 50 });

                // Force resize to ensure canvas fills container
                mapInstance.resize();

                setLoading(false);

            } catch (err) {
                console.error('[ROUTE MAP] Error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load route map');
                setLoading(false);
            }
        };

        initializeMap();

        // Cleanup function not strictly needed for the singleton map ref pattern unless we want to destroy on unmount
        return () => {
            // Optional: Cleanup if component unmounts
        };

    }, [loads]);

    // Cleanup markers on unmount or re-render (refinement needed for production optimization)
    // For this quick integration, relying on Mapbox efficiency.


    return (
        <Card className={cn("flex-1 border-border/50 bg-muted/10 overflow-hidden relative group", className)}>
            <div ref={mapContainer} className="w-full h-full" />

            {/* Overlay Loading State */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2 px-4 py-2 bg-background/80 rounded-full shadow-lg border border-border/50">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        <span className="text-xs font-medium">Updating Route...</span>
                    </div>
                </div>
            )}

            {/* Overlay Error State */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-destructive/90 text-destructive-foreground rounded-full shadow-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Empty State Overlay */}
            {!loading && loads.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-background/80 backdrop-blur-md px-6 py-4 rounded-xl border border-border/50 shadow-2xl text-center">
                        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="font-medium text-foreground">No Route Active</p>
                        <p className="text-xs text-muted-foreground">Add loads to see the interactive map</p>
                    </div>
                </div>
            )}
        </Card>
    );
}
