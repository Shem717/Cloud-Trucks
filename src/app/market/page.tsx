'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Info,
    Fuel,
    BarChart3,
    ArrowUpRight,
    ExternalLink,
    DollarSign,
    Package,
    MapPin,
    ChevronDown,
    Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

interface HistoryPoint {
    date: string
    value: number
}

interface MetricData {
    current: number | null
    previous: number | null
    changePct: number | null
    history: HistoryPoint[]
    unit: string
    source: string
}

interface MarketData {
    diesel: MetricData
    tonnage: MetricData
    ppi: MetricData
    lastUpdated: string
    dataAvailable: boolean
    setupMessage?: string
}

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
    source?: string
}

// --- Helper Components ---

function MiniChart({ data, color }: { data: HistoryPoint[]; color: string }) {
    if (data.length < 2) return null

    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const width = 240
    const height = 50
    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width
            const y = height - ((d.value - min) / range) * (height - 8) - 4
            return `${x},${y}`
        })
        .join(' ')

    const fillPath = `M0,${height} L${points} L${width},${height} Z`

    return (
        <svg width={width} height={height} className="w-full h-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <polygon points={fillPath.replace('M0,50 L', '').replace(` L${width},${height} Z`, `,${width},${height} 0,${height}`)}
                fill={`url(#grad-${color})`}
            />
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

function TrendIndicator({ changePct }: { changePct: number | null }) {
    if (changePct === null) return <Minus className="h-3 w-3 text-muted-foreground" />
    if (changePct > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />
    if (changePct < 0) return <TrendingDown className="h-3 w-3 text-rose-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
}

function formatChange(pct: number | null): string {
    if (pct === null) return '—'
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function demandColor(level: string) {
    switch (level) {
        case 'very_high': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
        case 'high': return 'bg-blue-500/15 text-blue-400 border-blue-500/25'
        case 'medium': return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
        default: return 'bg-muted/30 text-muted-foreground border-white/10'
    }
}

function demandLabel(level: string) {
    switch (level) {
        case 'very_high': return 'Very High'
        case 'high': return 'High'
        case 'medium': return 'Medium'
        default: return 'Low'
    }
}

// --- Main Page ---

export default function MarketPage() {
    const [data, setData] = useState<MarketData | null>(null)
    const [insights, setInsights] = useState<MarketInsightsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [insightsLoading, setInsightsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [insightsUnavailable, setInsightsUnavailable] = useState(false)
    const [showTechnical, setShowTechnical] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/market-data')
            if (!res.ok) throw new Error('Failed to fetch market data')
            const json = await res.json()
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchInsights = useCallback(async () => {
        setInsightsLoading(true)
        setInsightsUnavailable(false)
        try {
            const res = await fetch('/api/market-insights')
            if (res.ok) {
                const json = await res.json()
                if (!json.error) {
                    setInsights(json)
                    return
                }
            }
            setInsightsUnavailable(true)
        } catch {
            setInsightsUnavailable(true)
        } finally {
            setInsightsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        fetchInsights()
    }, [fetchData, fetchInsights])

    const handleRefresh = () => {
        fetchData()
        fetchInsights()
    }

    // Sort regions by load count descending for "hottest lanes"
    const topRegions = insights?.regions
        ?.slice()
        .sort((a, b) => b.load_count - a.load_count)
        .slice(0, 8) ?? []

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Market
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Live freight market conditions to guide your next move
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Setup Message */}
            {data && !data.dataAvailable && data.setupMessage && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <div className="bg-amber-500/20 p-1.5 rounded-lg">
                            <Info className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-amber-200">FRED API Key Required</h4>
                            <p className="text-xs text-amber-200/70 mt-1">{data.setupMessage}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <Card className="p-4 border-red-500/30 bg-red-500/5">
                    <p className="text-sm text-red-400">{error}</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={handleRefresh}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Retry
                    </Button>
                </Card>
            )}

            {/* No insights hint */}
            {!insightsLoading && insightsUnavailable && (
                <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <Info className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-blue-200">No load data to analyze yet</h4>
                            <p className="text-xs text-blue-200/70 mt-1">
                                Rate/mile, load volume, and regional demand are computed from your search results.
                                Head to the <a href="/dashboard" className="underline hover:text-blue-100">Dashboard</a> and run a search to populate this data.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* ===================== */}
            {/* HERO: Actionable Freight Metrics */}
            {/* ===================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* National Avg Rate/Mile */}
                <Card className="p-5 bg-card/40 backdrop-blur-md border-white/5 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3" /> Avg Rate / Mile
                            </span>
                            {insights?.national_avg_rpm && (
                                <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-bold">
                                    Spot
                                </div>
                            )}
                        </div>
                        {insightsLoading && !insights ? (
                            <div className="h-10 bg-muted/30 rounded animate-pulse" />
                        ) : insights?.national_avg_rpm ? (
                            <span className="text-3xl font-bold tracking-tight text-white">
                                ${insights.national_avg_rpm.toFixed(2)}
                                <span className="text-sm font-normal text-muted-foreground/80">/mi</span>
                            </span>
                        ) : (
                            <span className="text-lg text-muted-foreground">
                                No data yet
                            </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3">
                            {insights?.source === 'aggregated'
                                ? 'Averaged from your recent load searches'
                                : 'National average across all regions'}
                        </p>
                    </div>
                </Card>

                {/* Total Load Volume */}
                <Card className="p-5 bg-card/40 backdrop-blur-md border-white/5 group hover:border-blue-500/20 transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Package className="h-3 w-3" /> Load Volume
                            </span>
                        </div>
                        {insightsLoading && !insights ? (
                            <div className="h-10 bg-muted/30 rounded animate-pulse" />
                        ) : insights?.total_loads ? (
                            <span className="text-3xl font-bold tracking-tight text-white">
                                {insights.total_loads >= 1000
                                    ? `${(insights.total_loads / 1000).toFixed(1)}k`
                                    : insights.total_loads.toLocaleString()}
                                <span className="text-sm font-normal text-muted-foreground/80 ml-1">loads</span>
                            </span>
                        ) : (
                            <span className="text-lg text-muted-foreground">
                                No data yet
                            </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3">
                            {insights?.source === 'aggregated'
                                ? 'From your recent load searches (7 days)'
                                : 'Available loads across all regions'}
                        </p>
                    </div>
                </Card>

                {/* Diesel Price - stays, directly impacts cost */}
                <Card className="p-5 bg-card/40 backdrop-blur-md border-white/5 group hover:border-amber-500/20 transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Fuel className="h-3 w-3" /> Diesel Avg
                            </span>
                            {data?.diesel.changePct !== undefined && (
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                                    data.diesel.changePct !== null && data.diesel.changePct > 0
                                        ? "bg-rose-500/10 text-rose-400"
                                        : data.diesel.changePct !== null && data.diesel.changePct < 0
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-muted text-muted-foreground"
                                )}>
                                    <TrendIndicator changePct={data.diesel.changePct} />
                                    {formatChange(data.diesel.changePct)}
                                </div>
                            )}
                        </div>
                        {loading && !data ? (
                            <div className="h-10 bg-muted/30 rounded animate-pulse" />
                        ) : (
                            <span className="text-3xl font-bold tracking-tight text-white">
                                {data?.diesel.current !== null ? `$${data?.diesel.current?.toFixed(3)}` : '—'}
                                <span className="text-sm font-normal text-muted-foreground/80">/gal</span>
                            </span>
                        )}
                        <div className="h-12 mt-3 opacity-60">
                            {data?.diesel.history && data.diesel.history.length > 1 && (
                                <MiniChart data={data.diesel.history} color="#f59e0b" />
                            )}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1">{data?.diesel.source || 'EIA via FRED'}</div>
                    </div>
                </Card>
            </div>

            {/* ===================== */}
            {/* REGIONAL DEMAND: Where the freight is */}
            {/* ===================== */}
            {topRegions.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" /> Regional Demand
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {topRegions.map((region) => (
                            <Card
                                key={region.region_id}
                                className="p-4 bg-card/40 backdrop-blur-md border-white/5 hover:border-white/15 transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-sm text-white truncate">
                                            {region.region_name}
                                        </div>
                                        {region.state && (
                                            <div className="text-[10px] text-muted-foreground">{region.state}</div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ml-2",
                                        demandColor(region.demand_level)
                                    )}>
                                        {demandLabel(region.demand_level)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div>
                                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Rate/Mi</div>
                                        <div className="text-base font-bold text-white">
                                            ${region.avg_rate_per_mile.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Loads</div>
                                        <div className="text-base font-bold text-white">
                                            {region.load_count >= 1000
                                                ? `${(region.load_count / 1000).toFixed(1)}k`
                                                : region.load_count}
                                        </div>
                                    </div>
                                </div>

                                {region.trend !== 'stable' && (
                                    <div className={cn(
                                        "flex items-center gap-1 mt-2 text-[10px] font-medium",
                                        region.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
                                    )}>
                                        {region.trend === 'up'
                                            ? <TrendingUp className="h-3 w-3" />
                                            : <TrendingDown className="h-3 w-3" />}
                                        {region.trend === 'up' ? '+' : ''}{region.trend_percent.toFixed(1)}% vs last period
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ===================== */}
            {/* TECHNICAL INDICATORS: Collapsible */}
            {/* ===================== */}
            {data?.dataAvailable && (
                <div className="space-y-3">
                    <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors w-full"
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Technical Indicators
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            showTechnical && "rotate-180"
                        )} />
                        <span className="flex-1 border-t border-white/5 ml-2" />
                    </button>

                    {showTechnical && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Truck Tonnage Card */}
                                <Card className="p-5 bg-card/40 backdrop-blur-md border-white/5 group hover:border-blue-500/20 transition-all relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                <BarChart3 className="h-3 w-3" /> Truck Tonnage
                                            </span>
                                            {data?.tonnage.changePct !== undefined && (
                                                <div className={cn(
                                                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                                                    data.tonnage.changePct !== null && data.tonnage.changePct > 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : data.tonnage.changePct !== null && data.tonnage.changePct < 0
                                                            ? "bg-rose-500/10 text-rose-400"
                                                            : "bg-muted text-muted-foreground"
                                                )}>
                                                    <TrendIndicator changePct={data.tonnage.changePct} />
                                                    {formatChange(data.tonnage.changePct)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-3xl font-bold tracking-tight text-white">
                                            {data?.tonnage.current !== null ? data?.tonnage.current?.toFixed(1) : '—'}
                                            <span className="text-sm font-normal text-muted-foreground/80 ml-1">idx</span>
                                        </span>
                                        <div className="h-12 mt-3 opacity-60">
                                            {data?.tonnage.history && data.tonnage.history.length > 1 && (
                                                <MiniChart data={data.tonnage.history} color="#3b82f6" />
                                            )}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground mt-1">{data?.tonnage.source || 'ATA via FRED'}</div>
                                    </div>
                                </Card>

                                {/* PPI Trucking Card */}
                                <Card className="p-5 bg-card/40 backdrop-blur-md border-white/5 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                <ArrowUpRight className="h-3 w-3" /> Rate Index (PPI)
                                            </span>
                                            {data?.ppi.changePct !== undefined && (
                                                <div className={cn(
                                                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                                                    data.ppi.changePct !== null && data.ppi.changePct > 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : data.ppi.changePct !== null && data.ppi.changePct < 0
                                                            ? "bg-rose-500/10 text-rose-400"
                                                            : "bg-muted text-muted-foreground"
                                                )}>
                                                    <TrendIndicator changePct={data.ppi.changePct} />
                                                    {formatChange(data.ppi.changePct)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-3xl font-bold tracking-tight text-white">
                                            {data?.ppi.current !== null ? data?.ppi.current?.toFixed(1) : '—'}
                                            <span className="text-sm font-normal text-muted-foreground/80 ml-1">idx</span>
                                        </span>
                                        <div className="h-12 mt-3 opacity-60">
                                            {data?.ppi.history && data.ppi.history.length > 1 && (
                                                <MiniChart data={data.ppi.history} color="#10b981" />
                                            )}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground mt-1">{data?.ppi.source || 'BLS PPI via FRED'}</div>
                                    </div>
                                </Card>
                            </div>

                            {/* Explainer Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="p-3 bg-blue-500/5 border-blue-500/15">
                                    <div className="flex items-start gap-2">
                                        <BarChart3 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="text-xs font-semibold text-blue-200">Truck Tonnage</h4>
                                            <p className="text-[10px] text-blue-200/60 leading-relaxed mt-0.5">
                                                ATA Truck Tonnage Index measures total freight moved by trucks. Rising = more demand = higher rates.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="p-3 bg-emerald-500/5 border-emerald-500/15">
                                    <div className="flex items-start gap-2">
                                        <ArrowUpRight className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="text-xs font-semibold text-emerald-200">Rate Index (PPI)</h4>
                                            <p className="text-[10px] text-emerald-200/60 leading-relaxed mt-0.5">
                                                BLS Producer Price Index for long-distance TL trucking. Tracks what shippers are paying — a rate trend proxy.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Data Sources Footer */}
            <Card className="p-4 bg-card/30 border-white/5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Data Sources</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <a
                        href="https://fred.stlouisfed.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" /> FRED (Federal Reserve)
                    </a>
                    <a
                        href="https://www.eia.gov/petroleum/gasdiesel/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" /> EIA Diesel Prices
                    </a>
                    <a
                        href="https://www.bls.gov/ppi/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" /> BLS Producer Price Index
                    </a>
                    <a
                        href="https://www.trucking.org/economics-and-industry-data"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" /> ATA Truck Tonnage
                    </a>
                </div>
                {data?.lastUpdated && (
                    <p className="text-[10px] text-muted-foreground/60 mt-3">
                        Last fetched: {new Date(data.lastUpdated).toLocaleString()}
                    </p>
                )}
            </Card>
        </div>
    )
}
