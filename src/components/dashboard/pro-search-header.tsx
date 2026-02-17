'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Map as MapIcon, Layers, Calendar, Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { OriginSearch } from "./search-modules/origin-search"
import { DestinationSearch } from "./search-modules/destination-search"
import { DateSearch } from "./search-modules/date-search"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProSearchHeaderProps {
    onSuccess?: () => void;
}

// "Ghost" input styles for the capsule
const ghostInputStyles = "bg-transparent border-none h-full text-xs focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 transition-all font-medium text-foreground px-0"

export function ProSearchHeader({ onSuccess }: ProSearchHeaderProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mode, setMode] = useState<'standard' | 'multi' | 'map'>('standard')

    // Search State
    const [originCity, setOriginCity] = useState("")
    const [originRadius, setOriginRadius] = useState(0)

    const [destType, setDestType] = useState<'city' | 'states' | 'regions'>('city')
    const [destCity, setDestCity] = useState("")
    const [destStates, setDestStates] = useState<string[]>([])

    const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
    const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)

        setIsSubmitting(true)

        // Hydrate FormData with custom state
        if (originCity) formData.set('origin_city', originCity)
        if (originRadius > 0) formData.set('pickup_distance', originRadius.toString())

        if (destType === 'city' && destCity) {
            formData.set('dest_city', destCity)
        } else if (destType === 'states' && destStates.length > 0) {
            formData.delete('destination_states') // Clear if any
            destStates.forEach(st => formData.append('destination_states', st))
        }

        if (dateMode === 'single' && pickupDate) {
            formData.set('pickup_date', format(pickupDate, 'yyyy-MM-dd'))
        } else if (dateMode === 'range' && dateRange?.from) {
            formData.set('pickup_date', format(dateRange.from, 'yyyy-MM-dd'))
            if (dateRange.to) formData.set('pickup_date_end', format(dateRange.to, 'yyyy-MM-dd'))
        }

        try {
            const response = await fetch('/api/criteria', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.criteria) {
                try {
                    await fetch('/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ criteriaId: result.criteria.id })
                    })
                } catch (e) { console.error(e) }

                onSuccess?.()
                // Reset form state
                setOriginCity("")
                setOriginRadius(0)
                setDestCity("")
                setDestStates([])
                setPickupDate(undefined)
                setDateRange(undefined)
            }
        } catch (error) {
            console.error('Failed to add criteria:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-2 pb-0 bg-transparent">
            {/* Minimal Tab Switcher */}
            <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center p-0.5 bg-card/30 backdrop-blur-md rounded-lg border border-white/5 w-fit">
                    <button
                        onClick={() => setMode('standard')}
                        className={cn("px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all", mode === 'standard' ? "bg-primary/20 text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-white")}
                    >
                        Standard
                    </button>
                    <button
                        onClick={() => setMode('multi')}
                        className={cn("px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5", mode === 'multi' ? "bg-primary/20 text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-white")}
                    >
                        <Layers className="h-3 w-3" /> Multi-Trip
                    </button>
                    <button
                        onClick={() => setMode('map')}
                        className={cn("px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5", mode === 'map' ? "bg-primary/20 text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-white")}
                    >
                        <MapIcon className="h-3 w-3" /> Map
                    </button>
                </div>
            </div>

            {/* The "Command Bar" - Single Line */}
            <form onSubmit={handleSubmit} className="w-full">
                <div className="flex items-center h-10 bg-card/40 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg overflow-visible transition-all hover:border-white/20 relative z-20">

                    {/* Origin Section - Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex-[1.5] flex items-center px-3 border-r border-white/5 h-full hover:bg-white/5 transition-colors group/input text-left focus:outline-none">
                                <span className="text-[9px] font-bold text-muted-foreground mr-2 shrink-0 group-hover/input:text-white transition-colors">FROM</span>
                                <div className="flex flex-col justify-center h-full w-full overflow-hidden">
                                    <span className={cn("text-xs font-medium truncate", !originCity ? "text-muted-foreground/50" : "text-foreground")}>
                                        {originCity || "City or State"}
                                    </span>
                                    {originRadius > 0 && <span className="text-[9px] text-muted-foreground leading-none">{originRadius}mi radius</span>}
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto bg-card/95 backdrop-blur-xl border-white/10" align="start">
                            <OriginSearch
                                value={originCity}
                                onValueChange={setOriginCity}
                                range={originRadius}
                                onRangeChange={setOriginRadius}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Destination Section - Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex-[1.5] flex items-center px-3 border-r border-white/5 h-full hover:bg-white/5 transition-colors group/input text-left focus:outline-none">
                                <span className="text-[9px] font-bold text-muted-foreground mr-2 shrink-0 group-hover/input:text-white transition-colors">TO</span>
                                <div className="flex flex-col justify-center h-full w-full overflow-hidden">
                                    {destType === 'city' ? (
                                        <span className={cn("text-xs font-medium truncate", !destCity ? "text-muted-foreground/50" : "text-foreground")}>
                                            {destCity || "Anywhere"}
                                        </span>
                                    ) : (
                                        <span className={cn("text-xs font-medium truncate", destStates.length === 0 ? "text-muted-foreground/50" : "text-foreground")}>
                                            {destStates.length === 0 ? "Select States" : `${destStates.length} States Selected`}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto bg-card/95 backdrop-blur-xl border-white/10" align="start">
                            <DestinationSearch
                                type={destType}
                                onTypeChange={setDestType}
                                cityValue={destCity}
                                onCityChange={setDestCity}
                                statesValue={destStates}
                                onStatesChange={setDestStates}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Date Section - Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex-1 flex items-center px-3 border-r border-white/5 h-full hover:bg-white/5 transition-colors min-w-[140px] group/input text-left focus:outline-none">
                                <Calendar className="h-3 w-3 text-muted-foreground mr-2 group-hover/input:text-primary transition-colors shrink-0" />
                                <div className="flex flex-col justify-center h-full w-full overflow-hidden">
                                    {dateMode === 'single' ? (
                                        <span className={cn("text-xs font-medium truncate", !pickupDate ? "text-muted-foreground/50" : "text-foreground")}>
                                            {pickupDate ? format(pickupDate, 'MMM dd, yyyy') : "Pickup Date"}
                                        </span>
                                    ) : (
                                        <span className={cn("text-xs font-medium truncate", !dateRange?.from ? "text-muted-foreground/50" : "text-foreground")}>
                                            {dateRange?.from ? (
                                                <>
                                                    {format(dateRange.from, 'MMM dd')} - {dateRange.to ? format(dateRange.to, 'MMM dd') : '...'}
                                                </>
                                            ) : "Select Range"}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto bg-card/95 backdrop-blur-xl border-white/10" align="start">
                            <DateSearch
                                date={pickupDate}
                                setDate={setPickupDate}
                                range={dateRange}
                                setRange={setDateRange}
                                mode={dateMode}
                                onModeChange={setDateMode}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Equipment Section */}
                    <div className="flex-1 flex items-center px-3 border-r border-white/5 h-full hover:bg-white/5 transition-colors min-w-[150px] group/input">
                        <Select name="equipment_type" defaultValue="Any">
                            <SelectTrigger className="bg-transparent border-none h-full p-0 text-xs font-medium focus:ring-0 w-full shadow-none gap-2">
                                <span className="text-[9px] font-bold text-muted-foreground mr-1 group-hover/input:text-white transition-colors">EQ</span>
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Any">Any Type</SelectItem>
                                <SelectItem value="Dry Van">Dry Van</SelectItem>
                                <SelectItem value="Reefer">Reefer</SelectItem>
                                <SelectItem value="Power Only">Power Only</SelectItem>
                                <SelectItem value="Flatbed">Flatbed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Booking Type Section */}
                    <div className="flex-1 flex items-center px-3 h-full hover:bg-white/5 transition-colors min-w-[150px] group/input">
                        <Select name="booking_type" defaultValue="Any">
                            <SelectTrigger className="bg-transparent border-none h-full p-0 text-xs font-medium focus:ring-0 w-full shadow-none gap-2">
                                <span className="text-[9px] font-bold text-muted-foreground mr-1 group-hover/input:text-white transition-colors">BK</span>
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Any">Any Method</SelectItem>
                                <SelectItem value="instant">Instant Book</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-full px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold tracking-widest transition-all border-l border-white/5 flex items-center gap-2 hover:px-6"
                    >
                        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        SEARCH
                    </button>

                </div>
            </form>
        </div>
    )
}
