'use client'

import React, { useState, useMemo } from 'react'
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
import { Fuel, MapPin, DollarSign, TrendingDown, Navigation, ExternalLink, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fuel stop data structure
interface FuelStop {
    id: string
    name: string
    brand: string
    address: string
    city: string
    state: string
    price: number // per gallon
    amenities: string[]
    distanceFromRoute: number // miles off route
    milesAlongRoute: number // miles from origin
    hasParking: boolean
    hasDiesel: boolean
    rating: number // 1-5
}

// Generate mock fuel stops along a route
function generateFuelStops(
    originCity: string,
    destCity: string,
    totalDistance: number
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

        stops.push({
            id: `stop-${i}`,
            name: `${chain.name} #${1000 + (seed + i) % 9000}`,
            brand: chain.brand,
            address: `${100 + (seed * i) % 9000} Interstate Drive`,
            city: cityData.city,
            state: cityData.state,
            price: Math.round(basePrice * 100) / 100,
            amenities: chain.amenities,
            distanceFromRoute: (seed + i) % 3, // 0-2 miles off route
            milesAlongRoute: milesAlong,
            hasParking: true,
            hasDiesel: true,
            rating: 3.5 + ((seed + i) % 15) / 10, // 3.5-5.0
        })
    }

    // Sort by price to highlight cheapest
    return stops.sort((a, b) => a.price - b.price)
}

// Calculate fuel needed and cost
function calculateFuelNeeds(
    distance: number,
    mpg: number,
    currentFuel: number = 50 // gallons in tank
): { gallonsNeeded: number; refillPoints: number[] } {
    const tankCapacity = 300 // typical semi tank capacity
    const refillThreshold = 50 // refill when down to 50 gallons
    const gallonsNeeded = distance / mpg
    const refillPoints: number[] = []

    let fuel = currentFuel
    let milesTraveled = 0
    const milesPerGallon = mpg

    while (milesTraveled < distance) {
        const milesUntilRefill = (fuel - refillThreshold) * milesPerGallon
        if (milesTraveled + milesUntilRefill < distance) {
            milesTraveled += milesUntilRefill
            refillPoints.push(Math.round(milesTraveled))
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
    destCity?: string
    destState?: string
    distance: number
    mpg?: number
    onSelectStop?: (stop: FuelStop) => void
}

export function FuelStopOptimizer({
    originCity = "Unknown",
    originState = "",
    destCity = "Unknown",
    destState = "",
    distance,
    mpg = 6.5,
    onSelectStop
}: FuelStopOptimizerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const origin = `${originCity}${originState ? `, ${originState}` : ''}`
    const dest = `${destCity}${destState ? `, ${destState}` : ''}`

    const fuelStops = useMemo(() =>
        generateFuelStops(origin, dest, distance),
        [origin, dest, distance]
    )

    const fuelNeeds = useMemo(() =>
        calculateFuelNeeds(distance, mpg),
        [distance, mpg]
    )

    const cheapestStop = fuelStops[0]
    const potentialSavings = fuelStops.length > 1
        ? ((fuelStops[fuelStops.length - 1].price - cheapestStop.price) * fuelNeeds.gallonsNeeded).toFixed(0)
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
                        </DialogTitle>
                        <DialogDescription>
                            {origin} → {dest} • {distance} miles
                        </DialogDescription>
                    </DialogHeader>

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
                                {fuelNeeds.refillPoints.length || 1}
                            </div>
                            <div className="text-[10px] text-muted-foreground">refill points</div>
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
                        {fuelStops.map((stop, index) => (
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
                                            ${stop.price.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">/gallon</div>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                                            {'★'.repeat(Math.floor(stop.rating))}
                                            <span className="text-muted-foreground">{stop.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
