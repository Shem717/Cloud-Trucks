"use client";

import { motion, Reorder } from "framer-motion";
import { Plus, GripVertical, MapPin, Truck, DollarSign, Clock, AlertTriangle, TrendingUp, Search, ExternalLink, Weight, Package, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouteBuilder } from "@/components/route-builder";
import Link from 'next/link';
import { useMemo } from "react";
import { RouteBuilderMap } from "@/components/route-builder-map";

export function RouteBuilderStitch() {
    const { loads, removeLoad, reorderLoads } = useRouteBuilder();

    // Calculate totals
    const totals = useMemo(() => {
        let revenue = 0;
        let miles = 0;
        let fuelCost = 0;
        let tollCost = 0;

        // Fallbacks if API data is missing
        const fallbackFuelPrice = 3.80;
        const fallbackMpg = 6.5;

        loads.forEach(load => {
            const rate = Number(load.details.trip_rate || load.details.estimated_rate || 0);
            const dist = Number(load.details.trip_distance_mi || 0);

            revenue += rate;
            miles += dist;

            // Use real estimated costs if available, otherwise estimate
            if (load.details.estimated_fuel_cost) {
                fuelCost += Number(load.details.estimated_fuel_cost);
            } else {
                fuelCost += (dist / fallbackMpg) * fallbackFuelPrice;
            }

            if (load.details.estimated_toll_cost) {
                tollCost += Number(load.details.estimated_toll_cost);
            }
        });

        const netProfit = revenue - fuelCost - tollCost;
        const rpm = miles > 0 ? revenue / miles : 0;

        return { revenue, miles, netProfit, rpm, fuelCost, tollCost };
    }, [loads]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[85vh]">
            {/* Left Panel: Route Timeline & Stops */}
            <Card className="col-span-1 border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
                <CardHeader className="bg-muted/20 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Truck className="w-5 h-5 text-emerald-500" />
                            Current Route
                        </CardTitle>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {loads.length} Loads
                        </Badge>
                    </div>
                    <div className="flex gap-4 mt-4 text-sm">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Net Profit</span>
                            <span className="font-mono font-bold text-emerald-400">${Math.round(totals.netProfit).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Total Dist</span>
                            <span className="font-mono font-bold">{totals.miles.toLocaleString()} mi</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">RPM</span>
                            <span className="font-mono font-bold text-blue-400">${totals.rpm.toFixed(2)}</span>
                        </div>
                    </div>
                </CardHeader>

                <ScrollArea className="flex-1 px-4 py-4">
                    <div className="space-y-3">
                        {loads.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No loads in route.</p>
                                <Button asChild variant="link" className="text-emerald-500">
                                    <Link href="/dashboard">Find Loads</Link>
                                </Button>
                            </div>
                        ) : (
                            <Reorder.Group axis="y" values={loads} onReorder={(newOrder) => {
                                // Find which item moved
                                const fromIndex = loads.findIndex((l, i) => l.id !== newOrder[i].id);
                                const toIndex = newOrder.findIndex((l, i) => l.id === loads[fromIndex].id);
                                if (fromIndex !== -1 && toIndex !== -1) {
                                    reorderLoads(fromIndex, toIndex);
                                }
                            }} className="space-y-3">
                                {loads.map((load, index) => {
                                    const rate = Number(load.details.trip_rate || load.details.estimated_rate || 0);
                                    const dist = Number(load.details.trip_distance_mi || 0);
                                    const pickupTime = load.details.pickup_date
                                        ? new Date(load.details.pickup_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                        : 'ASAP';
                                    const weight = load.details.truck_weight_lb
                                        ? `${(load.details.truck_weight_lb / 1000).toFixed(1)}k lbs`
                                        : '— lbs';
                                    const equipment = Array.isArray(load.details.equipment)
                                        ? load.details.equipment.join(', ')
                                        : (load.details.equipment || 'Unknown');
                                    const commodity = load.details.commodity || 'General Freight';
                                    const deadhead = load.details.total_deadhead_mi ? `${load.details.total_deadhead_mi}mi DH` : '';

                                    return (
                                        <Reorder.Item
                                            key={load.id}
                                            value={load}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group relative flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-accent/40 hover:border-accent transition-colors cursor-grab active:cursor-grabbing backdrop-blur-sm"
                                        >
                                            <div className="absolute -left-2 top-4 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold shadow-sm ring-1 ring-emerald-500/30">
                                                {index + 1}
                                            </div>
                                            <div className="mt-1 ml-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-sm truncate">
                                                        {load.details.origin_city}, {load.details.origin_state}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0">
                                                        +{Math.round(rate - (dist / 6.5 * 3.8))}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                    <span className="text-[10px] uppercase tracking-wider opacity-70">to</span>
                                                    <span className="font-medium text-foreground truncate">{load.details.dest_city}, {load.details.dest_state}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                                                    <div className="flex items-center gap-1.5" title="Weight">
                                                        <Weight className="w-3 h-3 text-sky-400/70" /> {weight}
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="Commodity">
                                                        <Package className="w-3 h-3 text-amber-400/70" /> {commodity}
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="Equipment">
                                                        <Truck className="w-3 h-3 text-indigo-400/70" /> {equipment}
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="Deadhead">
                                                        <Navigation className="w-3 h-3 text-rose-400/70" /> {deadhead || '0mi DH'}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1 font-medium text-foreground"><Clock className="w-3 h-3 text-emerald-500/70" /> {pickupTime}</span>
                                                    <span className="flex items-center gap-1 font-bold text-emerald-400"><DollarSign className="w-3 h-3" /> {rate.toLocaleString()}</span>
                                                    <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-muted text-muted-foreground hover:bg-muted">
                                                        ${(rate / dist).toFixed(2)}/mi
                                                    </Badge>
                                                    <div className="flex-1" />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 -mr-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                        onClick={() => removeLoad(load.id)}
                                                    >
                                                        <span className="sr-only">Remove</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Reorder.Item>
                                    );
                                })}
                            </Reorder.Group>
                        )}

                        <Button asChild variant="outline" className="w-full border-dashed border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary mt-2">
                            <Link href="/dashboard">
                                <Plus className="w-4 h-4 mr-2" /> Add Stop via Dashboard
                            </Link>
                        </Button>
                    </div>
                </ScrollArea>
            </Card>

            {/* Right Panel: Map & Analytics (The "Intelligence Center") */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                {/* Interactive Map */}
                <div className="flex-1 min-h-[400px] border border-border/50 rounded-xl overflow-hidden bg-muted/10 flex flex-col">
                    <RouteBuilderMap loads={loads} className="w-full h-full" />
                </div>

                {/* Bottom Stats Grid */}
                <div className="h-48 grid grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-border/40 opacity-70">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Market Pulse</CardTitle>
                                <Badge variant="outline" className="text-[10px] h-5 bg-background/50 text-muted-foreground">Soon</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium text-muted-foreground/50 flex items-center gap-2 h-12">
                                <TrendingUp className="w-4 h-4 opacity-50" />
                                Real-time rate index
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-border/40 opacity-70">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Risk Analysis</CardTitle>
                                <Badge variant="outline" className="text-[10px] h-5 bg-background/50 text-muted-foreground">Soon</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium text-muted-foreground/50 flex items-center gap-2 h-12">
                                <AlertTriangle className="w-4 h-4 opacity-50" />
                                Weather & theft alerts
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Operating Costs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${Math.round(totals.fuelCost + totals.tollCost).toLocaleString()}</div>
                            <div className="flex flex-col gap-1 mt-2">
                                <span className="text-xs text-muted-foreground flex justify-between">
                                    <span>Fuel</span>
                                    <span>${Math.round(totals.fuelCost).toLocaleString()}</span>
                                </span>
                                {totals.tollCost > 0 && (
                                    <span className="text-xs text-muted-foreground flex justify-between">
                                        <span>Tolls</span>
                                        <span>${Math.round(totals.tollCost).toLocaleString()}</span>
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


