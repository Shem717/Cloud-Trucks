'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    X, Route, Trash2, ArrowRight, DollarSign, Truck,
    GripVertical, MapPin, ChevronRight, ExternalLink, Calculator
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CloudTrucksLoad } from '@/workers/cloudtrucks-api-client'

// Storage key for localStorage
const ROUTE_BUILDER_STORAGE_KEY = 'cloudtrucks-route-builder-loads'

// Load route builder state from localStorage (SSR-safe)
function loadFromStorage(): RouteBuilderLoad[] {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(ROUTE_BUILDER_STORAGE_KEY)
        if (!stored) return []
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : []
    } catch (error) {
        console.error('Failed to load route builder state:', error)
        return []
    }
}

// Save route builder state to localStorage (SSR-safe)
function saveToStorage(loads: RouteBuilderLoad[]): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(ROUTE_BUILDER_STORAGE_KEY, JSON.stringify(loads))
    } catch (error) {
        console.error('Failed to save route builder state:', error)
    }
}

// Types
interface RouteBuilderLoad {
    id: string
    cloudtrucks_load_id: string
    details: CloudTrucksLoad & Record<string, any>
    created_at: string
}

interface RouteBuilderContextType {
    loads: RouteBuilderLoad[]
    addLoad: (load: RouteBuilderLoad) => void
    removeLoad: (id: string) => void
    clearLoads: () => void
    reorderLoads: (fromIndex: number, toIndex: number) => void
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    isLoadInBuilder: (cloudtrucksLoadId: string) => boolean
}

// Context
const RouteBuilderContext = createContext<RouteBuilderContextType | null>(null)

export function useRouteBuilder() {
    const context = useContext(RouteBuilderContext)
    if (!context) {
        throw new Error('useRouteBuilder must be used within a RouteBuilderProvider')
    }
    return context
}

// Provider
export function RouteBuilderProvider({ children }: { children: React.ReactNode }) {
    const [loads, setLoads] = useState<RouteBuilderLoad[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)

    // Load from localStorage on mount (client-side only)
    useEffect(() => {
        const storedLoads = loadFromStorage()
        if (storedLoads.length > 0) {
            setLoads(storedLoads)
        }
        setIsHydrated(true)
    }, [])

    // Save to localStorage whenever loads change (after hydration)
    useEffect(() => {
        if (isHydrated) {
            saveToStorage(loads)
        }
    }, [loads, isHydrated])

    const addLoad = useCallback((load: RouteBuilderLoad) => {
        setLoads(prev => {
            // Don't add duplicates
            if (prev.some(l => l.cloudtrucks_load_id === load.cloudtrucks_load_id)) {
                return prev
            }
            return [...prev, load]
        })
        // Auto-open the sidebar when first load is added
        setIsOpen(true)
    }, [])

    const removeLoad = useCallback((id: string) => {
        setLoads(prev => prev.filter(l => l.id !== id))
    }, [])

    const clearLoads = useCallback(() => {
        setLoads([])
        // Also clear from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem(ROUTE_BUILDER_STORAGE_KEY)
        }
    }, [])

    const reorderLoads = useCallback((fromIndex: number, toIndex: number) => {
        setLoads(prev => {
            const result = [...prev]
            const [removed] = result.splice(fromIndex, 1)
            result.splice(toIndex, 0, removed)
            return result
        })
    }, [])

    const isLoadInBuilder = useCallback((cloudtrucksLoadId: string) => {
        return loads.some(l => l.cloudtrucks_load_id === cloudtrucksLoadId || l.details.id === cloudtrucksLoadId)
    }, [loads])

    const value = useMemo(() => ({
        loads,
        addLoad,
        removeLoad,
        clearLoads,
        reorderLoads,
        isOpen,
        setIsOpen,
        isLoadInBuilder
    }), [loads, addLoad, removeLoad, clearLoads, reorderLoads, isOpen, isLoadInBuilder])

    return (
        <RouteBuilderContext.Provider value={value}>
            {children}
            <RouteBuilderSidebar />
        </RouteBuilderContext.Provider>
    )
}

// Sidebar Component
function RouteBuilderSidebar() {
    const { loads, removeLoad, clearLoads, isOpen, setIsOpen } = useRouteBuilder()

    // Calculate totals
    const totals = useMemo(() => {
        let revenue = 0
        let miles = 0
        let fuelCost = 0
        const mpg = 6.5
        const fuelPrice = 3.80

        loads.forEach(load => {
            // CloudTrucks loads use trip_rate or estimated_rate, not rate
            const rate = load.details.trip_rate || load.details.estimated_rate || 0
            // CloudTrucks loads use trip_distance_mi, not distance
            const dist = load.details.trip_distance_mi || 0

            revenue += Number(rate)
            miles += Number(dist)
            fuelCost += (dist / mpg) * fuelPrice
        })

        const netProfit = revenue - fuelCost
        const rpm = miles > 0 ? revenue / miles : 0
        const netRpm = miles > 0 ? netProfit / miles : 0

        return { revenue, miles, fuelCost, netProfit, rpm, netRpm }
    }, [loads])

    // Build Google Maps multi-stop URL
    const getGoogleMapsUrl = useCallback(() => {
        if (loads.length === 0) return '#'

        const waypoints = loads.flatMap(load => {
            const origin = load.details.origin_city
                ? `${load.details.origin_city}, ${load.details.origin_state}`
                : load.details.origin
            const dest = load.details.dest_city
                ? `${load.details.dest_city}, ${load.details.dest_state}`
                : load.details.destination
            return [origin, dest]
        })

        // Remove duplicate consecutive waypoints
        const uniqueWaypoints = waypoints.filter((wp, i) => i === 0 || wp !== waypoints[i - 1])

        if (uniqueWaypoints.length < 2) return '#'

        const origin = encodeURIComponent(uniqueWaypoints[0])
        const destination = encodeURIComponent(uniqueWaypoints[uniqueWaypoints.length - 1])
        const waypointsStr = uniqueWaypoints.slice(1, -1).map(wp => encodeURIComponent(wp)).join('|')

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
        if (waypointsStr) {
            url += `&waypoints=${waypointsStr}`
        }
        return url
    }, [loads])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed right-0 top-0 h-full z-50 bg-background border-l border-border shadow-2xl",
                            "w-full sm:w-96 lg:w-[420px]"
                        )}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Route className="h-5 w-5 text-primary" />
                                    <h2 className="font-bold text-lg">Route Builder</h2>
                                    <Badge variant="secondary" className="ml-2">
                                        {loads.length} leg{loads.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Loads List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loads.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                        <MapPin className="h-12 w-12 mb-4 opacity-20" />
                                        <p className="font-medium">No loads added yet</p>
                                        <p className="text-sm mt-1">Click the + button on any load card to add it here</p>
                                    </div>
                                ) : (
                                    loads.map((load, index) => {
                                        const origin = load.details.origin_city
                                            ? `${load.details.origin_city}, ${load.details.origin_state}`
                                            : load.details.origin
                                        const dest = load.details.dest_city
                                            ? `${load.details.dest_city}, ${load.details.dest_state}`
                                            : load.details.destination
                                        const rate = Number(load.details.trip_rate || load.details.estimated_rate || 0)
                                        const dist = Number(load.details.trip_distance_mi || 0)

                                        return (
                                            <div key={load.id}>
                                                {/* Connector line */}
                                                {index > 0 && (
                                                    <div className="flex items-center gap-2 py-1 pl-4">
                                                        <div className="w-px h-4 bg-border" />
                                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                )}

                                                {/* Load Card */}
                                                <div className="relative bg-card border border-border rounded-lg p-3 group">
                                                    {/* Leg Number */}
                                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                                        {index + 1}
                                                    </div>

                                                    {/* Drag Handle */}
                                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="pl-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-lg font-bold text-emerald-500">
                                                                ${rate.toLocaleString()}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                                onClick={() => removeLoad(load.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3 text-destructive" />
                                                            </Button>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            <span className="truncate">{origin}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm mt-1">
                                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                            <span className="truncate">{dest}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Truck className="h-3 w-3" />
                                                                {dist} mi
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <DollarSign className="h-3 w-3" />
                                                                ${(rate / dist).toFixed(2)}/mi
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Totals & Actions */}
                            {loads.length > 0 && (
                                <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                                    {/* Trip Totals */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                            <Calculator className="h-3 w-3" />
                                            Trip Totals
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-card rounded-lg p-3 border border-border">
                                                <div className="text-xs text-muted-foreground">Revenue</div>
                                                <div className="text-xl font-bold text-emerald-500">
                                                    ${totals.revenue.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="bg-card rounded-lg p-3 border border-border">
                                                <div className="text-xs text-muted-foreground">Net Profit</div>
                                                <div className="text-xl font-bold text-emerald-400">
                                                    ${Math.round(totals.netProfit).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="bg-card rounded-lg p-3 border border-border">
                                                <div className="text-xs text-muted-foreground">Total Miles</div>
                                                <div className="text-xl font-bold">
                                                    {totals.miles.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="bg-card rounded-lg p-3 border border-border">
                                                <div className="text-xs text-muted-foreground">Net RPM</div>
                                                <div className="text-xl font-bold text-emerald-400">
                                                    ${totals.netRpm.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                                            <span>Est. Fuel Cost</span>
                                            <span className="text-rose-400">-${Math.round(totals.fuelCost).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={clearLoads}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Clear
                                        </Button>
                                        <Button
                                            className="flex-1 bg-primary"
                                            asChild
                                        >
                                            <a
                                                href={getGoogleMapsUrl()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View in Maps
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// Floating Toggle Button (shown when sidebar is closed but has loads)
export function RouteBuilderToggle() {
    const { loads, isOpen, setIsOpen } = useRouteBuilder()

    if (isOpen || loads.length === 0) return null

    return (
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
                "fixed bottom-6 left-6 z-40 h-14 px-4 rounded-full",
                "bg-primary text-primary-foreground shadow-2xl",
                "flex items-center gap-2 font-medium",
                "hover:bg-primary/90 transition-colors"
            )}
            onClick={() => setIsOpen(true)}
        >
            <Route className="h-5 w-5" />
            <span>Route ({loads.length})</span>
        </motion.button>
    )
}
