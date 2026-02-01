"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, DollarSign, Truck, AlertCircle, ChevronDown, ChevronUp, Trash2, ExternalLink, Navigation, Users, User, Map, Link2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { BrokerLogo } from "./broker-logo";
import { RouteConditionsPanel } from "./route-conditions-panel";
import { extractLoadAddresses, openInMaps } from "@/lib/address-utils";
import { MultiStopRouteModal } from "./multi-stop-route-modal";

import { SearchCriteria, CloudTrucksLoad, CloudTrucksLoadStop } from "@/workers/cloudtrucks-api-client";
import { SuggestedBackhaul } from "@/app/api/backhauls/route";
import { ProfitBadge } from "@/components/profit-badge";
import { FuelCostBadge } from "@/components/fuel-stop-optimizer";

interface SavedLoad {
    id: string;
    criteria_id: string;
    cloudtrucks_load_id: string;
    status: string;
    created_at: string;
    details: CloudTrucksLoad & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface RoutePlanningBoardProps {
    interestedLoads: SavedLoad[];
    backhaulCriteria: (SearchCriteria & { id: string })[]; // Criteria with ID
    backhaulLoads: SavedLoad[];
    suggestedBackhauls: SuggestedBackhaul[];
}

export function RoutePlanningBoard({ interestedLoads, backhaulCriteria, backhaulLoads, suggestedBackhauls }: RoutePlanningBoardProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedRouteForMap, setSelectedRouteForMap] = useState<{
        outbound: SavedLoad;
        backhaul?: SavedLoad;
    } | null>(null);

    const isDeleted = (id: string) => deletedIds.has(id);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        const visibleIds = interestedLoads.filter(l => !isDeleted(l.id)).map(l => l.id);
        if (selectedIds.size === visibleIds.length && visibleIds.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(visibleIds));
        }
    };

    const handleBatchAction = async (action: 'trash' | 'delete') => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        if (action === 'delete') {
            // Confirmation removed as per user request
            try {
                await fetch(`/api/saved?ids=${ids.join(',')}`, { method: 'DELETE' });
                setDeletedIds(prev => {
                    const next = new Set(prev);
                    ids.forEach(id => next.add(id));
                    return next;
                });
                setSelectedIds(new Set());
            } catch (e) {
                console.error(e);
            }
        } else {
            // Soft Delete (Trash)
            try {
                await fetch('/api/saved', {
                    method: 'PATCH',
                    body: JSON.stringify({ ids, status: 'trash' })
                });
                setDeletedIds(prev => {
                    const next = new Set(prev);
                    ids.forEach(id => next.add(id));
                    return next;
                });
                setSelectedIds(new Set());
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleDeleteInterested = async (id: string) => {
        // Soft Delete (to Trash) by default now
        setDeletedIds(prev => new Set(prev).add(id));
        if (selectedIds.has(id)) toggleSelection(id); // Unselect if it was selected, matching Interested page behavior

        try {
            await fetch('/api/saved', {
                method: 'PATCH',
                body: JSON.stringify({ ids: [id], status: 'trash' })
            });
        } catch (e) {
            console.error(e);
            alert('Failed to delete load');
            setDeletedIds(prev => {
                const n = new Set(prev);
                n.delete(id);
                return n;
            });
        }
    };

    const handleDeleteCriteria = async (id: string) => {
        // Soft delete (instant, no confirm)
        setDeletedIds(prev => new Set(prev).add(id));
        try {
            await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error(e);
            alert('Failed to delete criteria');
            setDeletedIds(prev => {
                const n = new Set(prev);
                n.delete(id);
                return n;
            });
        }
    };

    // Helper to find matches (Client side logic now)
    const findMatches = (savedLoad: SavedLoad) => {
        if (!backhaulCriteria) return [];
        const load = savedLoad.details;
        return backhaulCriteria.filter((criteria) => {
            if (isDeleted(criteria.id)) return false;

            const loadDestCity = String(load.dest_city || load.destination || '').toLowerCase();
            const loadDestState = String(load.dest_state || '').toLowerCase();
            const critOriginCity = (criteria.origin_city || '').toLowerCase();
            const critOriginState = (criteria.origin_state || '').toLowerCase();

            if (critOriginCity && loadDestCity.includes(critOriginCity)) return true;
            if (!critOriginCity && critOriginState && loadDestState === critOriginState) return true;
            return false;
        });
    };

    // Helper: Safely access equipment
    const getEquipment = (details: CloudTrucksLoad & Record<string, unknown>) => {
        if (Array.isArray(details.equipment)) return details.equipment[0];
        return details.equipment || 'Unknown';
    };

    const visibleInterested = interestedLoads.filter(l => !isDeleted(l.id));

    return (
        <>
            <div className="space-y-6">
                {visibleInterested.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                            <AlertCircle className="h-10 w-10 mb-4 opacity-20" />
                            <p>No interested loads found.</p>
                            <Button variant="link" asChild className="mt-2">
                                <Link href="/dashboard">Go find some loads!</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Batch Action Bar */}
                {visibleInterested.length > 0 && (
                    <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-3 rounded-lg border shadow-sm glass-panel">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 ml-2"
                                checked={selectedIds.size === visibleInterested.length && visibleInterested.length > 0}
                                onChange={toggleSelectAll}
                            />
                            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Selection</span>
                            <span className="text-xs font-semibold bg-slate-800/70 text-slate-200 px-2 py-1 rounded-full">
                                {selectedIds.size}/{visibleInterested.length}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <>
                                    <Button size="sm" variant="secondary" onClick={() => handleBatchAction('trash')}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Move to Trash
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleBatchAction('delete')}>
                                        Delete Forever
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {visibleInterested.map((savedLoad) => {
                    const matches = findMatches(savedLoad);
                    const load = savedLoad.details;
                    const origin = load.origin_city ? `${load.origin_city}, ${load.origin_state}` : load.origin;
                    const dest = load.dest_city ? `${load.dest_city}, ${load.dest_state}` : load.destination;

                    // Extract addresses from stops
                    const addresses = extractLoadAddresses(load);
                    const isTeam = load.is_team_load === true;

                    const isSelected = selectedIds.has(savedLoad.id);

                    return (
                        <div key={savedLoad.id} className="relative animate-in fade-in slide-in-from-bottom-2 duration-500 pl-8">
                            {/* Selection Checkbox */}
                            <div className="absolute left-0 top-8 z-20">
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300 cursor-pointer accent-blue-600 shadow-sm"
                                    checked={isSelected}
                                    onChange={() => toggleSelection(savedLoad.id)}
                                />
                            </div>

                            {/* Visual Connector Line */}
                            {matches.length > 0 && (
                                <div className="absolute left-[3rem] top-[6rem] bottom-4 w-[2px] bg-gradient-to-b from-blue-500/30 to-indigo-500/30 -z-10"></div>
                            )}

                            {/* PHASE 1: OUTBOUND CARD */}
                            <Card className={cn(
                                "relative z-10 border-l-4 border-l-blue-500 shadow-sm bg-card/50 backdrop-blur-sm hover:bg-accent/5 transition-all hover:scale-[1.005] group",
                                isSelected && "ring-2 ring-blue-500 bg-blue-50/10"
                            )}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Outbound Phase 1</Badge>
                                                {matches.length > 0 && (
                                                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[10px] gap-1">
                                                        <Link2 className="h-3 w-3" />
                                                        {matches.length} backhaul{matches.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {load.broker_name && (
                                                    <div className="flex items-center gap-2">
                                                        <BrokerLogo name={load.broker_name} size="sm" />
                                                        <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                                                            {load.broker_name}
                                                        </Badge>
                                                    </div>
                                                )}
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    {new Date(savedLoad.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xl font-semibold">
                                                <div>
                                                    <div>{origin}</div>
                                                    {addresses.origin.hasAddress && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-xs font-normal text-muted-foreground truncate max-w-[200px]">
                                                                {addresses.origin.address}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 px-1 text-[10px]"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openInMaps(addresses.origin);
                                                                }}
                                                            >
                                                                <Navigation className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-center px-2">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                        {load.distance ? `${load.distance} mi Loaded` : '---'}
                                                    </span>
                                                    <ArrowRight className="text-muted-foreground h-5 w-5" />
                                                    {/* Team/Solo indicator */}
                                                    {isTeam ? (
                                                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] gap-1 px-1.5 mt-1">
                                                            <Users className="h-3 w-3" /> Team
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px] gap-1 px-1.5 mt-1">
                                                            <User className="h-3 w-3" /> Solo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div>
                                                    <div>{dest}</div>
                                                    {addresses.destination.hasAddress && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-xs font-normal text-muted-foreground truncate max-w-[200px]">
                                                                {addresses.destination.address}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 px-1 text-[10px]"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openInMaps(addresses.destination);
                                                                }}
                                                            >
                                                                <Navigation className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-sm text-muted-foreground items-center">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString() : 'ASAP'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Truck className="h-4 w-4" />
                                                    {getEquipment(load)}
                                                </div>
                                                <div className="flex items-center gap-1 font-medium text-foreground">
                                                    <DollarSign className="h-4 w-4" />
                                                    {load.rate ? load.rate : '---'}
                                                </div>
                                                {load.rate && load.distance && (
                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                        ${(load.rate / load.distance).toFixed(2)}/mi
                                                    </Badge>
                                                )}
                                                {load.total_deadhead_mi && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {load.total_deadhead_mi} mi deadhead
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* View Route button - show outbound only if no matches, or combined if matches exist */}
                                            {matches.length > 0 ? (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        // Get best backhaul match
                                                        const criteriaId = matches[0].id;
                                                        const backhaulMatch = backhaulLoads?.find(l => l.criteria_id === criteriaId);
                                                        setSelectedRouteForMap({
                                                            outbound: savedLoad,
                                                            backhaul: backhaulMatch,
                                                        });
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <Map className="h-4 w-4" />
                                                    View Round Trip
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedRouteForMap({
                                                            outbound: savedLoad,
                                                        });
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <Map className="h-4 w-4" />
                                                    View Route
                                                </Button>
                                            )}

                                            <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                                <a href={`https://app.cloudtrucks.com/loads/${savedLoad.cloudtrucks_load_id}/book`} target="_blank" rel="noreferrer">
                                                    Book Phase 1
                                                </a>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 gap-1 border text-yellow-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-yellow-500/20 px-3"
                                                onClick={() => handleDeleteInterested(savedLoad.id)}
                                                title="Move to Trash"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="text-xs font-semibold">Remove</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Route Conditions Panel */}
                                    <RouteConditionsPanel
                                        originCity={load.origin_city}
                                        originState={load.origin_state}
                                        originLat={load.origin_lat}
                                        originLon={load.origin_lon}
                                        destCity={load.dest_city}
                                        destState={load.dest_state}
                                        destLat={load.dest_lat}
                                        destLon={load.dest_lon}
                                    />

                                </CardContent>
                            </Card>

                            {/* PHASE 2: MATCHING BACKHAUL SECTION */}
                            <div className="pl-8 pt-4 space-y-4">
                                {/* SMART BACKHAUL SUGGESTION (Priority) */}
                                {(() => {
                                    const suggestion = suggestedBackhauls?.find(s => s.saved_load_cloudtrucks_id === savedLoad.cloudtrucks_load_id);

                                    // Helper to safely parse numbers
                                    const safeNum = (val: any) => {
                                        if (typeof val === 'number') return val;
                                        if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
                                        return 0;
                                    };

                                    if (suggestion && suggestion.status === 'found' && suggestion.top_loads && suggestion.top_loads.length > 0) {
                                        const isExpanded = expandedIds.has(suggestion.id);
                                        const foundCount = suggestion.loads_found;

                                        // Calculate Net Profit for the best route (Projected)
                                        const bestLoad = suggestion.top_loads[0];

                                        const outRate = safeNum(load.rate);
                                        const outDist = safeNum(load.distance);

                                        const backRate = safeNum(bestLoad.rate);
                                        const backDist = safeNum(bestLoad.distance);
                                        const backDeadhead = safeNum(bestLoad.deadhead);

                                        const totalRev = outRate + backRate;
                                        const totalDist = outDist + backDist + backDeadhead;
                                        const totalAvgRpm = totalDist > 0 ? (totalRev / totalDist) : 0;

                                        const estFuelCost = (totalDist / 6.5) * 3.80;
                                        const estNetProfit = totalRev - estFuelCost;

                                        // Rough driving time (50mph avg) + 4h load/unload (2h each leg)
                                        const totalHours = (totalDist / 50) + 4;
                                        const revPerHour = totalHours > 0 ? (totalRev / totalHours) : 0;

                                        return (
                                            <div key={suggestion.id} className="space-y-4">
                                                {/* Smart Connector: Round Trip Projection */}
                                                <div className="relative z-0 -mt-2 mb-2 ml-[3rem] p-3 pl-8 bg-gradient-to-r from-slate-100/90 to-slate-50/50 dark:from-slate-900/90 dark:to-slate-950/50 border-l border-b border-dashed border-slate-300 dark:border-slate-800 rounded-bl-2xl flex items-center gap-6 text-sm">

                                                    {/* Revenue Breakdown */}
                                                    <div className="flex flex-col opacity-80">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Est. Revenue</span>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                            ${totalRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>

                                                    <span className="text-muted-foreground font-mono">-</span>

                                                    {/* Fuel Cost */}
                                                    <div className="flex flex-col opacity-80">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Est. Fuel</span>
                                                        <span className="text-sm font-semibold text-rose-600/80 dark:text-rose-400/80">
                                                            ${estFuelCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>

                                                    <span className="text-muted-foreground font-mono">=</span>

                                                    {/* NET PROFIT (HERO) */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Est. Round Trip Net</span>
                                                        <span className={cn("text-lg font-bold font-mono", estNetProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                                            ~${estNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>

                                                    <div className="w-px h-8 bg-slate-300 dark:bg-slate-800 mx-2"></div>

                                                    {/* Secondary Stats */}
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg. RPM</span>
                                                        <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                            ${totalAvgRpm.toFixed(2)}
                                                        </span>
                                                    </div>

                                                    <div className="ml-auto flex items-center gap-2">
                                                        <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
                                                            {totalDist.toLocaleString()} mi total
                                                        </Badge>
                                                        <ProfitBadge revenuePerHour={revPerHour} />
                                                    </div>
                                                </div>

                                                <Card className={cn(
                                                    "relative z-10 border-l-4 transition-all duration-300",
                                                    isExpanded ? "border-l-emerald-500 shadow-md ring-1 ring-emerald-500/20" : "border-l-emerald-500/60 shadow-sm hover:shadow-md hover:border-l-emerald-500 bg-slate-50 dark:bg-slate-900/40"
                                                )}>
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 shadow-none">
                                                                    Smart Suggestion
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Generated {new Date(suggestion.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="font-medium flex items-center gap-2 text-base">
                                                                <span>{suggestion.origin_city}, {suggestion.origin_state}</span>
                                                                <ArrowRight className="h-4 w-4 text-emerald-500" />
                                                                {suggestion.target_states ? (
                                                                    <div className="flex gap-1">
                                                                        {suggestion.target_states.slice(0, 3).map(s => (
                                                                            <Badge key={s} variant="outline" className="font-normal text-xs px-1.5 h-5">{s}</Badge>
                                                                        ))}
                                                                        {suggestion.target_states.length > 3 && (
                                                                            <span className="text-xs text-muted-foreground self-center">+{suggestion.target_states.length - 3}</span>
                                                                        )}
                                                                    </div>
                                                                ) : 'Any'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                                                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-medium">
                                                                    Best: {suggestion.best_rpm ? `$${suggestion.best_rpm.toFixed(2)}/mi` : 'N/A'}
                                                                </span>
                                                                <span>•</span>
                                                                <span>Avg: {suggestion.avg_rpm ? `$${suggestion.avg_rpm.toFixed(2)}/mi` : 'N/A'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{foundCount}</div>
                                                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Loads</div>
                                                            </div>

                                                            <Button
                                                                size="sm"
                                                                variant={isExpanded ? "ghost" : "default"}
                                                                className={cn(
                                                                    "h-9 text-xs min-w-[100px] transition-all",
                                                                    !isExpanded && "bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-emerald-500/20"
                                                                )}
                                                                onClick={() => toggleExpand(suggestion.id)}
                                                            >
                                                                {isExpanded ? (
                                                                    <><ChevronUp className="h-3 w-3 mr-1" /> Hide List</>
                                                                ) : (
                                                                    <><ChevronDown className="h-3 w-3 mr-1" /> View Loads</>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* EXPANDED SMART GRID */}
                                                {isExpanded && (
                                                    <div className="grid gap-3 pt-2 pl-4 border-l-2 border-emerald-200 dark:border-emerald-900 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                                            {suggestion.top_loads.map((match, idx) => (
                                                                <Card key={match.id || idx} className="bg-white dark:bg-black border shadow-sm text-sm overflow-hidden hover:border-emerald-400 transition-colors group">
                                                                    <CardContent className="p-3">
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div className="space-y-1 flex-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Badge variant="outline" className="border-slate-700 text-slate-500 text-[10px] h-5 px-1">
                                                                                            #{idx + 1}
                                                                                        </Badge>
                                                                                        <span className="font-semibold">{match.origin_city}, {match.origin_state}</span>
                                                                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                                                        <span className="font-semibold">{match.dest_city}, {match.dest_state}</span>
                                                                                    </div>
                                                                                    {match.equipment && (
                                                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                                            <Truck className="h-3 w-3" />
                                                                                            {Array.isArray(match.equipment) ? match.equipment[0] : match.equipment}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Calendar className="h-3 w-3" />
                                                                                        {match.pickup_date ? new Date(match.pickup_date).toLocaleDateString() : 'ASAP'}
                                                                                    </span>
                                                                                    <span>•</span>
                                                                                    <span>{Math.round(match.distance)} mi</span>
                                                                                    <span>•</span>
                                                                                    <span>{match.deadhead} mi deadhead</span>
                                                                                    <div className="ml-auto flex items-center gap-2">
                                                                                        <FuelCostBadge distance={match.distance} size="sm" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                                                                <div className="text-right">
                                                                                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                                                        ${match.rate ? match.rate.toLocaleString() : '---'}
                                                                                    </div>
                                                                                    <div className="text-xs font-mono text-emerald-600 font-bold">
                                                                                        ${match.rpm}/mi
                                                                                    </div>
                                                                                </div>
                                                                                <Button size="sm" className="h-7 w-full text-xs bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600" asChild>
                                                                                    <a href={`https://app.cloudtrucks.com/loads/${match.id}/book`} target="_blank" rel="noreferrer">
                                                                                        Book Phase 2
                                                                                    </a>
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}

                                                            {/* Result Count Footer */}
                                                            <div className="text-center text-xs text-muted-foreground py-2 border-t border-dashed border-slate-200 dark:border-slate-800 mt-2">
                                                                Showing top {suggestion.top_loads.length} of {foundCount} suggested loads
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // FALLBACK: Legacy Criteria Matches
                                    if (matches.length > 0) {
                                        return matches.map((criteria) => {
                                            const criteriaMatches = backhaulLoads?.filter(l => l.criteria_id === criteria.id) || [];
                                            const foundCount = criteriaMatches.length;
                                            const isExpanded = expandedIds.has(criteria.id);

                                            return (
                                                <div key={criteria.id} className="space-y-2">
                                                    <Card className="relative z-10 border-l-4 border-l-indigo-500 bg-slate-50 dark:bg-slate-900/50">
                                                        <CardContent className="p-4 flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
                                                                        Return Trip (Phase 2 Match)
                                                                    </Badge>
                                                                </div>
                                                                <div className="font-medium flex items-center gap-2">
                                                                    {criteria.origin_city}, {criteria.origin_state}
                                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                                    {criteria.dest_city || 'Any'}, {criteria.destination_state || 'Any'}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Target: {criteria.equipment_type || 'Any'} • ${criteria.min_rate}+
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{foundCount}</div>
                                                                    <div className="text-[10px] uppercase font-medium text-muted-foreground">Loads Found</div>
                                                                </div>

                                                                <div className="flex flex-col gap-1">
                                                                    {foundCount > 0 && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant={isExpanded ? "secondary" : "outline"}
                                                                            className="h-8 text-xs w-24"
                                                                            onClick={() => toggleExpand(criteria.id)}
                                                                        >
                                                                            {isExpanded ? (
                                                                                <><ChevronUp className="h-3 w-3 mr-1" /> Hide</>
                                                                            ) : (
                                                                                <><ChevronDown className="h-3 w-3 mr-1" /> View Loads</>
                                                                            )}
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 gap-1 border text-yellow-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-yellow-500/20 px-2"
                                                                        onClick={() => handleDeleteCriteria(criteria.id)}
                                                                        title="Stop Scanning (Move to Trash)"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        <span className="text-[10px] font-semibold uppercase">Remove</span>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    {/* EXPANDED LOADS GRID */}
                                                    {isExpanded && foundCount > 0 && (
                                                        <div className="grid gap-3 pt-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                            {criteriaMatches.map(match => {
                                                                const lDetails = match.details;
                                                                const lOrigin = lDetails.origin_city ? `${lDetails.origin_city}, ${lDetails.origin_state}` : lDetails.origin;
                                                                const lDest = lDetails.dest_city ? `${lDetails.dest_city}, ${lDetails.dest_state}` : lDetails.destination;

                                                                // Extract addresses for backhaul loads
                                                                const lAddresses = extractLoadAddresses(lDetails);
                                                                const lIsTeam = lDetails.is_team_load === true;

                                                                // Derived Stats
                                                                const rawRate = lDetails.rate || lDetails.trip_rate;
                                                                const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;

                                                                const rawDist = lDetails.distance || lDetails.trip_distance_mi;
                                                                const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
                                                                const rpm = (rate && dist) ? (rate / dist).toFixed(2) : null;
                                                                const isGoodRate = rpm && parseFloat(rpm) >= 2.5;

                                                                // Delivery Date Logic
                                                                let deliveryDate = lDetails.dest_delivery_date;
                                                                if (!deliveryDate && Array.isArray(lDetails.stops)) {
                                                                    const destStop = (lDetails.stops as CloudTrucksLoadStop[]).find((s) => s.type === 'DESTINATION');
                                                                    if (destStop) {
                                                                        deliveryDate = destStop.date_start || destStop.date_end || '';
                                                                    }
                                                                }

                                                                const broker = lDetails.broker_name;
                                                                const weight = lDetails.weight || lDetails.truck_weight_lb;

                                                                return (
                                                                    <Card key={match.cloudtrucks_load_id} className="bg-white dark:bg-black border shadow-sm text-sm overflow-hidden hover:border-indigo-300 transition-colors">
                                                                        <CardContent className="p-3">
                                                                            <div className="flex items-start justify-between gap-4">
                                                                                {/* Route Info */}
                                                                                <div className="space-y-1 flex-1">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                                                            <div>
                                                                                                <span className="font-semibold">{lOrigin}</span>
                                                                                                {lAddresses.origin.hasAddress && (
                                                                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                                                                        {lAddresses.origin.address}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            {lIsTeam ? (
                                                                                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[9px] gap-0.5 px-1">
                                                                                                    <Users className="h-2.5 w-2.5" /> Team
                                                                                                </Badge>
                                                                                            ) : (
                                                                                                <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] gap-0.5 px-1">
                                                                                                    <User className="h-2.5 w-2.5" /> Solo
                                                                                                </Badge>
                                                                                            )}
                                                                                            {broker && (
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <BrokerLogo name={broker} size="sm" />
                                                                                                    <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                                                                                                        {broker}
                                                                                                    </Badge>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* Dotted Line */}
                                                                                    <div className="ml-1 pl-3 border-l-2 border-dashed border-gray-200 h-4 my-1"></div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="w-2 h-2 rounded-sm bg-red-500"></span>
                                                                                        <div>
                                                                                            <span className="font-semibold">{lDest}</span>
                                                                                            {lAddresses.destination.hasAddress && (
                                                                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                                                                    {lAddresses.destination.address}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2 pl-4">
                                                                                        <span className="flex items-center gap-1">
                                                                                            <Calendar className="h-3 w-3" />
                                                                                            {lDetails.pickup_date ? new Date(lDetails.pickup_date).toLocaleDateString() : 'ASAP'}
                                                                                            <ArrowRight className="h-3 w-3 mx-1" />
                                                                                            {deliveryDate ? new Date(deliveryDate).toLocaleDateString() : <span className="text-muted-foreground/60 italic">Drop: Unavailable</span>}
                                                                                        </span>
                                                                                        <span className="flex items-center gap-1">
                                                                                            <Truck className="h-3 w-3" />
                                                                                            {getEquipment(lDetails)}
                                                                                        </span>
                                                                                        {weight && (
                                                                                            <span>{(weight / 1000).toFixed(1)}k lbs</span>
                                                                                        )}
                                                                                        {dist && (
                                                                                            <span>{dist.toFixed(0)} mi</span>
                                                                                        )}
                                                                                        {/* Add FuelCostBadge to Legacy matches too */}
                                                                                        <div className="ml-auto">
                                                                                            <FuelCostBadge distance={dist || 0} size="sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Rate Info */}
                                                                                <div className="flex flex-col items-end gap-2 min-w-[100px]">
                                                                                    <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg text-right border">
                                                                                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                                                            ${rate ? rate.toLocaleString() : '---'}
                                                                                        </div>
                                                                                        {rpm && (
                                                                                            <div className={cn("text-xs font-mono", isGoodRate ? "text-green-600 font-bold" : "text-muted-foreground")}>
                                                                                                ${rpm} / mi
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <Button size="sm" className="h-8 w-full text-xs bg-indigo-600 hover:bg-indigo-700" asChild>
                                                                                        <a href={`https://app.cloudtrucks.com/loads/${match.cloudtrucks_load_id}/book`} target="_blank" rel="noreferrer">
                                                                                            Book <ExternalLink className="ml-1 h-3 w-3" />
                                                                                        </a>
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    }

                                    return (
                                        <div className="ml-2 flex items-center gap-4 text-muted-foreground border-l-2 border-dashed pl-4 py-4 opacity-60 hover:opacity-100 transition-opacity">
                                            <AlertCircle className="h-5 w-5" />
                                            <span>No active backhaul search matching this destination.</span>
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href="/saved">Create One</Link>
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Multi-Stop Route Modal */}
            {selectedRouteForMap && (
                <MultiStopRouteModal
                    isOpen={!!selectedRouteForMap}
                    onClose={() => setSelectedRouteForMap(null)}
                    loads={selectedRouteForMap.backhaul ? [selectedRouteForMap.outbound, selectedRouteForMap.backhaul] : [selectedRouteForMap.outbound]}
                    title={selectedRouteForMap.backhaul ? 'Round Trip Route Visualization' : 'Outbound Route'}
                />
            )}
        </>
    );
}
