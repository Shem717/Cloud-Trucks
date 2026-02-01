'use client'

import { useRouteBuilder } from '@/components/route-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    MapPin, Truck, DollarSign, Calendar, Clock,
    Trash2, ArrowUp, ArrowDown, ExternalLink,
    Navigation, Calculator
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'


export function RouteBuilderFullView() {
    const {
        loads,
        removeLoad,
        clearLoads,
        reorderLoads
    } = useRouteBuilder()

    // Re-calculate totals locally for display
    const totals = loads.reduce((acc, load) => {
        const rate = Number(load.details.trip_rate || load.details.estimated_rate || 0)
        const dist = Number(load.details.trip_distance_mi || 0)
        return {
            revenue: acc.revenue + rate,
            miles: acc.miles + dist,
            // Simple fuel calc
            fuelCost: acc.fuelCost + ((dist / 6.5) * 3.80)
        }
    }, { revenue: 0, miles: 0, fuelCost: 0 })

    const netProfit = totals.revenue - totals.fuelCost
    const rpm = totals.miles > 0 ? totals.revenue / totals.miles : 0

    if (loads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="bg-muted/30 p-8 rounded-full">
                    <Navigation className="h-16 w-16 text-muted-foreground/30" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Your Route is Empty</h2>
                <p className="text-muted-foreground max-w-md">
                    To start building a route, find loads in the Dashboard or your Saved Loads and click "Add to Route".
                </p>
                <Button asChild className="mt-4">
                    <a href="/dashboard">Browse Loads</a>
                </Button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Route List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Navigation className="h-5 w-5 text-primary" />
                        Route Sequence
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearLoads}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Route
                    </Button>
                </div>

                <div className="space-y-4">
                    <AnimatePresence mode='popLayout'>
                        {loads.map((load, index) => {
                            const rate = Number(load.details.trip_rate || load.details.estimated_rate || 0)
                            const dist = Number(load.details.trip_distance_mi || 0)
                            const pickupDate = load.details.pickup_date || load.details.origin_pickup_date

                            return (
                                <motion.div
                                    key={load.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative group"
                                >
                                    {/* Stop Number Badge */}
                                    <div className="absolute -left-3 top-6 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-lg border-2 border-background">
                                        {index + 1}
                                    </div>

                                    {/* Connection Line */}
                                    {index < loads.length - 1 && (
                                        <div className="absolute left-1 top-14 bottom-[-16px] w-0.5 bg-border z-0" />
                                    )}

                                    <Card className="ml-4 border-l-4 border-l-primary/50 hover:border-l-primary transition-all">
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                                {/* Origin / Dest */}
                                                <div className="space-y-4 flex-1">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1">
                                                            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-lg">
                                                                {load.details.origin_city}, {load.details.origin_state}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <Calendar className="h-3 w-3" />
                                                                {pickupDate ? new Date(pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1">
                                                            <div className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-lg">
                                                                {load.details.dest_city}, {load.details.dest_state}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <Clock className="h-3 w-3" />
                                                                Delivery by {load.details.dest_delivery_date ? new Date(load.details.dest_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Open'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stats & Actions */}
                                                <div className="flex flex-row sm:flex-col justify-between sm:items-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
                                                    <div className="text-right space-y-1">
                                                        <div className="text-2xl font-bold text-emerald-500">
                                                            ${rate.toLocaleString()}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Truck className="h-3 w-3" /> {dist} mi
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <DollarSign className="h-3 w-3" /> ${(rate / dist).toFixed(2)}/mi
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={index > 0 ? () => reorderLoads(index, index - 1) : undefined}
                                                            disabled={index === 0}
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={index < loads.length - 1 ? () => reorderLoads(index, index + 1) : undefined}
                                                            disabled={index === loads.length - 1}
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown className="h-4 w-4" />
                                                        </Button>
                                                        <div className="h-4 w-px bg-border mx-1" />
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="opacity-80 hover:opacity-100"
                                                            onClick={() => removeLoad(load.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Column: Totals & Map Preview */}
            <div className="space-y-6">
                <Card className="sticky top-6 border-emerald-500/20 shadow-lg bg-emerald-950/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calculator className="h-5 w-5 text-emerald-500" />
                            Trip Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-1 text-center py-4 border-b border-border/50">
                            <div className="text-sm text-muted-foreground uppercase tracking-wider">Estimated Net Profit</div>
                            <div className="text-4xl font-extrabold text-emerald-500">
                                ${Math.round(netProfit).toLocaleString()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Total Revenue</span>
                                <div className="text-xl font-bold">${totals.revenue.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-xs text-muted-foreground">Total Miles</span>
                                <div className="text-xl font-bold">{totals.miles.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Avg RPM</span>
                                <div className="text-xl font-bold">${rpm.toFixed(2)}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-xs text-muted-foreground">Fuel Cost (Est)</span>
                                <div className="text-xl font-bold text-rose-400">-${Math.round(totals.fuelCost).toLocaleString()}</div>
                            </div>
                        </div>

                        <Button className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500" asChild>
                            {/* Placeholder for "Book All" or Map View */}
                            <a href="#" onClick={(e) => e.preventDefault()}>
                                <ExternalLink className="mr-2 h-5 w-5" />
                                Export to Maps
                            </a>
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            * Fuel calculated at $3.80/gal & 6.5 MPG
                        </p>
                    </CardContent>
                </Card>

                {/* Map Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-muted/50 via-muted to-muted/80 rounded-xl border border-border flex items-center justify-center overflow-hidden relative group cursor-pointer">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative z-10 bg-background/80 backdrop-blur px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">Interactive Map</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
