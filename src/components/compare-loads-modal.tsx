'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    X, Star, Check, AlertTriangle, DollarSign, Truck,
    Calendar, Weight, MapPin, Fuel, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CloudTrucksLoad } from '@/workers/cloudtrucks-api-client'
import { BrokerLogo } from './broker-logo'

interface CompareLoad {
    id: string
    details: CloudTrucksLoad & Record<string, any>
    created_at: string
}

interface CompareLoadsModalProps {
    isOpen: boolean
    onClose: () => void
    loads: CompareLoad[]
    mpg?: number
    fuelPrice?: number
}

interface LoadMetrics {
    rate: number
    distance: number
    rpm: number
    netRpm: number
    fuelCost: number
    netProfit: number
    weight: number | null
    pickupDate: string | null
    deliveryDate: string | null
    origin: string
    destination: string
    equipment: string
    broker: string | null
    isInstant: boolean
    isTeam: boolean
    deadheadOrigin: number
    deadheadDest: number
}

function getLoadMetrics(load: CompareLoad, mpg: number, fuelPrice: number): LoadMetrics {
    const d = load.details

    const rawRate = d.rate || d.trip_rate || 0
    const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate

    const rawDist = d.distance || d.trip_distance_mi || 0
    const distance = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist

    const rpm = distance > 0 ? rate / distance : 0
    const fuelCost = distance > 0 ? (distance / mpg) * fuelPrice : 0
    const netProfit = rate - fuelCost
    const netRpm = distance > 0 ? netProfit / distance : 0

    const weight = d.weight || d.truck_weight_lb || null

    const origin = d.origin_city ? `${d.origin_city}, ${d.origin_state}` : d.origin || 'Unknown'
    const destination = d.dest_city ? `${d.dest_city}, ${d.dest_state}` : d.destination || 'Unknown'

    const equipment = Array.isArray(d.equipment) ? d.equipment[0] : d.equipment || 'Unknown'

    return {
        rate,
        distance,
        rpm,
        netRpm,
        fuelCost,
        netProfit,
        weight: typeof weight === 'string' ? parseFloat(weight) : weight,
        pickupDate: d.pickup_date || d.origin_pickup_date || null,
        deliveryDate: d.dest_delivery_date || null,
        origin,
        destination,
        equipment,
        broker: d.broker_name || null,
        isInstant: d.instant_book === true,
        isTeam: d.is_team_load === true,
        deadheadOrigin: d.origin_deadhead_mi || 0,
        deadheadDest: d.dest_deadhead_mi || 0
    }
}

type MetricKey = 'rate' | 'rpm' | 'netRpm' | 'netProfit' | 'distance' | 'deadheadOrigin'

function getBestIndex(metrics: LoadMetrics[], key: MetricKey, preferHigh: boolean = true): number {
    if (metrics.length === 0) return -1
    let bestIdx = 0
    let bestVal = metrics[0][key]

    for (let i = 1; i < metrics.length; i++) {
        const val = metrics[i][key]
        if (preferHigh ? val > bestVal : val < bestVal) {
            bestVal = val
            bestIdx = i
        }
    }
    return bestIdx
}

export function CompareLoadsModal({ isOpen, onClose, loads, mpg = 6.5, fuelPrice = 3.80 }: CompareLoadsModalProps) {
    const metrics = useMemo(() => loads.map(l => getLoadMetrics(l, mpg, fuelPrice)), [loads, mpg, fuelPrice])

    const bestIndices = useMemo(() => ({
        rate: getBestIndex(metrics, 'rate', true),
        rpm: getBestIndex(metrics, 'rpm', true),
        netRpm: getBestIndex(metrics, 'netRpm', true),
        netProfit: getBestIndex(metrics, 'netProfit', true),
        distance: getBestIndex(metrics, 'distance', false), // prefer shorter
        deadhead: getBestIndex(metrics, 'deadheadOrigin', false) // prefer lower deadhead
    }), [metrics])

    // Calculate overall recommendation (simple scoring: +1 for each "best")
    const scores = useMemo(() => {
        const s = metrics.map(() => 0)
        if (bestIndices.rate >= 0) s[bestIndices.rate]++
        if (bestIndices.netRpm >= 0) s[bestIndices.netRpm] += 2 // weight net RPM more
        if (bestIndices.netProfit >= 0) s[bestIndices.netProfit] += 2 // weight net profit more
        if (bestIndices.deadhead >= 0) s[bestIndices.deadhead]++
        return s
    }, [metrics, bestIndices])

    const recommendedIdx = scores.indexOf(Math.max(...scores))

    if (!isOpen || loads.length === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-xl font-bold">Compare Loads</h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Comparison Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left p-3 text-sm font-medium text-muted-foreground w-32">Metric</th>
                                    {loads.map((load, idx) => (
                                        <th key={load.id} className="p-3 text-center min-w-[180px]">
                                            <div className="space-y-1">
                                                {idx === recommendedIdx && (
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                        <Star className="h-3 w-3 mr-1 fill-current" /> Recommended
                                                    </Badge>
                                                )}
                                                <div className="font-bold">Load {idx + 1}</div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Route */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 inline mr-1" /> Route
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            <div className="text-sm font-medium">{m.origin}</div>
                                            <div className="text-xs text-muted-foreground">to</div>
                                            <div className="text-sm font-medium">{m.destination}</div>
                                        </td>
                                    ))}
                                </tr>

                                {/* Rate */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <DollarSign className="h-4 w-4 inline mr-1" /> Rate
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className={cn(
                                            "p-3 text-center text-lg font-bold",
                                            idx === bestIndices.rate && "text-emerald-500"
                                        )}>
                                            ${m.rate.toLocaleString()}
                                            {idx === bestIndices.rate && <Check className="h-4 w-4 inline ml-1 text-emerald-500" />}
                                        </td>
                                    ))}
                                </tr>

                                {/* Distance */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <Truck className="h-4 w-4 inline mr-1" /> Distance
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            {m.distance.toLocaleString()} mi
                                        </td>
                                    ))}
                                </tr>

                                {/* RPM (Gross) */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">RPM (Gross)</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className={cn(
                                            "p-3 text-center font-medium",
                                            idx === bestIndices.rpm && "text-emerald-500"
                                        )}>
                                            ${m.rpm.toFixed(2)}/mi
                                        </td>
                                    ))}
                                </tr>

                                {/* RPM (Net) - Key metric */}
                                <tr className="border-b border-border/50 bg-emerald-500/5">
                                    <td className="p-3 text-sm font-medium">
                                        <Fuel className="h-4 w-4 inline mr-1" /> RPM (Net)
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className={cn(
                                            "p-3 text-center text-lg font-bold",
                                            idx === bestIndices.netRpm ? "text-emerald-500" : "text-emerald-400"
                                        )}>
                                            ${m.netRpm.toFixed(2)}/mi
                                            {idx === bestIndices.netRpm && <Check className="h-4 w-4 inline ml-1" />}
                                        </td>
                                    ))}
                                </tr>

                                {/* Net Profit - Key metric */}
                                <tr className="border-b border-border/50 bg-emerald-500/5">
                                    <td className="p-3 text-sm font-medium">Net Profit</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className={cn(
                                            "p-3 text-center text-lg font-bold",
                                            idx === bestIndices.netProfit ? "text-emerald-500" : "text-emerald-400"
                                        )}>
                                            ${Math.round(m.netProfit).toLocaleString()}
                                            {idx === bestIndices.netProfit && <Check className="h-4 w-4 inline ml-1" />}
                                        </td>
                                    ))}
                                </tr>

                                {/* Fuel Cost */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">Est. Fuel Cost</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center text-rose-400">
                                            -${Math.round(m.fuelCost).toLocaleString()}
                                        </td>
                                    ))}
                                </tr>

                                {/* Deadhead */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">Deadhead (Origin)</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className={cn(
                                            "p-3 text-center",
                                            idx === bestIndices.deadhead && "text-emerald-500 font-medium"
                                        )}>
                                            {m.deadheadOrigin} mi
                                            {idx === bestIndices.deadhead && <Check className="h-4 w-4 inline ml-1" />}
                                        </td>
                                    ))}
                                </tr>

                                {/* Pickup Date */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4 inline mr-1" /> Pickup
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center text-sm">
                                            {m.pickupDate
                                                ? new Date(m.pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                                : 'ASAP'
                                            }
                                        </td>
                                    ))}
                                </tr>

                                {/* Weight */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <Weight className="h-4 w-4 inline mr-1" /> Weight
                                    </td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center text-sm">
                                            {m.weight ? `${(m.weight / 1000).toFixed(1)}k lbs` : '--'}
                                        </td>
                                    ))}
                                </tr>

                                {/* Equipment */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">Equipment</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            <Badge variant="outline" className="text-xs">
                                                {m.equipment}
                                            </Badge>
                                        </td>
                                    ))}
                                </tr>

                                {/* Booking Type */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">Booking</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            <Badge className={cn(
                                                "text-xs",
                                                m.isInstant ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"
                                            )}>
                                                {m.isInstant ? 'Instant' : 'Standard'}
                                            </Badge>
                                        </td>
                                    ))}
                                </tr>

                                {/* Broker */}
                                <tr className="border-b border-border/50">
                                    <td className="p-3 text-sm text-muted-foreground">Broker</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            {m.broker ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <BrokerLogo name={m.broker} size="sm" />
                                                    <span className="text-sm">{m.broker}</span>
                                                </div>
                                            ) : '--'}
                                        </td>
                                    ))}
                                </tr>

                                {/* Team/Solo */}
                                <tr>
                                    <td className="p-3 text-sm text-muted-foreground">Driver Type</td>
                                    {metrics.map((m, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            <Badge variant="secondary" className="text-xs">
                                                {m.isTeam ? 'Team' : 'Solo'}
                                            </Badge>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer with recommendation */}
                    <div className="p-4 border-t border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Recommendation based on net profit and RPM. Always verify load details.</span>
                            </div>
                            <Button onClick={onClose}>Close</Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
