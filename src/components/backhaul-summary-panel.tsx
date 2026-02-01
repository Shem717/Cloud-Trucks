'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, TrendingUp, Loader2, RefreshCw, ChevronDown, ChevronUp, Settings, MapPin, DollarSign } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { cn } from "@/lib/utils"
import { SuggestedBackhaul } from '@/app/api/backhauls/route'

interface BackhaulSummaryPanelProps {
    className?: string;
}

interface BackhaulSummary {
    total: number;
    withResults: number;
    totalBackhaulsFound: number;
    bestOverallRpm: number | null;
}

export function BackhaulSummaryPanel({ className }: BackhaulSummaryPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [backhauls, setBackhauls] = useState<SuggestedBackhaul[]>([])
    const [summary, setSummary] = useState<BackhaulSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBackhauls = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/backhauls')

            if (response.status === 401) {
                // Not authenticated
                setBackhauls([])
                setSummary(null)
                return
            }

            if (!response.ok) {
                throw new Error('Failed to fetch backhauls')
            }

            const data = await response.json()
            setBackhauls(data.backhauls || [])
            setSummary(data.summary)
            setError(null)
        } catch (err) {
            console.error('Error fetching backhauls:', err)
            setError('Failed to load backhaul suggestions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBackhauls()

        // Refresh every 5 minutes
        const interval = setInterval(fetchBackhauls, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    // Don't show panel if loading or no data
    if (loading) {
        return (
            <Card className={cn("bg-gradient-to-r from-purple-900/20 to-slate-900/50 border-purple-500/20", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                        <span className="text-sm text-slate-400">Loading backhaul suggestions...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // No backhauls or preferences not configured
    if (!summary || summary.total === 0) {
        // Check if any saved loads need backhauls searched
        return (
            <Card className={cn("bg-gradient-to-r from-slate-900/50 to-purple-900/10 border-slate-700/50", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <ArrowLeftRight className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-200">Backhaul Suggestions</h3>
                                <p className="text-sm text-slate-400">
                                    Save loads to get automatic backhaul suggestions
                                </p>
                            </div>
                        </div>
                        <Link href="/settings">
                            <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-800">
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Get top backhauls with results
    const topBackhauls = backhauls
        .filter(b => b.status === 'found' && b.loads_found > 0)
        .sort((a, b) => (b.best_rpm || 0) - (a.best_rpm || 0))
        .slice(0, 3)

    return (
        <Card className={cn("bg-gradient-to-r from-purple-900/20 to-emerald-900/10 border-purple-500/20", className)}>
            <CardContent className="py-4">
                <div className="flex items-start justify-between">
                    {/* Summary stats */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
                    >
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <ArrowLeftRight className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-200">Backhaul Suggestions</h3>
                                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300 text-xs">
                                    {summary.totalBackhaulsFound} found
                                </Badge>
                                {isCollapsed ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                )}
                            </div>
                            <p className="text-sm text-slate-400">
                                {summary.withResults} of {summary.total} saved loads have backhaul options
                                {summary.bestOverallRpm && (
                                    <span className="text-emerald-400 font-semibold ml-2">
                                        Best: ${summary.bestOverallRpm.toFixed(2)}/mi
                                    </span>
                                )}
                            </p>
                        </div>
                    </button>

                    {/* Quick actions */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchBackhauls}
                        className="hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Top backhauls preview */}
                {!isCollapsed && topBackhauls.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        {topBackhauls.map((backhaul) => (
                            <div
                                key={backhaul.id}
                                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-3 w-3 text-purple-400" />
                                    <span className="text-sm font-medium text-slate-200">
                                        {backhaul.origin_city}, {backhaul.origin_state}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300 text-xs">
                                            {backhaul.loads_found} loads
                                        </Badge>
                                    </div>
                                    {backhaul.best_rpm && (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <TrendingUp className="h-3 w-3" />
                                            <span className="text-sm font-semibold">${backhaul.best_rpm.toFixed(2)}/mi</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        {error}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
