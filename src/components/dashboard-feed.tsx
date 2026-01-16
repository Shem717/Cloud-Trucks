'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Load {
    id: string;
    cloudtrucks_load_id: string;
    status: string;
    created_at: string;
    details: {
        id?: string;
        origin_city?: string;
        origin_state?: string;
        dest_city?: string;
        dest_state?: string;
        origin?: string;
        destination?: string;
        rate?: number;
        trip_rate?: number;
        distance?: number;
        trip_distance_mi?: number;
        weight?: number;
        truck_weight_lb?: number;
        equipment?: string | string[];
        pickup_date?: string;
        [key: string]: any;
    };
    search_criteria: {
        id: string;
        origin_city: string;
        origin_state: string;
        dest_city: string;
        destination_state: string;
        equipment_type: string;
    };
}

export function DashboardFeed() {
    const [loads, setLoads] = useState<Load[]>([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [criteriaList, setCriteriaList] = useState<any[]>([])

    useEffect(() => {
        // Set initial date on mount to avoid hydration mismatch
        setLastUpdated(new Date())

        fetchData()
        const interval = setInterval(fetchData, 15000)
        return () => clearInterval(interval)
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [loadsRes, criteriaRes] = await Promise.all([
                fetch('/api/loads'),
                fetch('/api/criteria')
            ])

            const loadsResult = await loadsRes.json()
            const criteriaResult = await criteriaRes.json()

            if (loadsResult.data) setLoads(loadsResult.data)
            if (criteriaResult.data) setCriteriaList(criteriaResult.data)

            setLastUpdated(new Date())
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCriteriaList(prev => prev.filter(c => c.id !== id));
                setLoads(prev => prev.filter(l => l.search_criteria.id !== id));
                if (selectedCriteriaId === id) setSelectedCriteriaId(null);
            }
        } catch (error) {
            console.error('Failed to delete criteria:', error);
        }
    }

    const handleScan = async () => {
        if (scanning) return;
        setScanning(true);
        try {
            const res = await fetch('/api/scan', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                console.log(`Scan complete: ${result.loadsFound} new loads found`);
                // Refresh data after scan
                await fetchData();
            } else {
                console.error('Scan failed:', result.error);
            }
        } catch (error) {
            console.error('Scan error:', error);
        } finally {
            setScanning(false);
        }
    }

    // --- Derive Stats (Merge Active Criteria + Load Stats) ---
    const missionStats = criteriaList.reduce((acc, criteria) => {
        acc[criteria.id] = {
            criteria: criteria,
            count: 0,
            maxRate: 0,
            latest: null
        };
        return acc;
    }, {} as Record<string, any>);

    // Overlay load data
    loads.forEach(load => {
        const cid = load.search_criteria.id;
        // If criteria was deleted but we still have loads, we might skip or include. 
        // For now, let's only show if criteria is active OR if we have loads (optional choice).
        // If we want to show 'orphan' loads, we need to handle missing criteria in acc.
        if (!missionStats[cid]) {
            // For orphan loads (criteria deleted), we reconstruct basic info from the load's copy
            missionStats[cid] = {
                criteria: load.search_criteria, // This has the snapshot
                count: 0,
                maxRate: 0,
                latest: null
            };
        }

        missionStats[cid].count++;
        const rawRate = load.details.rate || load.details.trip_rate || 0;
        const loadRate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
        if (loadRate > missionStats[cid].maxRate) missionStats[cid].maxRate = loadRate;
    });

    const missions = Object.values(missionStats);

    // --- Filter Feed ---
    const filteredLoads = selectedCriteriaId
        ? loads.filter(l => l.search_criteria.id === selectedCriteriaId)
        : loads;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header / Connection Pulpit */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Active Operations</h2>
                    <p className="text-muted-foreground text-sm">
                        Live feed from CloudTrucks • Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScan}
                        disabled={scanning || criteriaList.length === 0}
                        className="gap-2"
                    >
                        {scanning ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="h-4 w-4" />
                        )}
                        {scanning ? 'Scanning...' : 'Scan Now'}
                    </Button>
                    {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            </div>

            {/* --- OPERATIONS DECK (Mission Cards) --- */}
            {missions.length > 0 && (
                <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex w-max space-x-4">
                        {/* 'All' Card */}
                        <button
                            onClick={() => setSelectedCriteriaId(null)}
                            className={cn(
                                "flex flex-col items-start justify-between rounded-xl border p-4 w-[180px] h-[120px] transition-all hover:scale-105 focus:outline-none focus:ring-2 ring-primary/20",
                                !selectedCriteriaId
                                    ? "bg-primary text-primary-foreground shadow-lg scale-105 border-primary"
                                    : "bg-background hover:bg-muted/50"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                <span className="font-semibold">All Missions</span>
                            </div>
                            <div className="mt-auto">
                                <div className="text-3xl font-bold">{loads.length}</div>
                                <div className="text-xs opacity-80">Total Loads</div>
                            </div>
                        </button>

                        {/* Individual Mission Cards */}
                        {missions.map((mission: any) => (
                            <div
                                key={mission.criteria.id}
                                className={cn(
                                    "relative flex flex-col items-start justify-between rounded-xl border p-4 w-[240px] h-[120px] transition-all hover:scale-105 focus-within:ring-2 ring-primary/20 group",
                                    selectedCriteriaId === mission.criteria.id
                                        ? "bg-slate-800 text-white shadow-lg scale-105 border-slate-600 ring-2 ring-slate-400"
                                        : "bg-background hover:bg-muted/50"
                                )}
                            >
                                {/* Make the whole card clickable EXCEPT the delete button */}
                                <button
                                    onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                    className="absolute inset-0 w-full h-full z-0 text-left p-4 flex flex-col justify-between"
                                >
                                    <div className="w-full">
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge variant="outline" className={cn(
                                                "bg-background/20 backdrop-blur-sm border-white/20 text-xs",
                                                selectedCriteriaId !== mission.criteria.id && "border-slate-300"
                                            )}>
                                                {mission.criteria.equipment_type || 'Any'}
                                            </Badge>
                                            {mission.maxRate > 0 && (
                                                <span className="text-green-400 font-mono text-xs font-bold">
                                                    ${mission.maxRate.toFixed(0)}+
                                                </span>
                                            )}
                                        </div>
                                        <div className="font-semibold truncate w-full text-left pr-6">
                                            {mission.criteria.origin_city} <span className="text-muted-foreground">→</span> {mission.criteria.dest_city || 'Any'}
                                        </div>
                                    </div>
                                    <div className="mt-auto flex items-end justify-between w-full">
                                        <div>
                                            <div className="text-2xl font-bold">{mission.count}</div>
                                            <div className="text-xs text-muted-foreground">Found</div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {mission.criteria.origin_state} to {mission.criteria.destination_state || 'Any'}
                                        </div>
                                    </div>
                                </button>

                                {/* Delete Button (Z-Index above card click) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Stop scanning this route?')) {
                                            handleDelete(mission.criteria.id);
                                        }
                                    }}
                                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Stop Scanning"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- LIVE FEED (Stream) --- */}
            <div className="grid gap-4">
                {filteredLoads.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                            <Filter className="h-10 w-10 mb-4 opacity-20" />
                            <p>No loads visible in this feed.</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredLoads.map((load) => {
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

                        return (
                            <Card key={load.id} className="group overflow-hidden transition-all hover:shadow-md hover:border-slate-400/50">
                                <div className="flex flex-col md:flex-row">
                                    {/* Left: Route Info */}
                                    <div className="flex-1 p-5 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-2">
                                                <Badge className="bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 border-0">
                                                    New
                                                </Badge>
                                                {load.search_criteria && (
                                                    <Badge variant="outline" className="text-xs opacity-50">
                                                        From Search: {load.search_criteria.origin_city}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {new Date(load.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-lg font-semibold">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                                    {origin}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center px-4">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                                    {dist ? `${dist.toFixed(0)} mi` : '---'}
                                                </span>
                                                <div className="w-24 h-[1px] bg-border my-1 relative">
                                                    <div className="absolute right-0 -top-[3px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border"></div>
                                                </div>
                                            </div>
                                            <div className="flex-1 text-right">
                                                <div className="text-lg font-semibold text-right">
                                                    {dest}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
                                            {load.details.pickup_date && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(load.details.pickup_date).toLocaleDateString()}
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

                                    {/* Right: Rate & Action */}
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
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
