"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, DollarSign, Truck, AlertCircle, ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { BrokerLogo } from "./broker-logo";
import { RouteConditionsPanel } from "./route-conditions-panel";

interface RoutePlanningBoardProps {
    interestedLoads: any[];
    backhaulCriteria: any[];
    backhaulLoads: any[];
}

export function RoutePlanningBoard({ interestedLoads, backhaulCriteria, backhaulLoads }: RoutePlanningBoardProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            if (!confirm(`Permanently delete ${ids.length} routes?`)) return;
            try {
                await fetch(`/api/interested?ids=${ids.join(',')}`, { method: 'DELETE' });
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
                await fetch('/api/interested', {
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
        try {
            await fetch('/api/interested', {
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
    const findMatches = (load: any) => {
        if (!backhaulCriteria) return [];
        return backhaulCriteria.filter(criteria => {
            if (isDeleted(criteria.id)) return false;

            const loadDestCity = (load.details.dest_city || load.details.destination || '').toLowerCase();
            const loadDestState = (load.details.dest_state || '').toLowerCase();
            const critOriginCity = (criteria.origin_city || '').toLowerCase();
            const critOriginState = (criteria.origin_state || '').toLowerCase();

            if (critOriginCity && loadDestCity.includes(critOriginCity)) return true;
            if (!critOriginCity && critOriginState && loadDestState === critOriginState) return true;
            return false;
        });
    };

    // Helper: Safely access equipment
    const getEquipment = (details: any) => {
        if (Array.isArray(details.equipment)) return details.equipment[0];
        return details.equipment || 'Unknown';
    };

    const visibleInterested = interestedLoads.filter(l => !isDeleted(l.id));

    return (
        <div className="grid gap-8">
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
                <div className="flex items-center justify-between bg-white dark:bg-card p-3 rounded-lg border shadow-sm mb-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 ml-2"
                            checked={selectedIds.size === visibleInterested.length && visibleInterested.length > 0}
                            onChange={toggleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground ml-2">
                            {selectedIds.size} routes selected
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
                            "relative z-10 border-l-4 border-l-blue-500 shadow-sm bg-card hover:bg-accent/5 transition-colors group",
                            isSelected && "ring-2 ring-blue-500 bg-blue-50/10"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Outbound Phase 1</Badge>
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
                                                {load.origin_address && (
                                                    <div className="text-xs font-normal text-muted-foreground truncate max-w-[200px]">
                                                        {load.origin_address}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center px-2">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                    {load.distance ? `${load.distance} mi Loaded` : '---'}
                                                </span>
                                                <ArrowRight className="text-muted-foreground h-5 w-5" />
                                            </div>
                                            <div>
                                                <div>{dest}</div>
                                                {load.dest_address && (
                                                    <div className="text-xs font-normal text-muted-foreground truncate max-w-[200px] text-right">
                                                        {load.dest_address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-sm text-muted-foreground items-center">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString() : 'ASAP'}
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
                                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                            <a href={`https://app.cloudtrucks.com/loads/${savedLoad.cloudtrucks_load_id}/book`} target="_blank" rel="noreferrer">
                                                Book Phase 1
                                            </a>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            onClick={() => handleDeleteInterested(savedLoad.id)}
                                            title="Remove Leg"
                                        >
                                            <Trash2 className="h-4 w-4 pointer-events-none" />
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
                            {matches.length > 0 ? (
                                matches.map((criteria) => {
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
                                                                Return Trip (Phase 2)
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
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                                onClick={() => handleDeleteCriteria(criteria.id)}
                                                                title="Stop Scanning (Move to Trash)"
                                                            >
                                                                <Trash2 className="h-4 w-4 pointer-events-none" />
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
                                                            const destStop = lDetails.stops.find((s: any) => s.type === 'DESTINATION');
                                                            if (destStop) {
                                                                deliveryDate = destStop.date_start || destStop.date_end;
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
                                                                                    <span className="font-semibold">{lOrigin}</span>
                                                                                </div>
                                                                                {broker && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <BrokerLogo name={broker} size="sm" />
                                                                                        <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                                                                                            {broker}
                                                                                        </Badge>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {/* Dotted Line */}
                                                                            <div className="ml-1 pl-3 border-l-2 border-dashed border-gray-200 h-4 my-1"></div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-2 h-2 rounded-sm bg-red-500"></span>
                                                                                <span className="font-semibold">{lDest}</span>
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
                            ) : (
                                <div className="ml-2 flex items-center gap-4 text-muted-foreground border-l-2 border-dashed pl-4 py-4 opacity-60 hover:opacity-100 transition-opacity">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>No active backhaul search matching this destination.</span>
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href="/dashboard/interested">Create One</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
