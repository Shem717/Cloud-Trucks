'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, Navigation, Crosshair } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface OriginSearchProps {
    value: string;
    onValueChange: (val: string) => void;
    range: number;
    onRangeChange: (val: number) => void;
    orientation?: 'vertical' | 'horizontal';
}

export function OriginSearch({
    value,
    onValueChange,
    range,
    onRangeChange,
    orientation = 'vertical'
}: OriginSearchProps) {
    const [isLocating, setIsLocating] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)

    const handleCurrentLocation = () => {
        setIsLocating(true)
        setGeoError(null)
        if (!navigator.geolocation) {
            setGeoError("Geolocation is not supported")
            setIsLocating(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                // In a real app, we'd reverse geocode here. 
                // For now, we simulate or pass coords if API supported it.
                // Since CloudTrucks expects "City, ST", we might need a reverse geocode API.
                // Fallback: We'll set a special value or try to find a hack.
                // Actually, let's try a free reverse geocode or just show coordinates for now
                // user can verify.
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
                    const data = await res.json()
                    if (data.city && data.principalSubdivisionCode) {
                        onValueChange(`${data.city}, ${data.principalSubdivisionCode}`)
                    } else {
                        onValueChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
                    }
                } catch (e) {
                    onValueChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
                }
                setIsLocating(false)
            },
            (err) => {
                setGeoError(err.message)
                setIsLocating(false)
            }
        )
    }

    return (
        <div className={cn("p-4 w-[300px] space-y-4", orientation === 'horizontal' ? 'w-[500px] grid grid-cols-2 gap-4 space-y-0' : '')}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Origin</label>
                    {isLocating && <span className="text-xs text-primary animate-pulse">Locating...</span>}
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Origin City</label>
                    <CityAutocomplete
                        name="origin_search_input"
                        value={value}
                        onValueChange={onValueChange}
                        placeholder="City or Zip Code"
                        className="w-full bg-secondary/50 border-secondary-foreground/10"
                    />
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 border-dashed"
                    onClick={handleCurrentLocation}
                    disabled={isLocating}
                >
                    <Crosshair className="mr-2 h-3.5 w-3.5" />
                    Use Current Location
                </Button>
                {geoError && <p className="text-[10px] text-destructive">{geoError}</p>}
            </div>

            <Separator className={orientation === 'horizontal' ? 'hidden' : 'block'} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deadhead</label>
                    <Badge variant="secondary" className="font-mono">{range} miles</Badge>
                </div>
                <Slider
                    defaultValue={[range]}
                    max={200}
                    step={10}
                    onValueChange={(vals: number[]) => onRangeChange(vals[0])}
                    className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>0mi</span>
                    <span>150mi</span>
                    <span>300mi</span>
                </div>
            </div>
        </div>
    )
}
