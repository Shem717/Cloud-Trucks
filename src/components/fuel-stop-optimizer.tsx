'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Fuel, MapPin, DollarSign, TrendingDown, Navigation, ExternalLink, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fuel stop data structure
interface FuelStop {
    id: string
    name: string
    brand: string
    address: string
    city: string
    state: string
    lat: number
    lon: number
    price?: number // per gallon (optional from API)
    priceLevel?: number // 1-4 scale from Google
    amenities: string[]
    distanceFromRoute: number // miles off route
    milesAlongRoute: number // miles from origin
    hasParking: boolean
    hasDiesel: boolean
    rating: number // 1-5
    userRatingsTotal?: number
}

/**
 * Estimate diesel price from Google's price level (1-4) and base price
 */
function estimatePriceFromPriceLevel(priceLevel: number | undefined, basePrice: number): number {
    if (!priceLevel) return basePrice

    // Price level mapping (Google's scale is relative, not absolute prices)
    // 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive
    const adjustments = {
        1: -0.30, // $0.30 cheaper
        2: -0.10, // $0.10 cheaper
        3: 0.10,  // $0.10 more expensive
        4: 0.30,  // $0.30 more expensive
    }

    const adjustment = adjustments[priceLevel as keyof typeof adjustments] || 0
    return Math.round((basePrice + adjustment) * 100) / 100
}

// Generate mock fuel stops along a route (fallback when no coordinates)
function generateFuelStops(
    originCity: string,
    destCity: string,
    totalDistance: number,
    startCoords: { lat: number, lon: number } | null = null,
    endCoords: { lat: number, lon: number } | null = null
): FuelStop[] {
    // Generate stops roughly every 200-300 miles
    const numStops = Math.max(2, Math.floor(totalDistance / 250))
    const stops: FuelStop[] = []

    // Major truck stop chains
    const chains = [
        { name: "Pilot Flying J", brand: "pilot", amenities: ["Showers", "Restaurant", "WiFi", "Scales"] },
        { name: "Love's Travel Stop", brand: "loves", amenities: ["Showers", "Restaurant", "WiFi", "Tire Care"] },
        { name: "TA/Petro", brand: "ta", amenities: ["Showers", "Restaurant", "Iron Skillet", "Scales"] },
        { name: "Sapp Bros", brand: "sapp", amenities: ["Showers", "Restaurant", "WiFi"] },
        { name: "Buc-ee's", brand: "bucees", amenities: ["Clean Restrooms", "BBQ", "Snacks"] },
    ]

    // Common interstate cities for truck stops
    const truckStopCities = [
        { city: "Kingman", state: "AZ" },
        { city: "Barstow", state: "CA" },
        { city: "Flagstaff", state: "AZ" },
        { city: "Gallup", state: "NM" },
        { city: "Amarillo", state: "TX" },
        { city: "Oklahoma City", state: "OK" },
        { city: "Little Rock", state: "AR" },
        { city: "Memphis", state: "TN" },
        { city: "Nashville", state: "TN" },
        { city: "Knoxville", state: "TN" },
        { city: "Reno", state: "NV" },
        { city: "Salt Lake City", state: "UT" },
        { city: "Denver", state: "CO" },
        { city: "Kansas City", state: "MO" },
        { city: "St. Louis", state: "MO" },
        { city: "Indianapolis", state: "IN" },
        { city: "Columbus", state: "OH" },
        { city: "Joplin", state: "MO" },
        { city: "Tulsa", state: "OK" },
        { city: "Dallas", state: "TX" },
    ]

    // Generate deterministic but varied stops
    const seed = (originCity + destCity).split('').reduce((a, c) => a + c.charCodeAt(0), 0)

    for (let i = 0; i < numStops; i++) {
        const chain = chains[(seed + i) % chains.length]
        const cityData = truckStopCities[(seed + i * 3) % truckStopCities.length]
        const milesAlong = Math.round((totalDistance / (numStops + 1)) * (i + 1))

        // Price varies by region ($3.20 - $4.50)
        const basePrice = 3.20 + ((seed + i * 7) % 130) / 100

        // Simple linear interpolation if coordinates exist
        let lat = 0;
        let lon = 0;

        if (startCoords && endCoords) {
            const fraction = (i + 1) / (numStops + 1);
            // Add slight randomness to simulate off-highway locations (+/- 0.05 deg is roughly 3-4 miles)
            const randomOffset = ((seed + i * 13) % 100) / 1000 - 0.05;

            lat = startCoords.lat + (endCoords.lat - startCoords.lat) * fraction + (randomOffset * 0.5);
            lon = startCoords.lon + (endCoords.lon - startCoords.lon) * fraction + randomOffset;
        }

        stops.push({
            id: `stop-${i}`,
            name: `${chain.name} #${1000 + (seed + i) % 9000}`,
            brand: chain.brand,
            address: `${100 + (seed * i) % 9000} Interstate Drive`,
            city: cityData.city,
            state: cityData.state,
            lat: lat,
            lon: lon,
            price: Math.round(basePrice * 100) / 100,
            amenities: chain.amenities,
            distanceFromRoute: (seed + i) % 3, // 0-2 miles off route
            milesAlongRoute: milesAlong,
            hasParking: true,
            hasDiesel: true,
            rating: 3.5 + ((seed + i) % 15) / 10, // 3.5-5.0
            userRatingsTotal: 100 + (seed + i) % 500,
        })
    }

    // Sort by price to highlight cheapest
    return stops.sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
}

// Calculate fuel needed and cost
function calculateFuelNeeds(
    distance: number,
    mpg: number,
    currentFuel: number = 150 // gallons in tank (more realistic starting fuel)
): { gallonsNeeded: number; refillPoints: number[] } {
    const tankCapacity = 300 // typical semi tank capacity
    const refillThreshold = 50 // refill when down to 50 gallons
    const gallonsNeeded = distance / mpg
    const refillPoints: number[] = []

    // If we have enough fuel for the whole trip, no refills needed
    if (currentFuel >= gallonsNeeded) {
        return { gallonsNeeded, refillPoints }
    }

    let fuel = currentFuel
    let milesTraveled = 0
    const milesPerGallon = mpg

    while (milesTraveled < distance) {
        // Calculate how many miles we can travel before hitting refill threshold
        const milesUntilRefill = Math.max(0, (fuel - refillThreshold) * milesPerGallon)

        // Check if we can finish the trip with remaining fuel
        const remainingDistance = distance - milesTraveled
        const fuelNeededForRest = remainingDistance / milesPerGallon

        if (fuel >= fuelNeededForRest) {
            // We can finish without refilling
            break
        }

        if (milesTraveled + milesUntilRefill < distance) {
            milesTraveled += milesUntilRefill
            // Don't add refill point at mile 0
            if (milesTraveled > 0) {
                refillPoints.push(Math.round(milesTraveled))
            }
            fuel = tankCapacity * 0.9 // Fill to 90%
        } else {
            break
        }
    }

    return { gallonsNeeded, refillPoints }
}

interface FuelStopOptimizerProps {
    originCity?: string
    originState?: string
    originLat?: number
    originLon?: number
    destCity?: string
    destState?: string
    destLat?: number
    destLon?: number
    distance: number
    mpg?: number
    fuelPrice?: number
    onSelectStop?: (stop: FuelStop) => void
}

export function FuelStopOptimizer({
    originCity = "Unknown",
    originState = "",
    originLat,
    originLon,
    destCity = "Unknown",
    destState = "",
    destLat,
    destLon,
    distance,
    mpg = 6.5,
    fuelPrice = 3.80,
    onSelectStop
}: FuelStopOptimizerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [fuelStops, setFuelStops] = useState<FuelStop[]>([])
    const [error, setError] = useState<string | null>(null)

    const origin = `${originCity}${originState ? `, ${originState}` : ''}`
    const dest = `${destCity}${destState ? `, ${destState}` : ''}`

    // Fetch real fuel stops when dialog opens (if coordinates available)
    useEffect(() => {
        if (!isOpen) return;

        // If no coordinates, fall back to mock data
        if (!originLat || !originLon || !destLat || !destLon) {
            console.log('[FUEL] No coordinates available, using mock data')
            // Pass whatever we have, even if only partial
            setFuelStops(generateFuelStops(origin, dest, distance))
            return
        }

        // Fetch real data from API
        async function fetchFuelStops() {
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams({
                    originLat: originLat!.toString(),
                    originLon: originLon!.toString(),
                    destLat: destLat!.toString(),
                    destLon: destLon!.toString(),
                    maxStops: '5',
                })

                const response = await fetch(`/api/fuel-stops?${params}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch fuel stops')
                }

                console.log(`[FUEL] Fetched ${data.fuelStops.length} real fuel stops`)

                // Estimate prices if not provided (use fuelPrice prop as baseline)
                const stopsWithPrices = data.fuelStops.map((stop: FuelStop) => ({
                    ...stop,
                    price: stop.price || estimatePriceFromPriceLevel(stop.priceLevel, fuelPrice),
                }))

                // Sort by price (cheapest first)
                const sortedStops = stopsWithPrices.sort((a: FuelStop, b: FuelStop) => {
                    const priceA = a.price || fuelPrice
                    const priceB = b.price || fuelPrice
                    return priceA - priceB
                })

                setFuelStops(sortedStops)
            } catch (err) {
                console.error('[FUEL] Error fetching fuel stops:', err)
                setError(err instanceof Error ? err.message : 'Failed to load fuel stops')

                // Fall back to mock data on error
                // Fall back to mock data on error, passing coordinates for interpolation
                const startCoords = (originLat && originLon) ? { lat: originLat, lon: originLon } : null;
                const endCoords = (destLat && destLon) ? { lat: destLat, lon: destLon } : null;
                setFuelStops(generateFuelStops(origin, dest, distance, startCoords, endCoords))
            } finally {
                setIsLoading(false)
            }
        }

        fetchFuelStops()
    }, [isOpen, originLat, originLon, destLat, destLon, origin, dest, distance, fuelPrice])

    const fuelNeeds = useMemo(() =>
        calculateFuelNeeds(distance, mpg),
        [distance, mpg]
    )

    const cheapestStop = fuelStops[0]
    const potentialSavings = fuelStops.length > 1 && cheapestStop?.price && fuelStops[1]?.price
        ? (((fuelStops[1].price || 0) - (cheapestStop.price || 0)) * fuelNeeds.gallonsNeeded).toFixed(0)
        : 0

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setIsOpen(true)}
            >
                <Fuel className="h-3 w-3" />
                Fuel Stops
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-amber-500" />
                            Fuel Stop Optimizer
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </DialogTitle>
                        <DialogDescription>
                            {origin} → {dest} • {distance} miles
                            {!originLat && !isLoading && (
                                <span className="text-amber-500 text-xs ml-2">
                                    (Using estimated data)
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Error Message */}
                    {error && (
                        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
                            <Info className="h-4 w-4 inline mr-2" />
                            {error}. Showing estimated data instead.
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 py-4 border-b border-border">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Fuel Needed</div>
                            <div className="text-xl font-bold text-amber-500">
                                {Math.round(fuelNeeds.gallonsNeeded)} gal
                            </div>
                            <div className="text-[10px] text-muted-foreground">@ {mpg} MPG</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Recommended Stops</div>
                            <div className="text-xl font-bold text-blue-500">
                                {fuelNeeds.refillPoints.length}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                {fuelNeeds.refillPoints.length === 0 ? 'no refuel needed' : 'refill points'}
                            </div>
                        </div>
                        <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <div className="text-xs text-muted-foreground">Potential Savings</div>
                            <div className="text-xl font-bold text-emerald-500">
                                ${potentialSavings}
                            </div>
                            <div className="text-[10px] text-muted-foreground">choosing cheapest</div>
                        </div>
                    </div>

                    {/* Fuel Stops List */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <span className="ml-3 text-muted-foreground">Finding fuel stops along your route...</span>
                            </div>
                        ) : fuelStops.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                <Fuel className="h-8 w-8 opacity-30" />
                                <span>
                                    {fuelNeeds.refillPoints.length === 0
                                        ? 'This route is short enough that no fuel stop is required.'
                                        : 'No fuel stops found along this route. Try a different path.'}
                                </span>
                            </div>
                        ) : (
                            fuelStops.map((stop, index) => (
                                <div
                                    key={stop.id}
                                    className={cn(
                                        "p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer",
                                        index === 0 && "border-emerald-500/30 bg-emerald-500/5"
                                    )}
                                    onClick={() => onSelectStop?.(stop)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{stop.name}</span>
                                                {index === 0 && (
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                                        <TrendingDown className="h-2 w-2 mr-1" />
                                                        CHEAPEST
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {stop.city}, {stop.state} • {stop.milesAlongRoute} mi from origin
                                                {stop.distanceFromRoute > 0 && (
                                                    <span className="text-amber-500">
                                                        ({stop.distanceFromRoute} mi off route)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {stop.amenities.slice(0, 4).map((amenity) => (
                                                    <Badge key={amenity} variant="secondary" className="text-[10px]">
                                                        {amenity}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "text-lg font-bold",
                                                index === 0 ? "text-emerald-500" : "text-foreground"
                                            )}>
                                                {stop.price ? `$${stop.price.toFixed(2)}` : 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {stop.price ? '/gallon' : 'Price unavailable'}
                                            </div>
                                            {stop.rating > 0 && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                                                    {'★'.repeat(Math.floor(stop.rating))}
                                                    <span className="text-muted-foreground">
                                                        {stop.rating.toFixed(1)}
                                                        {stop.userRatingsTotal && ` (${stop.userRatingsTotal})`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )))}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Prices are estimates. Verify current prices before fueling.
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsOpen(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// Compact badge for showing fuel cost estimate
interface FuelCostBadgeProps {
    distance: number
    mpg?: number
    fuelPrice?: number
    size?: 'sm' | 'md'
}

export function FuelCostBadge({ distance, mpg = 6.5, fuelPrice = 3.80, size = 'sm' }: FuelCostBadgeProps) {
    const fuelCost = (distance / mpg) * fuelPrice

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Badge
                    variant="outline"
                    className={cn(
                        "gap-1 cursor-help border-rose-500/30 text-rose-400 bg-rose-500/10 font-mono",
                        size === 'sm' ? "text-[10px]" : "text-xs"
                    )}
                >
                    <Fuel className="h-3 w-3" />
                    -${Math.round(fuelCost)}
                </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
                <div className="space-y-2 text-xs">
                    <div className="font-semibold">Estimated Fuel Cost</div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance:</span>
                        <span>{distance} mi</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">MPG:</span>
                        <span>{mpg}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fuel Price:</span>
                        <span>${fuelPrice.toFixed(2)}/gal</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border font-semibold">
                        <span>Est. Cost:</span>
                        <span className="text-rose-500">${fuelCost.toFixed(0)}</span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
