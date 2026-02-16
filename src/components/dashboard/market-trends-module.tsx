'use client'

import React, { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Load {
    details: {
        trip_rate?: number | string
        rate?: number | string
        trip_distance_mi?: number | string
        distance?: number | string
    }
}

interface MarketTrendsModuleProps {
    loads?: Load[]
}

export function MarketTrendsModule({ loads = [] }: MarketTrendsModuleProps) {
    const metrics = useMemo(() => {
        if (loads.length === 0) {
            return { avgRpm: 0, totalLoads: 0 }
        }

        let totalRpm = 0
        let rpmCount = 0

        for (const load of loads) {
            const rate = parseFloat(String(load.details.trip_rate || load.details.rate || 0))
            const distance = parseFloat(String(load.details.trip_distance_mi || load.details.distance || 0))

            if (rate > 0 && distance > 0) {
                totalRpm += rate / distance
                rpmCount++
            }
        }

        return {
            avgRpm: rpmCount > 0 ? totalRpm / rpmCount : 0,
            totalLoads: loads.length,
        }
    }, [loads])

    return (
        <div className="flex flex-col h-full bg-transparent text-foreground p-2">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    MARKET PULSE
                </h3>
                <Link href="/market" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    Details <ExternalLink className="h-2.5 w-2.5" />
                </Link>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">

                {/* Main Rate Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-xl border border-white/5 p-4 relative overflow-hidden group hover:border-primary/20 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Rate / Mile</span>
                            <span className="text-3xl font-bold tracking-tight text-white">
                                {metrics.avgRpm > 0
                                    ? `$${metrics.avgRpm.toFixed(2)}`
                                    : '$—'}
                                <span className="text-sm font-normal text-muted-foreground/80">/mi</span>
                            </span>
                        </div>
                        {metrics.avgRpm > 0 && (
                            <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-bold">
                                Spot
                            </div>
                        )}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1 relative z-10">From current search results</div>
                </div>

                {/* Secondary Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">

                    {/* Volume Card */}
                    <div className="bg-card/40 backdrop-blur-md rounded-xl border border-white/5 p-3 flex flex-col justify-between hover:bg-white/5 transition-colors">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Load Volume</span>
                        <div className="mt-2">
                            <span className="text-lg font-bold text-white">
                                {metrics.totalLoads >= 1000
                                    ? `${(metrics.totalLoads / 1000).toFixed(1)}k`
                                    : metrics.totalLoads}
                            </span>
                        </div>
                    </div>

                    {/* Capacity Card */}
                    <div className="bg-card/40 backdrop-blur-md rounded-xl border border-white/5 p-3 flex flex-col justify-between hover:bg-white/5 transition-colors">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Capacity</span>
                        <div className="mt-2 text-white">
                            <span className="text-lg font-bold">
                                {metrics.avgRpm === 0 ? '—' : metrics.avgRpm >= 2.5 ? 'Tight' : metrics.avgRpm >= 2.0 ? 'Balanced' : 'Loose'}
                            </span>
                            {metrics.avgRpm > 0 && (
                                <div className={`w-2 h-2 rounded-full inline-block ml-2 mb-0.5 ${
                                    metrics.avgRpm >= 2.5 ? 'bg-orange-500' : metrics.avgRpm >= 2.0 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                            )}
                        </div>
                    </div>
                </div>

                {/* View Full Market Link */}
                <Link
                    href="/market"
                    className="block bg-card/40 backdrop-blur-md rounded-xl border border-white/5 p-3 text-center text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
                >
                    View Full Market Data →
                </Link>

            </div>
        </div>
    )
}
