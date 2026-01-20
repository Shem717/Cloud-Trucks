'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap, Star, ArrowUpDown, AlertTriangle, ArrowLeftRight, Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/utils/supabase/client"
import { BrokerLogo } from "./broker-logo"
import { WeatherBadge } from "./weather-badge"
import { ChainLawBadge, useChainLaws } from "./chain-law-badge"

type SortOption = 'newest' | 'price_high' | 'price_low' | 'pickup_soonest' | 'pickup_latest' | 'delivery_soonest' | 'delivery_latest' | 'distance_short' | 'deadhead_low' | 'rpm_high' | 'rpm_low';

interface Load {
    id: string;
    cloudtrucks_load_id: string;
    status: string;
    created_at: string;
    details: {
        id?: string;
        origin_city?: string;
        origin_state?: string;
        origin_address?: string; // Check for address
        dest_city?: string;
        dest_state?: string;
        dest_address?: string; // Check for address
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
        broker_name?: string;
        dest_delivery_date?: string;
        stops?: Array<{
            type: string;
            date_start?: string;
            date_end?: string;
            [key: string]: any;
        }>;
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

interface SearchCriteria {
    id: string;
    origin_city: string | null;
    origin_state: string | null;
    dest_city: string | null;
    destination_state: string | null;
    equipment_type: string | null;
    booking_type: string | null;
    min_rate: number | null;
    max_weight: number | null;
    pickup_distance: number | null;
    pickup_date: string | null;
    active: boolean;
    created_at: string;
    deleted_at?: string | null; // Add deleted_at
}


interface DashboardFeedProps {
    refreshTrigger?: number
}

export function DashboardFeed({ refreshTrigger = 0 }: DashboardFeedProps) {
    const [loads, setLoads] = useState<Load[]>([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [criteriaList, setCriteriaList] = useState<any[]>([])
    const [sortBy, setSortBy] = useState<SortOption>('newest')
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active') // New View Mode
    const [savingInterest, setSavingInterest] = useState<string | null>(null)
    const [backhaulingId, setBackhaulingId] = useState<string | null>(null)
    const [pendingCriteriaId, setPendingCriteriaId] = useState<string | null>(null) // Track optimistic adds
    const [savedLoadIds, setSavedLoadIds] = useState<Set<string>>(new Set()) // Track saved loads for UI feedback
    const [interestedCount, setInterestedCount] = useState<number>(0)
    const [credentialWarning, setCredentialWarning] = useState<string | null>(null)


    useEffect(() => {
        // Set initial date on mount to avoid hydration mismatch
        setLastUpdated(new Date())

        fetchData()
        checkCredentials()

        // Supabase Realtime Subscription
        const supabase = createClient()
        const channel = supabase
            .channel('dashboard-feed')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    table: 'found_loads',
                    schema: 'public'
                },
                (payload) => {
                    console.log('New load received via Realtime:', payload.new.id)
                    fetchData()

                    if (document.hidden && Notification.permission === 'granted') {
                        new Notification('CloudTrucks Scout', {
                            body: 'New High-Value Load Detected!',
                            icon: '/favicon.ico'
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    table: 'search_criteria',
                    schema: 'public'
                },
                (payload) => {
                    console.log('New search criteria added via Realtime:', payload.new.id)
                    fetchData()
                }
            )
            .subscribe()

        // Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
            supabase.removeChannel(channel)
        }
    }, [refreshTrigger]) // Re-run when refreshTrigger changes

    const checkCredentials = async () => {
        try {
            const res = await fetch('/api/credentials/status');
            const result = await res.json();
            if (!result.hasCredentials) {
                setCredentialWarning('No CloudTrucks credentials found. Please connect your account.');
            } else if (!result.isValid) {
                setCredentialWarning('Your CloudTrucks session has expired. Please reconnect.');
            } else {
                setCredentialWarning(null);
            }
        } catch (error) {
            console.error('Failed to check credentials:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch criteria based on viewMode
            const criteriaUrl = viewMode === 'trash' ? '/api/criteria?view=trash' : '/api/criteria';

            const [loadsRes, criteriaRes, interestedRes] = await Promise.all([
                fetch('/api/loads'),
                fetch(criteriaUrl),
                fetch('/api/interested')
            ])

            const loadsResult = await loadsRes.json()
            const criteriaResult = await criteriaRes.json()
            const interestedResult = await interestedRes.json()

            if (loadsResult.data) setLoads(loadsResult.data)
            if (criteriaResult.data) setCriteriaList(criteriaResult.data)
            if (interestedResult.loads) {
                setInterestedCount(interestedResult.loads.length)
                // Also populate savedLoadIds set for UI feedback
                const ids = new Set<string>(interestedResult.loads.map((l: any) => l.cloudtrucks_load_id));
                setSavedLoadIds(ids);
            }

            // Fetch GLOBAL counts for stats cards (regardless of viewMode)
            const [globalCriteriaRes, globalLoadsRes] = await Promise.all([
                fetch('/api/criteria'), // Always fetch active criteria
                fetch('/api/loads')     // Always fetch all loads
            ]);
            const globalCriteria = await globalCriteriaRes.json();
            const globalLoadsData = await globalLoadsRes.json();

            if (globalCriteria.data) {
                setGlobalActiveCount(globalCriteria.data.filter((c: any) => c.active).length);
            }
            if (globalLoadsData.data) {
                setGlobalLoadsCount(globalLoadsData.data.length);
            }

            setLastUpdated(new Date())
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Effect to re-fetch when viewMode changes
    useEffect(() => {
        fetchData();
    }, [viewMode]);

    const handleDelete = async (id: string, permanent: boolean = false) => {
        try {
            const url = permanent
                ? `/api/criteria?id=${id}&permanent=true`
                : `/api/criteria?id=${id}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                setCriteriaList(prev => prev.filter(c => c.id !== id));
                // Also remove loads for this criteria?
                setLoads(prev => prev.filter(l => l.search_criteria.id !== id));
                if (selectedCriteriaId === id) setSelectedCriteriaId(null);
            }
        } catch (error) {
            console.error('Failed to delete criteria:', error);
        }
    }

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch('/api/criteria', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', id })
            });

            if (res.ok) {
                // Remove from current trash view
                setCriteriaList(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Failed to restore criteria:', error);
        }
    }

    const handleCriteriaAdded = async (tempCriteria: SearchCriteria) => {
        // Optimistically add to UI
        setCriteriaList(prev => [...prev, tempCriteria]);
        setPendingCriteriaId(tempCriteria.id);

        // Trigger immediate scan for this new criterion
        try {
            const res = await fetch('/api/scan', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                console.log(`Immediate scan for new criterion: ${result.loadsFound} loads found`);
                // Refresh data to sync with server
                await fetchData();
            }
        } catch (error) {
            console.error('Immediate scan error:', error);
            // Rollback optimistic update on error
            setCriteriaList(prev => prev.filter(c => c.id !== tempCriteria.id));
        } finally {
            setPendingCriteriaId(null);
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

    // --- Mark as Interested ---
    const handleMarkInterested = async (load: Load) => {
        if (savingInterest) return;
        setSavingInterest(load.id);
        try {
            const res = await fetch('/api/interested', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cloudtrucks_load_id: load.cloudtrucks_load_id,
                    details: load.details,
                }),
            });
            const result = await res.json();
            if (result.success) {
                console.log('Load marked as interested');
                // Add to saved set for UI feedback
                setSavedLoadIds(prev => new Set(prev).add(load.id));
            } else {
                console.error('Failed to mark interested:', result.error);
            }
        } catch (error) {
            console.error('Mark interested error:', error);
        } finally {
            setSavingInterest(null);
        }
    };

    // --- Backhaul Strategy (Swap Origin/Dest) ---
    const handleBackhaul = async (load: Load) => {
        if (backhaulingId) return;
        setBackhaulingId(load.id);

        try {
            const formData = new FormData();

            // SWAP Origin and Destination
            // Use City, State if available, otherwise raw string fallback
            formData.append('origin_city', load.details.dest_city || '');
            formData.append('origin_state', load.details.dest_state || '');
            formData.append('dest_city', load.details.origin_city || '');
            formData.append('destination_state', load.details.origin_state || '');
            formData.append('is_backhaul', 'true'); // Flag as backhaul

            // Equipment: If array, take first or join? API usually expects single string from dropdown
            // but let's try to be smart.
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
                fetchData(); // Refresh to show new mission
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

    // --- Sort Function ---
    const sortLoads = (loadsToSort: Load[]): Load[] => {
        return [...loadsToSort].sort((a, b) => {
            const getRate = (l: Load) => {
                const raw = l.details.rate || l.details.trip_rate || 0;
                return typeof raw === 'string' ? parseFloat(raw) : raw;
            };
            const getPickupDate = (l: Load) => {
                const date = l.details.pickup_date || l.details.origin_pickup_date;
                return date ? new Date(date).getTime() : Infinity;
            };
            const getDistance = (l: Load) => {
                const raw = l.details.distance || l.details.trip_distance_mi || Infinity;
                return typeof raw === 'string' ? parseFloat(raw) : raw;
            };
            const getDeadhead = (l: Load) => {
                return l.details.total_deadhead_mi || Infinity;
            };
            const getRPM = (l: Load) => {
                const rawRate = l.details.rate || l.details.trip_rate || 0;
                const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                const rawDist = l.details.distance || l.details.trip_distance_mi || 1;
                const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
                return dist > 0 ? rate / dist : 0;
            };

            const getDeliveryDate = (l: Load) => {
                const date = l.details.dest_delivery_date || l.details.dest_date;
                return date ? new Date(date).getTime() : Infinity;
            };

            switch (sortBy) {
                case 'price_high':
                    return getRate(b) - getRate(a);
                case 'price_low':
                    return getRate(a) - getRate(b);
                case 'rpm_high':
                    return getRPM(b) - getRPM(a);
                case 'rpm_low':
                    return getRPM(a) - getRPM(b);
                case 'pickup_soonest':
                    return getPickupDate(a) - getPickupDate(b);
                case 'pickup_latest':
                    return getPickupDate(b) - getPickupDate(a);
                case 'delivery_soonest':
                    return getDeliveryDate(a) - getDeliveryDate(b);
                case 'delivery_latest':
                    return getDeliveryDate(b) - getDeliveryDate(a);
                case 'distance_short':
                    return getDistance(a) - getDistance(b);
                case 'deadhead_low':
                    return getDeadhead(a) - getDeadhead(b);
                case 'newest':
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });
    };

    // --- Split Criteria & Derive Stats ---
    const scoutCriteria = criteriaList.filter(c => !c.is_backhaul);
    const backhaulCriteria = criteriaList.filter(c => c.is_backhaul);

    // Helper to generate mission stats from a criteria list
    const generateStats = (list: any[]) => {
        const stats = list.reduce((acc, criteria) => {
            acc[criteria.id] = {
                criteria: criteria,
                count: 0,
                maxRate: 0,
                latest: null
            };
            return acc;
        }, {} as Record<string, any>);

        // Overlay load stats
        loads.forEach(load => {
            // Only count if this load belongs to one of the criteria in this list
            if (stats[load.search_criteria.id]) {
                const cid = load.search_criteria.id;
                stats[cid].count++;
                const rawRate = load.details.rate || load.details.trip_rate || 0;
                const loadRate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                if (loadRate > stats[cid].maxRate) stats[cid].maxRate = loadRate;
            }
        });
        return Object.values(stats);
    };

    const scoutMissions = generateStats(scoutCriteria);
    const backhaulMissions = generateStats(backhaulCriteria);

    // --- Filter and Sort Feed ---
    const baseFilteredLoads = selectedCriteriaId
        ? loads.filter(l => l.search_criteria.id === selectedCriteriaId)
        : loads;
    const filteredLoads = sortLoads(baseFilteredLoads);

    // Calculate Stats - Always show GLOBAL counts, not filtered by viewMode
    // Active scouts = criteria where active=true AND deleted_at is null
    // Note: When in Trash view, criteriaList contains deleted items, so we need to track separately
    const [globalActiveCount, setGlobalActiveCount] = useState<number>(0);
    const [globalLoadsCount, setGlobalLoadsCount] = useState<number>(0);

    // activeScoutsCount for CURRENT view (used by mission cards below)
    const activeScoutsCount = criteriaList.filter(c => c.active).length;
    const totalLoadsCount = loads.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview - Moved from page.tsx for Client-Side Accuracy */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Online</div>
                        <p className="text-xs text-muted-foreground">{loading ? 'Syncing...' : 'System is ready'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Scouts</CardTitle>
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalActiveCount}</div>
                        <p className="text-xs text-muted-foreground">Automated scan criteria</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loads Found</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalLoadsCount}</div>
                        <p className="text-xs text-muted-foreground">Matching your criteria</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interested Loads</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{savingInterest ? <span className="animate-pulse">...</span> : interestedCount}</div>
                        <p className="text-xs text-muted-foreground">Saved for review</p>
                    </CardContent>
                </Card>
            </div>

            {/* Credential Warning Banner */}
            {credentialWarning && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{credentialWarning}</span>
                    <a href="/dashboard/settings" className="ml-auto text-sm underline hover:no-underline">
                        Reconnect
                    </a>
                </div>
            )}

            {/* Header / Connection Pulpit */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {viewMode === 'trash' ? 'Trash Bin' : 'Active Scouts'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {viewMode === 'trash'
                            ? 'Recover deleted scouts or remove them permanently.'
                            : lastUpdated ? `Live feed • Updated ${lastUpdated.toLocaleTimeString()}` : 'Syncing...'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/50 p-1 rounded-lg border mr-2">
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

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScan}
                        disabled={scanning || criteriaList.length === 0 || viewMode === 'trash'}
                        className="gap-2"
                    >
                        {scanning ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="h-4 w-4" />
                        )}
                        {scanning ? 'Scanning...' : 'Scan Now'}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <ArrowUpDown className="h-4 w-4" />
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('rpm_high')} className={sortBy === 'rpm_high' ? 'bg-muted' : ''}>
                                RPM: High to Low
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('rpm_low')} className={sortBy === 'rpm_low' ? 'bg-muted' : ''}>
                                RPM: Low to High
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-muted' : ''}>
                                Newest First
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_high')} className={sortBy === 'price_high' ? 'bg-muted' : ''}>
                                Price: High to Low
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_low')} className={sortBy === 'price_low' ? 'bg-muted' : ''}>
                                Price: Low to High
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('pickup_soonest')} className={sortBy === 'pickup_soonest' ? 'bg-muted' : ''}>
                                Pickup: Soonest
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('pickup_latest')} className={sortBy === 'pickup_latest' ? 'bg-muted' : ''}>
                                Pickup: Latest
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('delivery_soonest')} className={sortBy === 'delivery_soonest' ? 'bg-muted' : ''}>
                                Delivery: Soonest
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('delivery_latest')} className={sortBy === 'delivery_latest' ? 'bg-muted' : ''}>
                                Delivery: Latest
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('distance_short')} className={sortBy === 'distance_short' ? 'bg-muted' : ''}>
                                Distance: Shortest
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('deadhead_low')} className={sortBy === 'deadhead_low' ? 'bg-muted' : ''}>
                                Deadhead: Lowest
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            </div>

            {/* --- SCOUTS DECK --- */}
            <div className="w-full pb-4">
                <div className="flex flex-wrap gap-4">
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
                            <span className="font-semibold">All Scouts</span>
                        </div>
                        <div className="mt-auto">
                            <div className="text-3xl font-bold">{loads.length}</div>
                            <div className="text-xs opacity-80">Total Loads</div>
                        </div>
                    </button>

                    {/* Scouts Cards */}
                    {scoutMissions.map((mission: any) => (
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
                            {/* Action Button (Delete or Restore) */}
                            {viewMode === 'trash' ? (
                                <div className="absolute top-2 right-2 z-50 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleRestore(mission.criteria.id);
                                        }}
                                        className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500 hover:text-white text-green-600 transition-colors"
                                        title="Restore Scout"
                                    >
                                        <RefreshCw className="h-3 w-3 pointer-events-none" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (confirm('Delete permanently? This cannot be undone.')) {
                                                handleDelete(mission.criteria.id, true);
                                            }
                                        }}
                                        className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500 hover:text-white text-red-600 transition-colors"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 className="h-3 w-3 pointer-events-none" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Soft delete - no confirmation needed for trash flow
                                        // or keep simple alert? User asked to "Remove immediate confirmation popup"
                                        handleDelete(mission.criteria.id);
                                    }}
                                    className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-black/20 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Move to Trash"
                                >
                                    <Trash2 className="h-4 w-4 pointer-events-none" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BACKHAULS DECK (Rendered below Scouts) --- */}
            {
                backhaulMissions.length > 0 && (
                    <div className="space-y-2 mt-6">
                        <h3 className="text-lg font-semibold tracking-tight text-muted-foreground flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            Backhauls
                        </h3>
                        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                            <div className="flex w-max space-x-4">
                                {backhaulMissions.map((mission: any) => (
                                    <div
                                        key={mission.criteria.id}
                                        className={cn(
                                            "relative flex flex-col items-start justify-between rounded-xl border p-4 w-[240px] h-[100px] transition-all hover:scale-105 focus-within:ring-2 ring-indigo-500/20 group",
                                            selectedCriteriaId === mission.criteria.id
                                                ? "bg-indigo-950/40 text-white shadow-lg scale-105 border-indigo-500 ring-2 ring-indigo-500"
                                                : "bg-background hover:bg-muted/50 border-indigo-500/20"
                                        )}
                                    >
                                        <button
                                            onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                            className="absolute inset-0 w-full h-full z-0 text-left p-4 flex flex-col justify-between"
                                        >
                                            <div className="w-full">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge variant="secondary" className="text-[10px] h-5">
                                                        Backhaul
                                                    </Badge>
                                                    {mission.maxRate > 0 && (
                                                        <span className="text-green-400 font-mono text-xs font-bold">
                                                            ${mission.maxRate.toFixed(0)}+
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-semibold truncate w-full text-left flex items-center gap-1.5 text-sm">
                                                    {mission.criteria.origin_city} <ArrowLeftRight className="h-3 w-3 text-muted-foreground" /> {mission.criteria.dest_city}
                                                </div>
                                            </div>
                                            <div className="mt-auto flex items-end justify-between w-full">
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {mission.criteria.min_weight ? `${mission.criteria.min_weight / 1000}k` : '0'} - {mission.criteria.max_weight ? `${mission.criteria.max_weight / 1000}k` : 'Any'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-lg font-bold">{mission.count}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">Found</span>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Instant soft delete (no confirm)
                                                handleDelete(mission.criteria.id);
                                            }}
                                            className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-black/20 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Stop Scanning"
                                        >
                                            <Trash2 className="h-4 w-4 pointer-events-none" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

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

                        // delivery date logic
                        let deliveryDate = load.details.dest_delivery_date;
                        if (!deliveryDate && Array.isArray(load.details.stops)) {
                            const destStop = load.details.stops.find((s: any) => s.type === 'DESTINATION');
                            if (destStop) {
                                deliveryDate = destStop.date_start || destStop.date_end;
                            }
                        }

                        // broker logic
                        const broker = load.details.broker_name;

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
                                                    {load.details.origin_address && (
                                                        <span className="block text-xs font-normal text-muted-foreground truncate max-w-[150px]">
                                                            {load.details.origin_address}
                                                        </span>
                                                    )}
                                                    <WeatherBadge
                                                        lat={load.details.origin_lat}
                                                        lon={load.details.origin_lon}
                                                        city={load.details.origin_city}
                                                        state={load.details.origin_state}
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center px-4">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                    {dist ? `${dist.toFixed(0)} mi Loaded` : '---'}
                                                </span>
                                                <div className="w-24 h-[1px] bg-border my-1 relative">
                                                    <div className="absolute right-0 -top-[3px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border"></div>
                                                </div>
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
                                                        {load.details.dest_address && (
                                                            <span className="block text-xs font-normal text-muted-foreground truncate max-w-[150px] text-right">
                                                                {load.details.dest_address}
                                                            </span>
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

                                        <Button
                                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
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

                                        <div className="flex gap-2 w-full mt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleMarkInterested(load)}
                                                disabled={savingInterest === load.id || savedLoadIds.has(load.id)}
                                                className={cn(
                                                    "w-full gap-1 border",
                                                    savedLoadIds.has(load.id)
                                                        ? "text-yellow-400 bg-yellow-500/20 border-yellow-500/40 cursor-default"
                                                        : "text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 border-yellow-500/20"
                                                )}
                                                title={savedLoadIds.has(load.id) ? "Already saved" : "Save to Interested"}
                                            >
                                                <Star className={cn(
                                                    "h-4 w-4",
                                                    savingInterest === load.id && "animate-pulse",
                                                    savedLoadIds.has(load.id) && "fill-current" // Fill the star when saved
                                                )} />
                                                <span className="ml-1">{savedLoadIds.has(load.id) ? 'Saved' : 'Save'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                )}
            </div>
        </div >
    )
}
