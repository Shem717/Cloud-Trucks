'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Lightbulb,
    TrendingUp,
    Clock,
    MapPin,
    DollarSign,
    ArrowRight,
    Sparkles,
    Target,
    Route,
    Zap
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

interface Suggestion {
    id: string
    type: 'hot_lane' | 'backhaul' | 'timing' | 'rate_opportunity' | 'route_optimization'
    title: string
    description: string
    impact: string
    confidence: number // 0-100
    actionLabel?: string
    relatedLoads?: SavedLoad[]
}

// Analyze loads and generate smart suggestions
function generateSuggestions(loads: SavedLoad[], savedLoadIds: Set<string>): Suggestion[] {
    const suggestions: Suggestion[] = []

    if (loads.length === 0) {
        return [{
            id: 'no-loads',
            type: 'timing',
            title: 'Start Your Search',
            description: 'Add search criteria to find loads matching your preferences.',
            impact: 'Get started with load discovery',
            confidence: 100
        }]
    }

    // Analyze load data
    const loadsByOrigin = new Map<string, SavedLoad[]>()
    const loadsByDest = new Map<string, SavedLoad[]>()
    const ratesByLane = new Map<string, number[]>()

    loads.forEach(load => {
        const d = load.details
        const origin = `${d.origin_city}, ${d.origin_state}`
        const dest = `${d.dest_city}, ${d.dest_state}`
        const lane = `${origin} → ${dest}`

        // Group by origin
        if (!loadsByOrigin.has(origin)) loadsByOrigin.set(origin, [])
        loadsByOrigin.get(origin)!.push(load)

        // Group by destination
        if (!loadsByDest.has(dest)) loadsByDest.set(dest, [])
        loadsByDest.get(dest)!.push(load)

        // Track rates by lane
        const rate = typeof d.rate === 'string' ? parseFloat(d.rate) : d.rate
        if (rate) {
            if (!ratesByLane.has(lane)) ratesByLane.set(lane, [])
            ratesByLane.get(lane)!.push(rate)
        }
    })

    // 1. Hot Lane Detection - lanes with high average rates
    ratesByLane.forEach((rates, lane) => {
        if (rates.length >= 2) {
            const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
            const maxRate = Math.max(...rates)
            if (avgRate > 2000) { // High value lane
                suggestions.push({
                    id: `hot-lane-${lane}`,
                    type: 'hot_lane',
                    title: 'Hot Lane Detected',
                    description: `${lane} is showing strong rates averaging $${Math.round(avgRate).toLocaleString()}.`,
                    impact: `Max rate: $${maxRate.toLocaleString()}`,
                    confidence: Math.min(95, 70 + rates.length * 5),
                    actionLabel: 'View Loads'
                })
            }
        }
    })

    // 2. Backhaul Opportunities - destinations with lots of loads going back
    loadsByDest.forEach((destLoads, dest) => {
        const originLoads = loadsByOrigin.get(dest) || []
        if (destLoads.length > 0 && originLoads.length === 0) {
            // Loads going TO this place but none FROM
            suggestions.push({
                id: `backhaul-${dest}`,
                type: 'backhaul',
                title: 'Backhaul Opportunity',
                description: `You have ${destLoads.length} loads going to ${dest}. Consider adding a backhaul search from there.`,
                impact: 'Reduce deadhead miles',
                confidence: 75,
                actionLabel: 'Add Backhaul'
            })
        }
    })

    // 3. Timing Suggestions - instant book loads
    const instantLoads = loads.filter(l => l.details.instant_book === true)
    if (instantLoads.length > 0) {
        const avgInstantRate = instantLoads.reduce((sum, l) => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
            return sum + (rate || 0)
        }, 0) / instantLoads.length

        suggestions.push({
            id: 'instant-opportunity',
            type: 'timing',
            title: `${instantLoads.length} Instant Book Loads`,
            description: 'These loads can be booked immediately without negotiation.',
            impact: `Avg rate: $${Math.round(avgInstantRate).toLocaleString()}`,
            confidence: 90,
            actionLabel: 'View Instant',
            relatedLoads: instantLoads.slice(0, 3)
        })
    }

    // 4. Rate Opportunities - loads significantly above average
    const allRates = loads.map(l => {
        const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
        return rate || 0
    }).filter(r => r > 0)

    if (allRates.length > 3) {
        const avgRate = allRates.reduce((a, b) => a + b, 0) / allRates.length
        const highValueLoads = loads.filter(l => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
            return rate && rate > avgRate * 1.3 // 30% above average
        })

        if (highValueLoads.length > 0) {
            suggestions.push({
                id: 'high-value',
                type: 'rate_opportunity',
                title: 'Above-Average Rates',
                description: `${highValueLoads.length} loads are paying 30%+ above your average rate.`,
                impact: `Avg: $${Math.round(avgRate).toLocaleString()} → These: $${Math.round(highValueLoads.reduce((sum, l) => {
                    const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
                    return sum + (rate || 0)
                }, 0) / highValueLoads.length).toLocaleString()}`,
                confidence: 85,
                actionLabel: 'View High Value',
                relatedLoads: highValueLoads.slice(0, 3)
            })
        }
    }

    // 5. Route Optimization - if multiple loads go to similar areas
    const stateGroups = new Map<string, SavedLoad[]>()
    loads.forEach(load => {
        const state = load.details.dest_state
        if (state) {
            if (!stateGroups.has(state)) stateGroups.set(state, [])
            stateGroups.get(state)!.push(load)
        }
    })

    stateGroups.forEach((stateLoads, state) => {
        if (stateLoads.length >= 3) {
            suggestions.push({
                id: `multi-stop-${state}`,
                type: 'route_optimization',
                title: `Multi-Stop to ${state}`,
                description: `${stateLoads.length} loads are heading to ${state}. Consider combining into a multi-stop route.`,
                impact: 'Maximize revenue per mile',
                confidence: 70,
                actionLabel: 'Plan Route',
                relatedLoads: stateLoads.slice(0, 3)
            })
        }
    })

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

interface SmartSuggestionsProps {
    loads: SavedLoad[]
    savedLoadIds: Set<string>
    onSelectLoad?: (load: SavedLoad) => void
    onAddBackhaul?: (destCity: string, destState: string) => void
    onFilterInstant?: () => void
    className?: string
}

export function SmartSuggestions({
    loads,
    savedLoadIds,
    onSelectLoad,
    onAddBackhaul,
    onFilterInstant,
    className
}: SmartSuggestionsProps) {
    const suggestions = useMemo(() =>
        generateSuggestions(loads, savedLoadIds),
        [loads, savedLoadIds]
    )

    if (suggestions.length === 0) {
        return null
    }

    const getIcon = (type: Suggestion['type']) => {
        switch (type) {
            case 'hot_lane': return <TrendingUp className="h-4 w-4 text-orange-500" />
            case 'backhaul': return <Route className="h-4 w-4 text-indigo-500" />
            case 'timing': return <Clock className="h-4 w-4 text-blue-500" />
            case 'rate_opportunity': return <DollarSign className="h-4 w-4 text-emerald-500" />
            case 'route_optimization': return <Target className="h-4 w-4 text-purple-500" />
            default: return <Lightbulb className="h-4 w-4 text-amber-500" />
        }
    }

    const getBadgeStyle = (type: Suggestion['type']) => {
        switch (type) {
            case 'hot_lane': return "bg-orange-500/10 text-orange-400 border-orange-500/30"
            case 'backhaul': return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            case 'timing': return "bg-blue-500/10 text-blue-400 border-blue-500/30"
            case 'rate_opportunity': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            case 'route_optimization': return "bg-purple-500/10 text-purple-400 border-purple-500/30"
            default: return "bg-amber-500/10 text-amber-400 border-amber-500/30"
        }
    }

    return (
        <Card className={cn("p-4 border-amber-500/20 bg-amber-500/5", className)}>
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">Smart Suggestions</h3>
                    <p className="text-[10px] text-muted-foreground">AI-powered insights from your load data</p>
                </div>
            </div>

            <div className="space-y-3">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className="p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {getIcon(suggestion.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{suggestion.title}</span>
                                    <Badge variant="outline" className={cn("text-[10px]", getBadgeStyle(suggestion.type))}>
                                        {suggestion.confidence}% confidence
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {suggestion.description}
                                </p>
                                <p className="text-xs text-emerald-500 font-medium mt-1">
                                    {suggestion.impact}
                                </p>
                            </div>
                            {suggestion.actionLabel && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs shrink-0"
                                    onClick={() => {
                                        if (suggestion.type === 'timing' && onFilterInstant) {
                                            onFilterInstant()
                                        } else if (suggestion.relatedLoads?.[0] && onSelectLoad) {
                                            onSelectLoad(suggestion.relatedLoads[0])
                                        }
                                    }}
                                >
                                    {suggestion.actionLabel}
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// Compact inline suggestion chip
interface SuggestionChipProps {
    suggestion: string
    type?: 'info' | 'success' | 'warning'
    onClick?: () => void
}

export function SuggestionChip({ suggestion, type = 'info', onClick }: SuggestionChipProps) {
    const styles = {
        info: "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 cursor-pointer transition-colors text-xs",
                styles[type]
            )}
            onClick={onClick}
        >
            <Lightbulb className="h-3 w-3" />
            {suggestion}
        </Badge>
    )
}
