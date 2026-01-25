'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Weight, Calendar, Truck, Trash2, ArrowLeft, ArrowLeftRight, RefreshCw, Navigation, Users, User, Map } from 'lucide-react'
import { cn } from "@/lib/utils"
import { BrokerLogo } from "@/components/broker-logo"
import { WeatherBadge } from "@/components/weather-badge"
import { extractLoadAddresses, openInMaps } from "@/lib/address-utils"
import { MapboxIntelligenceModal } from "@/components/mapbox-intelligence-modal"
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
    const [selectedLoadForMap, setSelectedLoadForMap] = useState<Load | null>(null)

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

        try {
            await fetch('/api/interested', {
                method: 'PATCH',
                body: JSON.stringify({ ids: [id], status: 'trash' })
            });
        } catch (error) {
            console.error('Failed to trash load:', error);
            fetchInterested();
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <a href="/dashboard">
                        <ArrowLeft className="h-5 w-5" />
                    </a>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {viewMode === 'trash' ? 'Trash Bin' : 'Interested Loads'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {viewMode === 'trash' ? 'Loads you have deleted. Restore or delete forever.' : 'Loads you have saved for later review.'}
                    </p>
                </div>
                <div className="ml-auto flex bg-muted/50 p-1 rounded-lg border glass-panel">
                    <button
                        onClick={() => setViewMode('active')}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", viewMode === 'active' ? "bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-white" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setViewMode('trash')}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", viewMode === 'trash' ? "bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-white" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Trash
                    </button>
                </div>
            </div>

            {/* Batch Action Bar */}
            {loads.length > 0 && (
                <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border glass-panel">
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
                <div className="grid gap-4">
                    {loads.map(load => {
                        // Extract addresses from stops
                        const addresses = extractLoadAddresses(load.details);
                        
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
                        const isSelected = selectedIds.has(load.id);
                        const isTeam = load.details.is_team_load === true;

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
                                    "overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-md hover:scale-[1.01] pl-8 bg-card/50 backdrop-blur-sm",
                                    isSelected && "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500"
                                )}>
                                    <div className="flex flex-col md:flex-row">
                                        <div className="flex-1 p-5 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-2">
                                                    <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-600/20 border-0">
                                                        Saved
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {broker && (
                                                        <div className="flex items-center gap-2">
                                                            <BrokerLogo name={broker} size="sm" />
                                                            <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                                                                {broker}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {new Date(load.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 text-lg font-semibold">
                                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                                        {origin}
                                                        <WeatherBadge
                                                            lat={load.details.origin_lat}
                                                            lon={load.details.origin_lon}
                                                            city={load.details.origin_city}
                                                            state={load.details.origin_state}
                                                            size="sm"
                                                        />
                                                    </div>
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
                                                <div className="flex flex-col items-center px-4">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                        {dist ? `${dist.toFixed(0)} mi Loaded` : '---'}
                                                    </span>
                                                    <div className="w-24 h-[1px] bg-border my-1 relative">
                                                        <div className="absolute right-0 -top-[3px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border"></div>
                                                    </div>
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
                                                <div className="flex-1 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-lg font-semibold">
                                                        <WeatherBadge
                                                            lat={load.details.dest_lat}
                                                            lon={load.details.dest_lon}
                                                            city={load.details.dest_city}
                                                            state={load.details.dest_state}
                                                            size="sm"
                                                        />
                                                        <div>
                                                            {dest}
                                                            {addresses.destination.hasAddress && (
                                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                                    <span className="text-xs font-normal text-muted-foreground truncate max-w-[200px] text-right">
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
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
                                                {(load.details.pickup_date || load.details.origin_pickup_date) && (
                                                    <div className="flex items-center gap-1.5 text-green-700 font-medium">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Pick: {new Date(load.details.pickup_date || load.details.origin_pickup_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                )}
                                                {deliveryDate ? (
                                                    <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Drop: {new Date(deliveryDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground/50 font-medium">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Drop: <span className="italic">Unavailable</span></span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="h-4 w-4" />
                                                    {Array.isArray(load.details.equipment) ? load.details.equipment.join(', ') : load.details.equipment}
                                                </div>
                                                {(load.details.weight || load.details.truck_weight_lb) && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Weight className="h-4 w-4" />
                                                        {load.details.weight || load.details.truck_weight_lb} lbs
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center justify-center p-5 bg-muted/30 border-t md:border-t-0 md:border-l min-w-[180px]">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-green-600 flex items-center justify-center">
                                                    <span className="text-lg mr-0.5">$</span>
                                                    {rate?.toFixed(0) || '---'}
                                                </div>
                                                {rpm && (
                                                    <Badge variant="secondary" className="mt-1 font-mono text-xs">
                                                        ${rpm}/mi
                                                    </Badge>
                                                )}
                                                {load.details.total_deadhead_mi && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {load.details.total_deadhead_mi} mi deadhead
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 font-bold"
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

                                            <div className="grid grid-cols-2 gap-2 w-full mt-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedLoadForMap(load)}
                                                    className="gap-1"
                                                    title="View Route Intelligence"
                                                >
                                                    <Map className="h-4 w-4" />
                                                    Route
                                                </Button>
                                                <Button
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1"
                                                    size="sm"
                                                    onClick={() => handleBackhaul(load)}
                                                    disabled={backhaulingId === load.id}
                                                    title="Search Return Trip (Swap Origin/Dest)"
                                                >
                                                    {backhaulingId === load.id ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ArrowLeftRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="flex gap-2 w-full mt-2">
                                                {viewMode === 'trash' ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="w-full gap-1 border hover:bg-green-100 hover:text-green-600"
                                                        onClick={() => handleRestore(load.id)}
                                                        title="Restore"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                        <span className="ml-1">Restore</span>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSoftDelete(load.id)}
                                                        disabled={deletingId === load.id}
                                                        className="w-full gap-1 border text-yellow-500 hover:text-red-500 hover:bg-red-100 border-yellow-500/20"
                                                        title="Move to Trash"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="ml-1">Remove</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Route Intelligence Modal */}
            {selectedLoadForMap && (
                <MapboxIntelligenceModal
                    isOpen={!!selectedLoadForMap}
                    onClose={() => setSelectedLoadForMap(null)}
                    load={selectedLoadForMap}
                />
            )}
        </div>
    )
}

