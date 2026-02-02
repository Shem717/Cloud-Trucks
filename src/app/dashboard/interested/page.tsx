'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Weight, Calendar, Truck, Trash2, ArrowLeft, ArrowLeftRight, RefreshCw, Navigation } from 'lucide-react'
import { cn } from "@/lib/utils"
import { BrokerLogo } from "@/components/broker-logo"
import { WeatherBadge } from "@/components/weather-badge"
import { BrokerReliabilityBadge } from "@/components/broker-reliability"
import { ProfitBadge } from "@/components/profit-badge"
import { FreshnessBadge } from "@/components/freshness-badge"
import { FuelStopOptimizer, FuelCostBadge } from "@/components/fuel-stop-optimizer"

// Reuse types if possible, or redefine for speed given simple page
interface Load {
    id: string; // Internal interest ID
    created_at: string;
    cloudtrucks_load_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any;
}

export default function InterestedPage() {
    const [loads, setLoads] = useState<Load[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [backhaulingId, setBackhaulingId] = useState<string | null>(null)

    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')

    useEffect(() => {
        fetchInterested()
    }, [viewMode])

    const fetchInterested = async () => {
        try {
            const res = await fetch(`/api/interested${viewMode === 'trash' ? '?view=trash' : ''}`)
            const result = await res.json()
            if (result.loads) {
                setLoads(result.loads)
            }
        } catch (error) {
            console.error('Failed to fetch interested loads:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === loads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(loads.map(l => l.id)));
        }
    };

    const handleBatchAction = async (action: 'trash' | 'delete' | 'restore') => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        if (action === 'restore') {
            try {
                await fetch('/api/interested', {
                    method: 'PATCH',
                    body: JSON.stringify({ ids, status: 'interested' })
                });
                setLoads(prev => prev.filter(l => !selectedIds.has(l.id)));
                setSelectedIds(new Set());
            } catch (e) {
                console.error(e);
            }
            return;
        }

        if (action === 'delete') {
            if (!confirm(`Permanently delete ${ids.length} loads? This cannot be undone.`)) return;
            // Hard Delete
            try {
                await fetch(`/api/interested?ids=${ids.join(',')}`, { method: 'DELETE' });
                setLoads(prev => prev.filter(l => !selectedIds.has(l.id)));
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
                setLoads(prev => prev.filter(l => !selectedIds.has(l.id)));
                setSelectedIds(new Set());
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleSoftDelete = async (id: string) => {
        // Optimistic
        setLoads(prev => prev.filter(l => l.id !== id));
        if (selectedIds.has(id)) toggleSelection(id);
        setDeletingId(id);

        try {
            await fetch('/api/interested', {
                method: 'PATCH',
                body: JSON.stringify({ ids: [id], status: 'trash' })
            });
        } catch (error) {
            console.error('Failed to trash load:', error);
            fetchInterested();
        } finally {
            setDeletingId(null);
        }
    }

    const handleRestore = async (id: string) => {
        // Optimistic
        setLoads(prev => prev.filter(l => l.id !== id));
        if (selectedIds.has(id)) toggleSelection(id);

        try {
            await fetch('/api/interested', {
                method: 'PATCH',
                body: JSON.stringify({ ids: [id], status: 'interested' })
            });
        } catch (error) {
            console.error('Failed to restore load:', error);
            fetchInterested();
        }
    }


    // Old handleDelete removed in favor of Batch/Soft options
    /* const handleDelete = ... */

    // --- Backhaul Strategy (Swap Origin/Dest) ---
    const handleBackhaul = async (load: Load) => {
        if (backhaulingId) return;
        setBackhaulingId(load.id);

        try {
            const formData = new FormData();

            // SWAP Origin and Destination from details
            formData.append('origin_city', load.details.dest_city || '');
            formData.append('origin_state', load.details.dest_state || '');
            formData.append('dest_city', load.details.origin_city || '');
            formData.append('destination_state', load.details.origin_state || '');
            formData.append('is_backhaul', 'true'); // Flag as backhaul

            const equip = Array.isArray(load.details.equipment) ? load.details.equipment[0] : load.details.equipment;
            formData.append('equipment_type', equip || 'Any');

            // Defaults
            formData.append('pickup_distance', '50');
            formData.append('booking_type', 'Any');

            const res = await fetch('/api/criteria', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (res.ok) {
                console.log('Backhaul criteria created:', result);
                alert('Backhaul search started! Check the Dashboard.');
                window.location.href = '/dashboard';
            } else {
                console.error('Failed to create backhaul:', result.error);
                alert('Failed to create backhaul: ' + result.error);
            }
        } catch (error) {
            console.error('Backhaul error:', error);
        } finally {
            setBackhaulingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <a href="/dashboard">
                        <ArrowLeft className="h-5 w-5" />
                    </a>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {viewMode === 'trash' ? 'Trash Bin' : 'Saved Loads & Analytics'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {viewMode === 'trash' ? 'Loads you have deleted. Restore or delete forever.' : 'Detailed breakdown with fuel estimates and broker insights.'}
                    </p>
                </div>
                <div className="ml-auto flex bg-muted/50 p-1 rounded-lg border">
                    <button
                        onClick={() => setViewMode('active')}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", viewMode === 'active' ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setViewMode('trash')}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", viewMode === 'trash' ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Trash
                    </button>
                </div>
            </div>

            {/* Batch Action Bar */}
            {loads.length > 0 && (
                <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 ml-2"
                            checked={selectedIds.size === loads.length && loads.length > 0}
                            onChange={toggleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground ml-2">
                            {selectedIds.size} selected
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <>
                                {viewMode === 'trash' ? (
                                    <Button size="sm" variant="secondary" onClick={() => handleBatchAction('restore')}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Restore Selected
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="secondary" onClick={() => handleBatchAction('trash')}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Move to Trash
                                    </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => handleBatchAction('delete')}>
                                    Delete Forever
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading specific favorites...</div>
            ) : loads.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <p>No interested loads saved yet.</p>
                        <Button variant="link" asChild className="mt-2">
                            <a href="/dashboard">Browse Live Feed</a>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {loads.map(load => {
                        const origin = load.details.origin_city
                            ? `${load.details.origin_city}, ${load.details.origin_state}`
                            : load.details.origin;
                        const dest = load.details.dest_city
                            ? `${load.details.dest_city}, ${load.details.dest_state}`
                            : load.details.destination;

                        const rawRate = load.details.rate || load.details.trip_rate;
                        const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;

                        const rawDist = load.details.distance || load.details.trip_distance_mi;
                        const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
                        const rpm = (rate && dist) ? (rate / dist).toFixed(2) : null;

                        // Calculate pseudo-revenue per hour if not present
                        // Est. Speed: 50mph, Loading/Unloading: 2 hours
                        const estimatedDurationHours = dist ? (dist / 50) + 2 : 0;
                        const revenuePerHour = load.details.estimated_revenue_per_hour || (rate && estimatedDurationHours ? rate / estimatedDurationHours : 0);

                        // Extract delivery date
                        let deliveryDate = load.details.dest_delivery_date;
                        if (!deliveryDate && Array.isArray(load.details.stops)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const destStop = load.details.stops.find((s: any) => s.type === 'DESTINATION');
                            if (destStop) {
                                deliveryDate = destStop.date_start || destStop.date_end;
                            }
                        }

                        const broker = load.details.broker_name;
                        const validBrokerName = broker && broker.length < 50 ? broker : null;
                        
                        const isSelected = selectedIds.has(load.id);
                        
                        // Parse amenities or build from data
                        // Mock latitude if missing for functionality
                        const originLat = load.details.origin_lat || 34.0522; 
                        const originLon = load.details.origin_lon || -118.2437;
                        const destLat = load.details.dest_lat || 33.4484;
                        const destLon = load.details.dest_lon || -112.0740;

                        return (
                            <div key={load.id} className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-20">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 cursor-pointer accent-blue-600 shadow-sm"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(load.id)}
                                    />
                                </div>
                                <Card className={cn(
                                    "overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-lg pl-8",
                                    isSelected && "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500"
                                )}>
                                    <div className="flex flex-col lg:flex-row">
                                        <div className="flex-1 p-5 space-y-4">
                                            {/* Header: Status, Broker, Time */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-600/20 border-amber-200">
                                                        Saved
                                                    </Badge>
                                                    {load.details.age_min && (
                                                        <FreshnessBadge ageMin={load.details.age_min} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {validBrokerName && (
                                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 pr-2 pl-1 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                                            <BrokerLogo name={validBrokerName} size="sm" />
                                                            <div className="flex flex-col leading-none">
                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{validBrokerName}</span>
                                                            </div>
                                                            <BrokerReliabilityBadge brokerName={validBrokerName} size="sm" />
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {new Date(load.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Route: Origin -> Dest */}
                                            <div className="flex items-center gap-4 py-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                                                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0"></span>
                                                        {origin}
                                                        <WeatherBadge
                                                            lat={originLat}
                                                            lon={originLon}
                                                            city={load.details.origin_city}
                                                            state={load.details.origin_state}
                                                            size="sm"
                                                        />
                                                    </div>
                                                    <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1 font-medium pl-5">
                                                        {load.details.origin_address && load.details.origin_address !== origin ? (
                                                            <>
                                                                <MapPin className="h-3 w-3" />
                                                                {load.details.origin_address}
                                                            </>
                                                        ) : (
                                                            <span className="italic opacity-50">Address hidden</span>
                                                        )}
                                                        <span className="ml-auto block lg:hidden font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{load.details.origin_deadhead_mi || 0} mi dh</span>
                                                    </span>
                                                </div>
                                                
                                                {/* Directional Arrow / Distance */}
                                                <div className="flex flex-col items-center px-4 shrink-0">
                                                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-1">
                                                        {dist ? `${dist.toFixed(0)} mi` : '---'}
                                                    </span>
                                                    <div className="w-16 h-0.5 bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center">
                                                        <div className="absolute right-0 -mr-1 w-2 h-2 border-t-2 border-r-2 border-slate-400 rotate-45"></div>
                                                    </div>
                                                    <div className="mt-1">
                                                        <FuelCostBadge distance={dist} />
                                                    </div>
                                                </div>

                                                <div className="flex-1 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                                                        <WeatherBadge
                                                            lat={destLat}
                                                            lon={destLon}
                                                            city={load.details.dest_city}
                                                            state={load.details.dest_state}
                                                            size="sm"
                                                        />
                                                        {dest}
                                                        <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0"></span>
                                                    </div>
                                                    <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground mt-1 font-medium pr-5">
                                                        {load.details.dest_address && load.details.dest_address !== dest ? (
                                                            <>
                                                                {load.details.dest_address}
                                                                <MapPin className="h-3 w-3" />
                                                            </>
                                                        ) : (
                                                            <span className="italic opacity-50">Address hidden</span>
                                                        )}
                                                        <span className="mr-auto block lg:hidden font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{load.details.dest_deadhead_mi || 0} mi dh</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Metadata Row */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm pt-2">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                    <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-wide">Pickup</span>
                                                    <div className="flex items-center gap-1.5 font-semibold text-green-700 dark:text-green-400">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {load.details.pickup_date || load.details.origin_pickup_date ? 
                                                            new Date(load.details.pickup_date || load.details.origin_pickup_date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit'}) : 'ASAP'}
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                    <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-wide">Delivery</span>
                                                    <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {deliveryDate ? 
                                                            new Date(deliveryDate).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit'}) : 'Open'}
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                    <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-wide">Equipment</span>
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Truck className="h-3.5 w-3.5 text-slate-500" />
                                                        <span className="truncate" title={Array.isArray(load.details.equipment) ? load.details.equipment.join(', ') : load.details.equipment}>
                                                            {Array.isArray(load.details.equipment) ? load.details.equipment[0] : load.details.equipment}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {(load.details.weight || load.details.truck_weight_lb) && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                        <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-wide">Weight</span>
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <Weight className="h-3.5 w-3.5 text-slate-500" />
                                                            {load.details.weight || load.details.truck_weight_lb} lbs
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Sidebar: Rates & Actions */}
                                        <div className="flex lg:flex-col items-center justify-between lg:justify-center p-5 bg-slate-50 dark:bg-slate-900/50 border-t lg:border-t-0 lg:border-l min-w-[220px] gap-4">
                                            <div className="text-center w-full">
                                                <div className="text-3xl font-bold text-green-600 dark:text-green-500 flex items-center justify-center">
                                                    <span className="text-lg mr-0.5 font-normal text-muted-foreground">$</span>
                                                    {rate?.toFixed(0) || '---'}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                                    {rpm && (
                                                        <Badge variant="secondary" className="font-mono text-xs bg-slate-200 dark:bg-slate-800">
                                                            ${rpm}/mi
                                                        </Badge>
                                                    )}
                                                    {revenuePerHour > 0 && (
                                                        <ProfitBadge revenuePerHour={revenuePerHour} />
                                                    )}
                                                </div>
                                                
                                                {load.details.total_deadhead_mi > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                                                        <Navigation className="h-3 w-3" />
                                                        {load.details.total_deadhead_mi} mi deadhead
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-full space-y-2">
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700 font-bold shadow-md shadow-blue-500/10"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a
                                                        href={`https://app.cloudtrucks.com/loads/${load.cloudtrucks_load_id}/book`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Book Now
                                                    </a>
                                                </Button>

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 gap-1 text-xs"
                                                        asChild
                                                    >
                                                        <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`} target="_blank" rel="noreferrer">
                                                            <Navigation className="h-3 w-3" />
                                                            Route
                                                        </a>
                                                    </Button>
                                                    <FuelStopOptimizer 
                                                        distance={dist || 0}
                                                        originCity={load.details.origin_city}
                                                        originState={load.details.origin_state}
                                                        originLat={originLat}
                                                        originLon={originLon}
                                                        destCity={load.details.dest_city}
                                                        destState={load.details.dest_state}
                                                        destLat={destLat}
                                                        destLon={destLon}
                                                        mpg={6.5}
                                                        fuelPrice={3.80}
                                                    />
                                                </div>

                                                <Button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                                    size="sm"
                                                    onClick={() => handleBackhaul(load)}
                                                    disabled={backhaulingId === load.id}
                                                    title="Search Return Trip (Swap Origin/Dest)"
                                                >
                                                    {backhaulingId === load.id ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                                                    )}
                                                    Backhaul
                                                </Button>

                                                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                                                    {viewMode === 'trash' ? (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="w-full gap-1 border border-dashed hover:bg-green-100 hover:text-green-600 hover:border-green-300 h-8"
                                                            onClick={() => handleRestore(load.id)}
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            Restore
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleSoftDelete(load.id)}
                                                            disabled={deletingId === load.id}
                                                            className="w-full gap-1 border border-dashed text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 h-8"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
