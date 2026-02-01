'use client'

import { useState } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronUp, Loader2, RefreshCw, MapPin, DollarSign, Navigation } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SuggestedBackhaul } from '@/app/api/backhauls/route'
import { useRouteBuilder } from '@/components/route-builder'

interface BackhaulBadgeProps {
    suggestion: SuggestedBackhaul | null;
    loadId: string;
    cloudtrucksLoadId: string;
    loadDetails: Record<string, unknown>;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    className?: string;
}

export function BackhaulBadge({
    suggestion,
    loadId,
    cloudtrucksLoadId,
    loadDetails,
    onRefresh,
    isRefreshing,
    className
}: BackhaulBadgeProps) {
    const { addLoad } = useRouteBuilder()
    const [expanded, setExpanded] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSearch = async () => {
        if (loading) return
        setLoading(true)
        try {
            const response = await fetch('/api/backhauls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    saved_load_id: loadId,
                    cloudtrucks_load_id: cloudtrucksLoadId,
                    details: loadDetails,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to search backhauls')
            }

            onRefresh?.()
        } catch (error) {
            console.error('Error searching backhauls:', error)
        } finally {
            setLoading(false)
        }
    }

    // No suggestion yet
    if (!suggestion) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={loading}
                className={cn(
                    "h-7 text-xs border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300",
                    className
                )}
            >
                {loading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                )}
                Find Backhaul
            </Button>
        )
    }

    // Searching
    if (suggestion.status === 'searching' || suggestion.status === 'pending') {
        return (
            <Badge variant="outline" className={cn("border-blue-500/50 bg-blue-500/10 text-blue-300", className)}>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Searching...
            </Badge>
        )
    }

    // No preferences configured
    if (suggestion.status === 'no_preferences') {
        return (
            <Badge variant="outline" className={cn("border-amber-500/50 bg-amber-500/10 text-amber-300", className)}>
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                Set preferred states
            </Badge>
        )
    }

    // No results
    if (suggestion.status === 'no_results' || suggestion.loads_found === 0) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-400">
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    No backhauls
                </Badge>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearch}
                    disabled={loading || isRefreshing}
                    className="h-6 w-6 p-0 hover:bg-slate-700"
                >
                    {loading || isRefreshing ? (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    ) : (
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                    )}
                </Button>
            </div>
        )
    }

    // Has results
    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="text-xs font-semibold">{suggestion.loads_found} Backhaul{suggestion.loads_found !== 1 ? 's' : ''}</span>
                    {suggestion.best_rpm && (
                        <span className="text-xs opacity-75">
                            ${suggestion.best_rpm.toFixed(2)}/mi
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                        <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                </button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearch}
                    disabled={loading || isRefreshing}
                    className="h-6 w-6 p-0 hover:bg-slate-700"
                    title="Refresh backhaul search"
                >
                    {loading || isRefreshing ? (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    ) : (
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                    )}
                </Button>
            </div>

            {/* Expanded list - Scrollable container for up to ~50 items */}
            {expanded && suggestion.top_loads && suggestion.top_loads.length > 0 && (
                <div className="mt-2 pl-2 border-l-2 border-emerald-500/30 space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {suggestion.top_loads.map((load, idx) => (
                        <div
                            key={load.id || idx}
                            className="group p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/80 hover:border-emerald-500/50 transition-all cursor-default"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {load.origin_city}, {load.origin_state}
                                    </div>
                                    <Navigation className="h-3 w-3 text-slate-500" />
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        {load.dest_city}, {load.dest_state}
                                    </div>
                                </div>
                                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] px-1.5 h-5">
                                    ${load.rpm}/mi
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3 text-slate-400" />
                                        <span className="text-slate-300 font-medium">
                                            {typeof load.rate === 'number' ? load.rate.toLocaleString() : load.rate}
                                        </span>
                                    </span>
                                    <span className="w-px h-3 bg-slate-700"></span>
                                    <span>{load.distance} mi</span>
                                    {load.equipment && (
                                        <>
                                            <span className="w-px h-3 bg-slate-700"></span>
                                            <span>{Array.isArray(load.equipment) ? load.equipment[0] : load.equipment}</span>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => addLoad({
                                        id: load.id,
                                        cloudtrucks_load_id: load.id,
                                        details: {
                                            ...load,
                                            // Map backhaul properties to CloudTrucks format
                                            trip_rate: load.rate,
                                            trip_distance_mi: load.distance
                                        } as any,
                                        created_at: new Date().toISOString()
                                    })}
                                    className="inline-flex text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                                >
                                    Plan Route <ArrowLeftRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
