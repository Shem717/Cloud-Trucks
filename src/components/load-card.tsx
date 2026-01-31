import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Map, Star, ChevronDown, ChevronUp,
    Calendar, Weight, Truck, DollarSign, Users, User, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CloudTrucksLoad, CloudTrucksLoadStop } from "@/workers/cloudtrucks-api-client";
import { BrokerLogo } from "./broker-logo";
import { WeatherBadge } from "./weather-badge";
import { FreshnessBadge } from "./freshness-badge";
import { ProfitBadge } from "./profit-badge";
import { FinancialsModule, LogisticsModule, TrustModule, AddressModule } from "./load-card-modules";

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
    cabbieMode?: boolean;
    mpg?: number;
    fuelPrice?: number;
}

export function LoadCard({ load, isSaved, onToggleSaved, onViewMap, cabbieMode, mpg = 6.5, fuelPrice = 3.80 }: LoadCardProps) {
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
    const rpm = (rate && dist) ? (rate / dist).toFixed(2) : null;

    // Fuel & Net Calculations
    const estimatedFuelCost = (dist / mpg) * fuelPrice;
    const netProfit = rate ? rate - estimatedFuelCost : 0;
    const netRpm = (netProfit && dist) ? (netProfit / dist).toFixed(2) : null;

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

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-200 bg-card border-border",
            isExpanded && "ring-1 ring-primary/30"
        )}>
            {/* Main Content */}
            <div className="p-4 space-y-3">
                {/* --- Row 1: Badges & Deadhead --- */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wide bg-muted/50">
                            {equipmentType.toUpperCase().replace(/[^A-Z_]/g, '')}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wide">
                            {isInstantBook ? 'Instant' : 'Standard'}
                        </Badge>
                    </div>

                    {/* Deadhead Display */}
                    <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-sm border border-border/50">
                        <span className="text-emerald-500/80">DH-O: {details.origin_deadhead_mi || 0}</span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="text-rose-500/80">DH-D: {details.dest_deadhead_mi || 0}</span>
                    </div>
                </div>

                {/* --- Row 2: Broker & Time (mono style) --- */}
                {!cabbieMode && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        {details.broker_name && (
                            <>
                                <BrokerLogo name={details.broker_name} size="sm" />
                                <span className="truncate max-w-[100px] uppercase">{details.broker_name}</span>
                            </>
                        )}
                        <span className="ml-auto">
                            {new Date(load.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* --- Row 3: Route (Vertical with dotted line) --- */}
                <div className="space-y-1 py-2">
                    {/* Origin */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-foreground">{origin}</span>
                        </div>
                        <WeatherBadge lat={details.origin_lat} lon={details.origin_lon} city={details.origin_city} state={details.origin_state} size="sm" />
                    </div>

                    {/* Dotted connector */}
                    <div className="flex items-center pl-[3px]">
                        <div className="w-px h-4 border-l border-dashed border-muted-foreground/40 ml-[3px]" />
                    </div>

                    {/* Destination */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-semibold text-foreground">{dest}</span>
                        </div>
                        <WeatherBadge
                            lat={details.dest_lat}
                            lon={details.dest_lon}
                            city={details.dest_city}
                            state={details.dest_state}
                            size="sm"
                            etaHours={dist ? dist / 50 : undefined}
                        />
                    </div>
                </div>

                {/* --- Row 4: Rate, Profit, Miles (inline) --- */}
                <div className={cn(
                    "flex items-center gap-3 flex-wrap pt-3",
                    cabbieMode ? "border-t-2 border-dashed border-border/50 justify-between" : "border-t border-dashed border-border/50"
                )}>
                    <div className="flex flex-col">
                        <span className={cn(
                            "font-bold text-emerald-500 tracking-tight leading-none",
                            cabbieMode ? "text-4xl" : "text-2xl"
                        )}>
                            ${rate?.toLocaleString()}
                        </span>
                        {/* Net Profit Subtext */}
                        {netProfit > 0 && (
                            <span className="text-[10px] uppercase font-mono text-muted-foreground mt-0.5">
                                Net: <span className="text-emerald-400 font-bold">${Math.round(netProfit).toLocaleString()}</span>
                            </span>
                        )}
                    </div>
                    <ProfitBadge revenuePerHour={details.estimated_revenue_per_hour} />
                    <div className={cn(
                        "flex items-center gap-1 text-muted-foreground",
                        cabbieMode ? "text-lg" : "text-sm"
                    )}>
                        <Truck className={cn(cabbieMode ? "h-6 w-6" : "h-4 w-4")} />
                        <span className="font-semibold text-foreground">{dist}mi</span>
                    </div>
                </div>

                {/* --- Row 5: RPM & Solo/Team --- */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {rpm && (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${rpm}/mi</span>
                            {netRpm && (
                                <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-500/20", cabbieMode && "text-xs px-2")}>
                                    Net: ${netRpm}
                                </span>
                            )}
                        </div>
                    )}
                    <Badge variant="secondary" className="text-[10px] font-mono uppercase gap-1">
                        {isTeam ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {isTeam ? 'Team' : 'Solo'}
                    </Badge>
                </div>

                {/* --- Row 6: Dates & Weight --- */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {pickupDate && (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                            <Calendar className="h-3 w-3" />
                            Pick: {new Date(pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(pickupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    )}
                    {deliveryDate && (
                        <span className="flex items-center gap-1.5 text-rose-600">
                            <Calendar className="h-3 w-3" />
                            Drop: {new Date(deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(deliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    )}
                    {weight && (
                        <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                            <Weight className="h-3 w-3" />
                            {(weight / 1000).toFixed(1)}k lbs
                        </span>
                    )}
                </div>
            </div>

            {/* --- Action Bar (Always visible, centered) --- */}
            <div className="border-t border-border bg-muted/30 p-3 flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="outline"
                    size={cabbieMode ? "lg" : "sm"}
                    className={cn(
                        "gap-2 bg-card hover:bg-muted border-border",
                        cabbieMode ? "flex-1 h-12 text-lg" : ""
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
                        isSaved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white",
                        cabbieMode ? "flex-1 h-12 text-lg" : ""
                    )}
                    onClick={onToggleSaved}
                >
                    <Star className={cn("h-4 w-4", isSaved && "fill-current", cabbieMode && "h-6 w-6")} />
                    Save
                </Button>
            </div>

            {/* --- More Data Toggle --- */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors border-t border-border/50 bg-background hover:bg-muted/20"
            >
                More Data
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

