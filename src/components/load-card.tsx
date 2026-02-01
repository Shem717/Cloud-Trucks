import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Map, Star, ChevronDown, ChevronUp,
    Calendar, Weight, Truck, DollarSign, Users, User, ArrowRight, Flame, Route
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CloudTrucksLoad, CloudTrucksLoadStop } from "@/workers/cloudtrucks-api-client";
import { BrokerLogo } from "./broker-logo";
import { WeatherBadge } from "./weather-badge";
import { FinancialsModule, LogisticsModule, TrustModule, AddressModule } from "./load-card-modules";
import { HOSBadge } from "./hos-tracker";
import { BrokerReliabilityBadge } from "./broker-reliability";
import { FuelStopOptimizer, FuelCostBadge } from "./fuel-stop-optimizer";

interface LoadCardProps {
    load: {
        id: string;
        created_at: string;
        updated_at?: string;
        scan_count?: number;
        details: CloudTrucksLoad & Record<string, any>;
    };
    isSaved: boolean;
    onToggleSaved: (e: React.MouseEvent) => void;
    onViewMap: (e: React.MouseEvent) => void;
    onCompare?: (e: React.MouseEvent) => void;
    onAddToRoute?: (e: React.MouseEvent) => void;
    isSelected?: boolean;
    isInRouteBuilder?: boolean;
    cabbieMode?: boolean;
    mpg?: number;
    fuelPrice?: number;
}

export function LoadCard({ load, isSaved, onToggleSaved, onViewMap, onCompare, onAddToRoute, isSelected, isInRouteBuilder, cabbieMode, mpg = 6.5, fuelPrice = 3.80 }: LoadCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // --- Derived Data ---
    const details = load.details;
    const origin = details.origin_city ? `${details.origin_city}, ${details.origin_state}` : details.origin;
    const dest = details.dest_city ? `${details.dest_city}, ${details.dest_state}` : details.destination;

    // Rates & Distances
    const rawRate = details.rate || details.trip_rate;
    const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
    const rawDist = details.distance || details.trip_distance_mi;
    const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
    const rpm = (rate && dist) ? (rate / dist) : null;
    const rpmFormatted = rpm ? rpm.toFixed(2) : null;

    // Fuel & Net Calculations
    const estimatedFuelCost = dist ? (dist / mpg) * fuelPrice : 0;
    const netProfit = rate ? rate - estimatedFuelCost : 0;
    const netRpm = (netProfit && dist) ? (netProfit / dist) : null;
    const netRpmFormatted = netRpm ? netRpm.toFixed(2) : null;

    // Is this a "hot" load? (>$3/mi gross or >$2.50/mi net)
    const isHotLoad = rpm && rpm >= 3.0;

    // Dates
    const pickupDate = details.pickup_date || details.origin_pickup_date;
    let deliveryDate = details.dest_delivery_date;
    if (!deliveryDate && Array.isArray(details.stops)) {
        const destStop = (details.stops as CloudTrucksLoadStop[]).find((s) => s.type === 'DESTINATION');
        if (destStop) {
            deliveryDate = destStop.date_start || destStop.date_end || '';
        }
    }

    // Weight
    const weight = details.weight || details.truck_weight_lb;
    const weightFormatted = weight ? `${(weight / 1000).toFixed(1)}k` : null;

    // Badges
    const isInstantBook = details.instant_book === true;
    const isTeam = details.is_team_load === true;
    const hasAutoBid = details.has_auto_bid === true;

    // Helper to get equipment string safely
    const getEquipmentString = () => {
        if (Array.isArray(details.equipment)) {
            return details.equipment[0] || 'UNK';
        }
        return details.equipment || 'UNK';
    };

    const equipmentType = getEquipmentString();

    // Format date compactly
    const formatDate = (date: string | number) => {
        const d = new Date(date);
        return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    };

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-200 bg-card border-border",
            isExpanded && "ring-1 ring-primary/30",
            isHotLoad && "border-l-4 border-l-orange-500",
            isSelected && "ring-2 ring-blue-500",
            cabbieMode && "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.1)] dark:bg-slate-950"
        )}>
            {/* ============================================ */}
            {/* DECISION-FIRST LAYOUT                       */}
            {/* ============================================ */}
            <div className={cn("p-4", cabbieMode && "p-5")}>

                {/* --- ROW 1: HERO - Rate & Net Profit (THE DECISION) --- */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-col">
                        {/* Gross Rate - BIG */}
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "font-bold text-emerald-500 tracking-tight",
                                cabbieMode ? "text-5xl" : "text-3xl"
                            )}>
                                ${rate?.toLocaleString()}
                            </span>
                            {isHotLoad && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
                                    <Flame className="h-3 w-3" /> HOT
                                </Badge>
                            )}
                            {dist && <HOSBadge distanceMiles={dist} />}
                        </div>
                        {/* Net Profit - Secondary but visible */}
                        {netProfit > 0 && (
                            <div className={cn(
                                "flex items-center gap-2 mt-1",
                                cabbieMode ? "text-lg" : "text-sm"
                            )}>
                                <span className="text-muted-foreground">Net:</span>
                                <span className="font-bold text-emerald-400">${Math.round(netProfit).toLocaleString()}</span>
                                <span className="text-muted-foreground/60">after fuel</span>
                            </div>
                        )}
                    </div>

                    {/* Equipment & Booking Type Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                        <Badge variant="outline" className={cn(
                            "font-mono uppercase tracking-wide bg-muted/50",
                            cabbieMode ? "text-sm px-3 py-1" : "text-[10px]"
                        )}>
                            {equipmentType.toUpperCase().replace(/[^A-Z_]/g, '')}
                        </Badge>
                        <Badge className={cn(
                            "font-mono uppercase gap-1",
                            isInstantBook
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30",
                            cabbieMode ? "text-sm px-3 py-1" : "text-[10px]"
                        )}>
                            {isInstantBook && <Zap className="h-3 w-3" />}
                            {isInstantBook ? 'Instant' : 'Standard'}
                        </Badge>
                    </div>
                </div>

                {/* --- ROW 2: Route Summary (Single Line) --- */}
                <div className={cn(
                    "flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg mb-3",
                    cabbieMode && "py-3 px-4"
                )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className={cn(
                            "font-semibold text-foreground truncate",
                            cabbieMode ? "text-xl" : "text-base"
                        )}>
                            {origin}
                        </span>
                        <ArrowRight className={cn("text-muted-foreground flex-shrink-0", cabbieMode ? "h-5 w-5" : "h-4 w-4")} />
                        <span className={cn(
                            "font-semibold text-foreground truncate",
                            cabbieMode ? "text-xl" : "text-base"
                        )}>
                            {dest}
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 text-muted-foreground flex-shrink-0 font-mono",
                        cabbieMode ? "text-lg" : "text-sm"
                    )}>
                        <Truck className={cn(cabbieMode ? "h-5 w-5" : "h-4 w-4")} />
                        <span className="font-semibold text-foreground">{dist} mi</span>
                    </div>
                </div>

                {/* --- ROW 3: RPM Comparison (Gross vs Net) + Weight --- */}
                <div className={cn(
                    "flex items-center justify-between gap-4 mb-3",
                    cabbieMode && "mb-4"
                )}>
                    <div className="flex items-center gap-4">
                        {/* Gross RPM */}
                        {rpmFormatted && (
                            <div className={cn("flex items-center gap-1", cabbieMode ? "text-lg" : "text-sm")}>
                                <DollarSign className={cn("text-muted-foreground", cabbieMode ? "h-5 w-5" : "h-4 w-4")} />
                                <span className="font-semibold">{rpmFormatted}</span>
                                <span className="text-muted-foreground">/mi</span>
                            </div>
                        )}
                        {/* Net RPM (highlighted) */}
                        {netRpmFormatted && (
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20",
                                cabbieMode ? "text-base px-3 py-1" : "text-xs"
                            )}>
                                <span className="text-emerald-400 font-bold">${netRpmFormatted}</span>
                                <span className="text-emerald-400/70">/mi net</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Weight */}
                        {weightFormatted && (
                            <div className={cn(
                                "flex items-center gap-1 text-muted-foreground",
                                cabbieMode ? "text-base" : "text-xs"
                            )}>
                                <Weight className={cn(cabbieMode ? "h-4 w-4" : "h-3 w-3")} />
                                <span>{weightFormatted} lbs</span>
                            </div>
                        )}
                        {/* Solo/Team Badge */}
                        <Badge variant="secondary" className={cn(
                            "font-mono uppercase gap-1",
                            cabbieMode ? "text-sm" : "text-[10px]"
                        )}>
                            {isTeam ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {isTeam ? 'Team' : 'Solo'}
                        </Badge>
                    </div>
                </div>

                {/* --- ROW 4: Dates (Pickup → Delivery) --- */}
                <div className={cn(
                    "flex items-center gap-4 mb-3",
                    cabbieMode ? "text-base" : "text-xs"
                )}>
                    {pickupDate && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className={cn("text-emerald-500", cabbieMode ? "h-4 w-4" : "h-3 w-3")} />
                            <span className="text-emerald-600 font-medium">Pick: {formatDate(pickupDate)}</span>
                        </div>
                    )}
                    {pickupDate && deliveryDate && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    )}
                    {deliveryDate && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className={cn("text-rose-500", cabbieMode ? "h-4 w-4" : "h-3 w-3")} />
                            <span className="text-rose-600 font-medium">Drop: {formatDate(deliveryDate)}</span>
                        </div>
                    )}
                </div>

                {/* --- ROW 5: Secondary Info (Deadhead, Broker, Weather) --- */}
                {!cabbieMode && (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/30 pt-2">
                        <div className="flex items-center gap-3">
                            {/* Deadhead */}
                            <div className="flex items-center gap-1 font-mono">
                                <span className="text-emerald-500/70">DH-O: {details.origin_deadhead_mi || 0}</span>
                                <span className="text-muted-foreground/30">|</span>
                                <span className="text-rose-500/70">DH-D: {details.dest_deadhead_mi || 0}</span>
                            </div>
                            {/* Broker */}
                            {details.broker_name && (
                                <div className="flex items-center gap-1.5">
                                    <BrokerLogo name={details.broker_name} size="sm" />
                                    <span className="truncate max-w-[80px]">{details.broker_name}</span>
                                    <BrokerReliabilityBadge brokerName={details.broker_name} size="sm" />
                                </div>
                            )}
                        </div>
                        {/* Weather badges */}
                        <div className="flex items-center gap-2">
                            <WeatherBadge lat={details.origin_lat} lon={details.origin_lon} city={details.origin_city} state={details.origin_state} size="sm" />
                            <WeatherBadge lat={details.dest_lat} lon={details.dest_lon} city={details.dest_city} state={details.dest_state} size="sm" etaHours={dist ? dist / 50 : undefined} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- ACTION BAR (Always Visible) --- */}
            <div className={cn(
                "border-t border-border bg-muted/30 p-3 flex justify-center gap-2",
                cabbieMode && "p-4 gap-3"
            )} onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="outline"
                    size={cabbieMode ? "lg" : "sm"}
                    className={cn(
                        "gap-2 bg-card hover:bg-muted border-border",
                        cabbieMode ? "flex-1 h-14 text-lg" : ""
                    )}
                    onClick={onViewMap}
                >
                    <Map className={cn("h-4 w-4", cabbieMode && "h-6 w-6")} />
                    Route
                </Button>
                <Button
                    size={cabbieMode ? "lg" : "sm"}
                    className={cn(
                        "gap-2",
                        isSaved
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white",
                        cabbieMode ? "flex-1 h-14 text-lg" : ""
                    )}
                    onClick={onToggleSaved}
                >
                    <Star className={cn("h-4 w-4", isSaved && "fill-current", cabbieMode && "h-6 w-6")} />
                    {isSaved ? 'Saved' : 'Save'}
                </Button>
                {onAddToRoute && (
                    <Button
                        variant="outline"
                        size={cabbieMode ? "lg" : "sm"}
                        className={cn(
                            "gap-2 border-border",
                            isInRouteBuilder && "bg-indigo-500/20 border-indigo-500 text-indigo-400",
                            cabbieMode ? "h-14 text-lg px-4" : ""
                        )}
                        onClick={onAddToRoute}
                    >
                        <Route className={cn("h-4 w-4", cabbieMode && "h-6 w-6")} />
                        {isInRouteBuilder ? 'Added' : 'Route'}
                    </Button>
                )}
                {onCompare && (
                    <Button
                        variant="outline"
                        size={cabbieMode ? "lg" : "sm"}
                        className={cn(
                            "gap-2 border-border",
                            isSelected && "bg-blue-500/20 border-blue-500",
                            cabbieMode ? "h-14 text-lg px-4" : ""
                        )}
                        onClick={onCompare}
                    >
                        {isSelected ? '✓' : '+'}
                    </Button>
                )}
            </div>

            {/* --- More Data Toggle --- */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors border-t border-border/50 bg-background hover:bg-muted/20",
                    cabbieMode && "py-3 text-sm"
                )}
            >
                {isExpanded ? 'Less Details' : 'More Details'}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* --- EXPANDED DETAILS --- */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden bg-muted/20 border-t border-border/50"
                    >
                        <div className="p-4 grid gap-4" onClick={(e) => e.stopPropagation()}>
                            {/* Fuel Stop Optimizer */}
                            {dist && (
                                <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                    <FuelCostBadge distance={dist} mpg={mpg} fuelPrice={fuelPrice} />
                                    <FuelStopOptimizer
                                        originCity={details.origin_city}
                                        originState={details.origin_state}
                                        destCity={details.dest_city}
                                        destState={details.dest_state}
                                        distance={dist}
                                        mpg={mpg}
                                    />
                                    <span className="text-xs text-muted-foreground">Find optimal fuel stops along this route</span>
                                </div>
                            )}

                            {/* Detailed Modules */}
                            <FinancialsModule
                                fuelCost={details.estimated_fuel_cost}
                                tollCost={details.estimated_toll_cost}
                                revenuePerHour={details.estimated_revenue_per_hour}
                                tripRate={rate}
                            />

                            <LogisticsModule
                                originDeadhead={details.origin_deadhead_mi}
                                destDeadhead={details.dest_deadhead_mi}
                                truckLength={details.truck_length_ft}
                                weight={weight}
                                warnings={details.trailer_drop_warnings}
                                isTeam={isTeam}
                                hasAutoBid={hasAutoBid}
                            />

                            <TrustModule
                                brokerName={details.broker_name}
                                mcNumber={details.broker_mc_number}
                                phone={details.contact_phone}
                                email={details.contact_email}
                            />

                            <AddressModule
                                originAddress={details.origin_address}
                                destAddress={details.dest_address}
                                originCity={details.origin_city}
                                originState={details.origin_state}
                                destCity={details.dest_city}
                                destState={details.dest_state}
                                stops={details.stops}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
