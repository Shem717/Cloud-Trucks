'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
    MapPin,
    RefreshCw,
    Flame,
    BarChart3,
    Info,
    ExternalLink,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketRegion {
    region_id: string
    region_name: string
    state?: string
    load_count: number
    avg_rate_per_mile: number
    avg_rate: number
    demand_level: 'low' | 'medium' | 'high' | 'very_high'
    trend: 'up' | 'down' | 'stable'
    trend_percent: number
}

interface MarketInsightsData {
    equipment_type: string
    distance_type: string
    last_updated: string
    regions: MarketRegion[]
    national_avg_rpm: number
    total_loads: number
}

interface MarketInsightsProps {
    className?: string
}

export function MarketInsights({ className }: MarketInsightsProps) {
    const [data, setData] = useState<MarketInsightsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [equipmentType, setEquipmentType] = useState('DRY_VAN')
    const [distanceType, setDistanceType] = useState('Long')
    const [apiNotAvailable, setApiNotAvailable] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/market-insights?equipment=${equipmentType}&distance=${distanceType}`)
            const json = await res.json()

            if (!res.ok) {
                if (json.fallback) {
                    setApiNotAvailable(true)
                    setError(json.message || 'Market insights API not available')
                } else {
                    setError(json.error || 'Failed to fetch market insights')
                }
                return
            }

            setData(json)
            setApiNotAvailable(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch')
        } finally {
            setLoading(false)
        }
    }, [equipmentType, distanceType])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const getDemandColor = (level: MarketRegion['demand_level']) => {
        switch (level) {
            case 'very_high': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        }
    }

    const getDemandLabel = (level: MarketRegion['demand_level']) => {
        switch (level) {
            case 'very_high': return 'Very High'
            case 'high': return 'High'
            case 'medium': return 'Medium'
            case 'low': return 'Low'
        }
    }

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />
        if (trend === 'down') return <TrendingDown className="h-3 w-3 text-rose-500" />
        return <Minus className="h-3 w-3 text-muted-foreground" />
    }

    // Show fallback UI when API is not available
    if (apiNotAvailable) {
        return (
            <Card className={cn("p-4", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">CloudTrucks Market Insights</h3>
                </div>
                <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-amber-500/50" />
                    <p className="text-sm text-muted-foreground mb-2">
                        Market insights from CloudTrucks is not yet available via API.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        View the heat map directly on CloudTrucks for now.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open('https://app.cloudtrucks.com/market-conditions/', '_blank')}
                    >
                        <ExternalLink className="h-3 w-3" />
                        Open CloudTrucks Market
                    </Button>
                </div>
            </Card>
        )
    }

    if (loading && !data) {
        return (
            <Card className={cn("p-4", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">CloudTrucks Market Insights</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading market data...</span>
                </div>
            </Card>
        )
    }

    if (error && !data) {
        // Check if it's a credentials error
        const isCredentialsError = error.includes('credentials') || error.includes('not configured')

        return (
            <Card className={cn("p-4", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">CloudTrucks Market Insights</h3>
                </div>
                <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-amber-500/50" />
                    {isCredentialsError ? (
                        <>
                            <p className="text-sm text-muted-foreground mb-2">
                                CloudTrucks credentials not configured. Contact your administrator to set up API access.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-2">{error}</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={fetchData}>
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                        </>
                    )}
                </div>
            </Card>
        )
    }

    if (!data || data.regions.length === 0) {
        return (
            <Card className={cn("p-4", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">CloudTrucks Market Insights</h3>
                </div>
                <div className="text-center py-6 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No market data available</p>
                </div>
            </Card>
        )
    }

    // Sort regions by demand (hottest first)
    const sortedRegions = [...data.regions].sort((a, b) => {
        const demandOrder = { very_high: 4, high: 3, medium: 2, low: 1 }
        return demandOrder[b.demand_level] - demandOrder[a.demand_level]
    })

    const topRegions = sortedRegions.slice(0, 5)
    const hotMarkets = sortedRegions.filter(r => r.demand_level === 'very_high' || r.demand_level === 'high')

    return (
        <Card className={cn("p-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-sm">CloudTrucks Market Insights</h3>
                    {hotMarkets.length > 0 && (
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1 text-[10px]">
                            <Flame className="h-2.5 w-2.5" />
                            {hotMarkets.length} Hot
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-7 w-7 p-0"
                    >
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
                        View All
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase">Nat'l Avg RPM</div>
                    <div className="font-bold text-emerald-500">${data.national_avg_rpm.toFixed(2)}</div>
                </div>
                <div className="text-center border-x border-border/50">
                    <div className="text-[10px] text-muted-foreground uppercase">Total Loads</div>
                    <div className="font-bold">{data.total_loads.toLocaleString()}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase">Hot Markets</div>
                    <div className="font-bold text-orange-500">{hotMarkets.length}</div>
                </div>
            </div>

            {/* Top Regions Preview */}
            <div className="space-y-2">
                {topRegions.map((region) => (
                    <div
                        key={region.region_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium truncate">
                                {region.region_name}{region.state && `, ${region.state}`}
                            </span>
                            <Badge variant="outline" className={cn("text-[9px] shrink-0", getDemandColor(region.demand_level))}>
                                {getDemandLabel(region.demand_level)}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1">
                                <TrendIcon trend={region.trend} />
                                <span className="text-[10px] text-muted-foreground">
                                    {region.trend_percent > 0 ? '+' : ''}{region.trend_percent.toFixed(0)}%
                                </span>
                            </div>
                            <span className="text-xs font-bold text-emerald-500">
                                ${region.avg_rate_per_mile.toFixed(2)}/mi
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Last Updated */}
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Updated {new Date(data.last_updated).toLocaleString()}
            </p>

            {/* Expanded View Dialog */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            CloudTrucks Market Insights
                        </DialogTitle>
                        <DialogDescription>
                            Real-time market conditions and demand levels from CloudTrucks.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Filters */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Equipment:</span>
                            <Select value={equipmentType} onValueChange={setEquipmentType}>
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRY_VAN">Dry Van</SelectItem>
                                    <SelectItem value="POWER_ONLY">Power Only</SelectItem>
                                    <SelectItem value="REEFER">Reefer</SelectItem>
                                    <SelectItem value="FLATBED">Flatbed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Distance:</span>
                            <Select value={distanceType} onValueChange={setDistanceType}>
                                <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Local">Local (&lt;100 mi)</SelectItem>
                                    <SelectItem value="Short">Short (100-250 mi)</SelectItem>
                                    <SelectItem value="Long">Long (&gt;250 mi)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 ml-auto"
                            onClick={() => window.open('https://app.cloudtrucks.com/market-conditions/', '_blank')}
                        >
                            <ExternalLink className="h-3 w-3" />
                            View Heat Map
                        </Button>
                    </div>

                    {/* Full Region List */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-2">
                        {sortedRegions.map((region) => (
                            <div
                                key={region.region_id}
                                className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium text-sm">
                                                {region.region_name}{region.state && `, ${region.state}`}
                                            </span>
                                            <Badge variant="outline" className={cn("text-[10px]", getDemandColor(region.demand_level))}>
                                                {getDemandLabel(region.demand_level)} Demand
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span>{region.load_count.toLocaleString()} loads</span>
                                            <span>Avg: ${region.avg_rate.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-bold text-emerald-500 text-lg">
                                            ${region.avg_rate_per_mile.toFixed(2)}/mi
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <TrendIcon trend={region.trend} />
                                            <span className={cn(
                                                "text-xs font-medium",
                                                region.trend === 'up' ? 'text-emerald-500' :
                                                region.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                                            )}>
                                                {region.trend === 'up' ? '+' : ''}{region.trend_percent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        Data sourced from CloudTrucks market conditions. Updated {new Date(data.last_updated).toLocaleString()}.
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
