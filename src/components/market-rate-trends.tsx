'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    ArrowRight,
    MapPin,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CloudTrucksLoad } from '@/workers/cloudtrucks-api-client'

interface SavedLoad {
    id: string
    details: CloudTrucksLoad & Record<string, any>
    created_at: string
    status?: string
    cloudtrucks_load_id?: string
}

interface LaneTrend {
    lane: string
    originCity: string
    originState: string
    destCity: string
    destState: string
    currentAvgRate: number
    currentAvgRpm: number
    loadCount: number
    trend: 'up' | 'down' | 'stable'
    trendPercent: number
    highRate: number
    lowRate: number
}

// Analyze loads to generate market trends
function analyzeMarketTrends(loads: SavedLoad[]): LaneTrend[] {
    // Group loads by lane
    const laneData = new Map<string, {
        loads: SavedLoad[]
        originCity: string
        originState: string
        destCity: string
        destState: string
    }>()

    loads.forEach(load => {
        const d = load.details
        if (!d.origin_city || !d.dest_city) return

        const lane = `${d.origin_city}, ${d.origin_state} → ${d.dest_city}, ${d.dest_state}`

        if (!laneData.has(lane)) {
            laneData.set(lane, {
                loads: [],
                originCity: d.origin_city,
                originState: d.origin_state,
                destCity: d.dest_city,
                destState: d.dest_state
            })
        }

        laneData.get(lane)!.loads.push(load)
    })

    // Calculate trends for each lane
    const trends: LaneTrend[] = []

    laneData.forEach((data, lane) => {
        if (data.loads.length < 2) return // Need at least 2 loads for a trend

        // Sort by created_at
        const sorted = [...data.loads].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        // Calculate rates
        const rates = sorted.map(l => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
            return rate || 0
        }).filter(r => r > 0)

        if (rates.length < 2) return

        // Calculate RPMs
        const rpms = sorted.map(l => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
            const dist = typeof l.details.distance === 'string' ? parseFloat(l.details.distance) : l.details.distance
            return rate && dist ? rate / dist : 0
        }).filter(r => r > 0)

        const currentAvgRate = rates.reduce((a, b) => a + b, 0) / rates.length
        const currentAvgRpm = rpms.length > 0 ? rpms.reduce((a, b) => a + b, 0) / rpms.length : 0

        // Simple trend: compare first half avg to second half avg
        const halfPoint = Math.floor(rates.length / 2)
        const firstHalfAvg = rates.slice(0, halfPoint).reduce((a, b) => a + b, 0) / halfPoint
        const secondHalfAvg = rates.slice(halfPoint).reduce((a, b) => a + b, 0) / (rates.length - halfPoint)

        const trendPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (trendPercent > 5) trend = 'up'
        else if (trendPercent < -5) trend = 'down'

        trends.push({
            lane,
            originCity: data.originCity,
            originState: data.originState,
            destCity: data.destCity,
            destState: data.destState,
            currentAvgRate,
            currentAvgRpm,
            loadCount: data.loads.length,
            trend,
            trendPercent: Math.abs(trendPercent),
            highRate: Math.max(...rates),
            lowRate: Math.min(...rates)
        })
    })

    // Sort by load count (most active lanes first)
    return trends.sort((a, b) => b.loadCount - a.loadCount).slice(0, 10)
}

// Generate mock historical data for visualization
function generateSparklineData(trend: 'up' | 'down' | 'stable', points: number = 7): number[] {
    const data: number[] = []
    let value = 50

    for (let i = 0; i < points; i++) {
        const noise = (Math.random() - 0.5) * 10
        if (trend === 'up') {
            value += 3 + noise
        } else if (trend === 'down') {
            value -= 3 + noise
        } else {
            value += noise
        }
        data.push(Math.max(20, Math.min(80, value)))
    }

    return data
}

// Mini sparkline component
function Sparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'stable' }) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 60
        const y = 20 - ((v - min) / range) * 16
        return `${x},${y}`
    }).join(' ')

    const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'

    return (
        <svg width="60" height="24" className="inline-block">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

interface MarketRateTrendsProps {
    loads: SavedLoad[]
    className?: string
}

export function MarketRateTrends({ loads, className }: MarketRateTrendsProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const trends = useMemo(() => analyzeMarketTrends(loads), [loads])

    if (trends.length === 0) {
        return null
    }

    const topTrends = trends.slice(0, 3)

    return (
        <Card className={cn("p-4", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">Market Rate Trends</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
                    View All
                </Button>
            </div>

            {/* Top 3 Lanes Preview */}
            <div className="space-y-3">
                {topTrends.map((trend) => (
                    <LaneTrendCard key={trend.lane} trend={trend} compact />
                ))}
            </div>

            {/* Expanded View */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Market Rate Trends
                        </DialogTitle>
                        <DialogDescription>
                            Rate trends across your monitored lanes based on recent load data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-3 py-4">
                        {trends.map((trend) => (
                            <LaneTrendCard key={trend.lane} trend={trend} />
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        Trends are calculated from your scanned loads. More data = more accurate trends.
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

// Individual lane trend card
function LaneTrendCard({ trend, compact = false }: { trend: LaneTrend; compact?: boolean }) {
    const sparklineData = useMemo(() => generateSparklineData(trend.trend), [trend.trend])

    const TrendIcon = trend.trend === 'up' ? TrendingUp : trend.trend === 'down' ? TrendingDown : Minus
    const trendColor = trend.trend === 'up' ? 'text-emerald-500' : trend.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
    const trendBg = trend.trend === 'up' ? 'bg-emerald-500/10' : trend.trend === 'down' ? 'bg-rose-500/10' : 'bg-muted/50'

    if (compact) {
        return (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">
                        {trend.originCity} → {trend.destCity}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Sparkline data={sparklineData} trend={trend.trend} />
                    <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                        <TrendIcon className="h-3 w-3" />
                        {trend.trendPercent.toFixed(0)}%
                    </div>
                    <span className="text-xs font-bold text-emerald-500">
                        ${Math.round(trend.currentAvgRate).toLocaleString()}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        {trend.originCity}, {trend.originState}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {trend.destCity}, {trend.destState}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{trend.loadCount} loads</span>
                        <span>Avg: ${Math.round(trend.currentAvgRate).toLocaleString()}</span>
                        <span>${trend.currentAvgRpm.toFixed(2)}/mi</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium", trendBg, trendColor)}>
                        <TrendIcon className="h-3 w-3" />
                        {trend.trend === 'up' ? '+' : trend.trend === 'down' ? '-' : ''}{trend.trendPercent.toFixed(1)}%
                    </div>
                    <Sparkline data={sparklineData} trend={trend.trend} />
                </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
                <div>
                    <span className="text-muted-foreground">High: </span>
                    <span className="font-medium text-emerald-500">${trend.highRate.toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Low: </span>
                    <span className="font-medium">${trend.lowRate.toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Spread: </span>
                    <span className="font-medium">${(trend.highRate - trend.lowRate).toLocaleString()}</span>
                </div>
            </div>
        </div>
    )
}

// Compact badge for quick trend indicator
interface TrendBadgeProps {
    trend: 'up' | 'down' | 'stable'
    percent: number
    size?: 'sm' | 'md'
}

export function TrendBadge({ trend, percent, size = 'sm' }: TrendBadgeProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
    const styles = {
        up: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        down: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        stable: "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 font-mono",
                styles[trend],
                size === 'sm' ? "text-[10px]" : "text-xs"
            )}
        >
            <TrendIcon className={size === 'sm' ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{percent.toFixed(0)}%
        </Badge>
    )
}
