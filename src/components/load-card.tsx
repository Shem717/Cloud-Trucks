import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Map, Star, ChevronDown, ChevronUp, ArrowRight,
    Calendar, Weight, Truck, DollarSign, Users, User
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
        details: CloudTrucksLoad & Record<string, any>;
    };
    isSaved: boolean;
    onToggleSaved: (e: React.MouseEvent) => void;
    onViewMap: (e: React.MouseEvent) => void;
}

export function LoadCard({ load, isSaved, onToggleSaved, onViewMap }: LoadCardProps) {
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

    return (
        <Card
            className={cn(
                "group overflow-hidden transition-all border bg-card/50 backdrop-blur-sm flex flex-col h-fit cursor-pointer",
                isExpanded ? "ring-2 ring-primary/20 shadow-2xl scale-[1.01] z-10" : "hover:scale-[1.02] hover:shadow-xl"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="p-4 space-y-3">
                {/* --- Row 1: Badges & Time --- */}
                <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                            {details.equipment}
                        </Badge>
                        {isInstantBook ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px] gap-1 px-1.5">
                                <Zap className="h-3 w-3" />Instant
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5">Standard</Badge>
                        )}
                        {/* New Freshness Badge */}
                        <FreshnessBadge ageMin={details.age_min} />
                    </div>

                    <div className="flex items-center gap-2">
                        {details.broker_name && (
                            <div className="flex items-center gap-1">
                                <BrokerLogo name={details.broker_name} size="sm" />
                                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                                    {details.broker_name}
                                </span>
                            </div>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                            {new Date(load.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* --- Row 2: Route --- */}
                <div className="space-y-1 my-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse"></div>
                        <div className="font-semibold text-sm truncate flex-1" title={origin}>{origin}</div>
                        <WeatherBadge lat={details.origin_lat} lon={details.origin_lon} city={details.origin_city} state={details.origin_state} size="sm" />
                    </div>
                    <div className="pl-1 border-l-2 border-dashed border-muted h-3 ml-0.5"></div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                        <div className="font-semibold text-sm truncate flex-1" title={dest}>{dest}</div>
                        <WeatherBadge lat={details.dest_lat} lon={details.dest_lon} city={details.dest_city} state={details.dest_state} size="sm" />
                    </div>
                </div>

                {/* --- Row 3: Key Metrics (Collapsed View) --- */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-dashed">
                    {/* Price - Green & Bold */}
                    <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-extrabold text-lg drop-shadow-sm">
                        ${rate?.toLocaleString()}
                    </div>

                    {/* Profit Badge (New) */}
                    <ProfitBadge revenuePerHour={details.estimated_revenue_per_hour} />

                    {/* Miles - Bold White */}
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        {dist}mi
                    </div>

                    {rpm && (
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                            <DollarSign className="h-3 w-3" />
                            ${rpm}/mi
                        </div>
                    )}

                    {/* Team/Solo Indicator */}
                    {isTeam ? (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] gap-1 px-1.5">
                            <Users className="h-3 w-3" /> Team
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px] gap-1 px-1.5">
                            <User className="h-3 w-3" /> Solo
                        </Badge>
                    )}
                </div>

                {/* --- Row 4: Dates & Weight --- */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    {pickupDate && (
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                            <Calendar className="h-3 w-3" />
                            Pick: {new Date(pickupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(pickupDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {deliveryDate && (
                        <div className="flex items-center gap-1 text-red-700 dark:text-red-400">
                            <Calendar className="h-3 w-3" />
                            Drop: {new Date(deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(deliveryDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {weight && (
                        <div className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {(weight / 1000).toFixed(1)}k lbs
                        </div>
                    )}
                </div>
            </div>

            {/* --- Buttons (Always Visible) --- */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t" onClick={(e) => e.stopPropagation()}>
                {/* Action Buttons Row */}
                <div className="p-3 pb-2 flex justify-end items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 gap-1" onClick={onViewMap}>
                        <Map className="h-3 w-3" /> Route
                    </Button>
                    <Button
                        size="sm"
                        className={cn(
                            "h-7 px-3 gap-1 text-white",
                            isSaved ? "bg-green-600 hover:bg-green-700" : "bg-green-600/60 hover:bg-green-600"
                        )}
                        onClick={onToggleSaved}
                        title={isSaved ? "Saved" : "Save Load"}
                    >
                        <Star className={cn("h-3 w-3", isSaved && "fill-current")} />
                        {isSaved ? "Saved" : "Save"}
                    </Button>
                </div>
                {/* Expand Toggle Row */}
                <div
                    className="px-3 pb-2 flex justify-center items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? "Less Details" : "More Data"}
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
            </div>

            {/* --- EXPANDED "COCKPIT" VIEW --- */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur-sm border-t border-dashed"
                    >
                        <div className="p-4 grid gap-5" onClick={(e) => e.stopPropagation()}>
                            {/* Financials */}
                            <FinancialsModule
                                fuelCost={details.estimated_fuel_cost}
                                tollCost={details.estimated_toll_cost}
                                revenuePerHour={details.estimated_revenue_per_hour}
                                tripRate={rate}
                            />

                            {/* Logistics */}
                            <LogisticsModule
                                originDeadhead={details.origin_deadhead_mi}
                                destDeadhead={details.dest_deadhead_mi}
                                truckLength={details.truck_length_ft}
                                weight={weight}
                                warnings={details.trailer_drop_warnings}
                                isTeam={isTeam}
                                hasAutoBid={hasAutoBid}
                            />

                            {/* Trust */}
                            <TrustModule
                                brokerName={details.broker_name}
                                mcNumber={details.broker_mc_number}
                                phone={details.contact_phone}
                                email={details.contact_email}
                            />

                            {/* Addresses */}
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
