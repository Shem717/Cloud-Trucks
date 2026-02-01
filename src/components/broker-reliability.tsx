'use client'

import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, TrendingUp, Clock, DollarSign, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Simulated broker reliability data
// In production, this would come from an API or database
interface BrokerReliabilityData {
    score: number // 0-100
    paymentDays: number // Average days to pay
    onTimeRate: number // Percentage of on-time pickups
    disputeRate: number // Percentage of loads with disputes
    loadCount: number // Total loads with this broker
    rating: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
}

// Mock data generator based on broker name (deterministic for consistency)
function getBrokerReliability(brokerName: string | null): BrokerReliabilityData {
    if (!brokerName) {
        return {
            score: 0,
            paymentDays: 0,
            onTimeRate: 0,
            disputeRate: 0,
            loadCount: 0,
            rating: 'unknown'
        }
    }

    // Generate deterministic "random" values based on broker name
    const hash = brokerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

    // Known major brokers get better scores
    const knownBrokers: Record<string, Partial<BrokerReliabilityData>> = {
        'C.H. Robinson': { score: 92, paymentDays: 15, onTimeRate: 94, disputeRate: 2 },
        'Echo Global Logistics': { score: 88, paymentDays: 18, onTimeRate: 91, disputeRate: 3 },
        'XPO Logistics': { score: 90, paymentDays: 14, onTimeRate: 93, disputeRate: 2 },
        'TQL': { score: 85, paymentDays: 21, onTimeRate: 89, disputeRate: 4 },
        'Total Quality Logistics': { score: 85, paymentDays: 21, onTimeRate: 89, disputeRate: 4 },
        'Coyote Logistics': { score: 87, paymentDays: 17, onTimeRate: 90, disputeRate: 3 },
        'Uber Freight': { score: 91, paymentDays: 7, onTimeRate: 92, disputeRate: 2 },
        'J.B. Hunt': { score: 94, paymentDays: 12, onTimeRate: 95, disputeRate: 1 },
        'Landstar': { score: 89, paymentDays: 16, onTimeRate: 91, disputeRate: 3 },
        'Schneider': { score: 93, paymentDays: 14, onTimeRate: 94, disputeRate: 2 },
    }

    // Check if broker is known
    const normalizedName = brokerName.toLowerCase()
    const knownEntry = Object.entries(knownBrokers).find(([name]) =>
        normalizedName.includes(name.toLowerCase()) || name.toLowerCase().includes(normalizedName)
    )

    if (knownEntry) {
        const data = knownEntry[1]
        const score = data.score || 80
        return {
            score,
            paymentDays: data.paymentDays || 21,
            onTimeRate: data.onTimeRate || 85,
            disputeRate: data.disputeRate || 5,
            loadCount: 50 + (hash % 200),
            rating: score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'fair' : 'poor'
        }
    }

    // Generate data for unknown brokers
    const baseScore = 50 + (hash % 40) // 50-89
    const paymentDays = 14 + (hash % 21) // 14-34 days
    const onTimeRate = 70 + (hash % 25) // 70-94%
    const disputeRate = 1 + (hash % 10) // 1-10%
    const loadCount = (hash % 50) + 1 // 1-50

    return {
        score: baseScore,
        paymentDays,
        onTimeRate,
        disputeRate,
        loadCount,
        rating: baseScore >= 90 ? 'excellent' : baseScore >= 80 ? 'good' : baseScore >= 70 ? 'fair' : 'poor'
    }
}

interface BrokerReliabilityBadgeProps {
    brokerName: string | null
    size?: 'sm' | 'md'
    showDetails?: boolean
}

export function BrokerReliabilityBadge({ brokerName, size = 'sm', showDetails = true }: BrokerReliabilityBadgeProps) {
    const data = useMemo(() => getBrokerReliability(brokerName), [brokerName])

    if (!brokerName || data.rating === 'unknown') {
        return null
    }

    const getIcon = () => {
        switch (data.rating) {
            case 'excellent':
                return <ShieldCheck className={cn("text-emerald-500", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
            case 'good':
                return <Shield className={cn("text-blue-500", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
            case 'fair':
                return <ShieldQuestion className={cn("text-amber-500", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
            case 'poor':
                return <ShieldAlert className={cn("text-rose-500", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
            default:
                return <Shield className={cn("text-slate-500", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
        }
    }

    const getBadgeStyle = () => {
        switch (data.rating) {
            case 'excellent':
                return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            case 'good':
                return "border-blue-500/30 text-blue-400 bg-blue-500/10"
            case 'fair':
                return "border-amber-500/30 text-amber-400 bg-amber-500/10"
            case 'poor':
                return "border-rose-500/30 text-rose-400 bg-rose-500/10"
            default:
                return "border-slate-500/30 text-slate-400 bg-slate-500/10"
        }
    }

    const badge = (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 font-mono cursor-help",
                getBadgeStyle(),
                size === 'sm' ? "text-[10px]" : "text-xs"
            )}
        >
            {getIcon()}
            {data.score}
        </Badge>
    )

    if (!showDetails) {
        return badge
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                {badge}
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Broker Reliability Score</h4>
                        <Badge className={cn("text-xs", getBadgeStyle())}>
                            {data.rating.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Score Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Overall Score</span>
                            <span className="font-bold">{data.score}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    data.rating === 'excellent' ? "bg-emerald-500" :
                                    data.rating === 'good' ? "bg-blue-500" :
                                    data.rating === 'fair' ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${data.score}%` }}
                            />
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <div className="text-muted-foreground">Payment</div>
                                <div className="font-medium">{data.paymentDays} days</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <div className="text-muted-foreground">On-Time</div>
                                <div className="font-medium">{data.onTimeRate}%</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <div className="text-muted-foreground">Disputes</div>
                                <div className="font-medium">{data.disputeRate}%</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <div className="text-muted-foreground">Track Record</div>
                                <div className="font-medium">{data.loadCount} loads</div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                        Score based on payment history, on-time rates, and dispute frequency.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// Simple inline indicator for compact displays
export function BrokerReliabilityIndicator({ brokerName }: { brokerName: string | null }) {
    const data = useMemo(() => getBrokerReliability(brokerName), [brokerName])

    if (!brokerName || data.rating === 'unknown') {
        return null
    }

    const getColor = () => {
        switch (data.rating) {
            case 'excellent': return 'bg-emerald-500'
            case 'good': return 'bg-blue-500'
            case 'fair': return 'bg-amber-500'
            case 'poor': return 'bg-rose-500'
            default: return 'bg-slate-500'
        }
    }

    return (
        <span
            className={cn("inline-block w-2 h-2 rounded-full", getColor())}
            title={`Reliability: ${data.rating} (${data.score}/100)`}
        />
    )
}
