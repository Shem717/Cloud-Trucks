'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap, Star, ArrowUpDown, AlertTriangle, ArrowLeftRight, Search, Map, Pencil, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchCriteria, CloudTrucksLoad, CloudTrucksLoadStop } from "@/workers/cloudtrucks-api-client";
// import { formatDistanceToNow } from "date-fns"; // Removed to avoid missing dependency
import { BrokerLogo } from "./broker-logo"
import { WeatherBadge } from "./weather-badge"
import { ChainLawBadge, useChainLaws } from "./chain-law-badge"
import { MapboxIntelligenceModal } from "./mapbox-intelligence-modal"
import { EditCriteriaDialog } from "@/components/edit-criteria-dialog"
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { LoadCard } from "@/components/load-card";

type SortOption = 'newest' | 'price_high' | 'price_low' | 'pickup_soonest' | 'pickup_latest' | 'delivery_soonest' | 'delivery_latest' | 'distance_short' | 'deadhead_low' | 'rpm_high' | 'rpm_low';

interface SavedLoad {
    id: string;
    cloudtrucks_load_id?: string;
    created_at: string;
    status: string;
    details: CloudTrucksLoad & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    search_criteria?: {
        id: string;
        origin_city: string;
    };
}

interface EnrichedCriteria extends SearchCriteria {
    id: string;
    deleted_at?: string | null;
    is_backhaul?: boolean;
    active?: boolean;
    origin_states?: string | string[]; // Allow string or array
    destination_states?: string | string[]; // Allow string or array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface MissionStats {
    criteria: EnrichedCriteria;
    count: number;
    maxRate: number;
    latest?: SavedLoad | null;
}

interface DashboardFeedProps {
    refreshTrigger?: number;
    isPublic?: boolean;
}

export function DashboardFeed({ refreshTrigger = 0, isPublic = false }: DashboardFeedProps) {
    const [loads, setLoads] = useState<SavedLoad[]>([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [criteriaList, setCriteriaList] = useState<EnrichedCriteria[]>([])
    const [activeCriteriaCount, setActiveCriteriaCount] = useState<number>(0)
    const [sortBy, setSortBy] = useState<SortOption>('newest')
    const [viewMode, setViewMode] = useState<'feed' | 'trash'>('feed');
    // const [visibleLoads, setVisibleLoads] = useState<SavedLoad[]>([]); // Removed unused
    const [savingInterest, setSavingInterest] = useState<string | null>(null)
    const [backhaulingId, setBackhaulingId] = useState<string | null>(null)
    // const [pendingCriteriaId, setPendingCriteriaId] = useState<string | null>(null) // Removed unused
    const [savedLoadIds, setSavedLoadIds] = useState<Set<string>>(new Set()) // Track saved loads for UI feedback
    const [interestedCount, setInterestedCount] = useState<number>(0)
    const [credentialWarning, setCredentialWarning] = useState<string | null>(null)
    const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
    const [selectedBackhaulIds, setSelectedBackhaulIds] = useState<Set<string>>(new Set())
    const [selectedLoadForMap, setSelectedLoadForMap] = useState<SavedLoad | null>(null) // Route Intelligence Modal
    const [editingCriteria, setEditingCriteria] = useState<EnrichedCriteria | null>(null) // Edit Modal State
    const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null) // Expandable Details State
    const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'instant' | 'standard'>('all') // Booking type filter


    const checkCredentials = useCallback(async () => {
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
    }, []);

    const fetchData = useCallback(async () => {
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

            const loadsData: SavedLoad[] = loadsResult.data || [];
            const criteriaData: EnrichedCriteria[] = criteriaResult.data || [];

            setLoads(loadsData);
            setCriteriaList(criteriaData);

            // Stats: in "trash" view, criteriaData is deleted criteria; fetch active criteria count once.
            if (viewMode === 'trash') {
                try {
                    const activeCriteriaRes = await fetch('/api/criteria');
                    const activeCriteriaJson = await activeCriteriaRes.json();
                    const activeList: EnrichedCriteria[] = activeCriteriaJson.data || [];
                    setActiveCriteriaCount(activeList.filter((c) => c.active && !c.is_backhaul).length);
                } catch (e) {
                    console.error('Failed to fetch active criteria:', e);
                    setActiveCriteriaCount(0);
                }
            } else {
                setActiveCriteriaCount(criteriaData.filter((c) => c.active && !c.is_backhaul).length);
            }

            if (interestedResult.loads) {
                setInterestedCount(interestedResult.loads.length)
                // Also populate savedLoadIds set for UI feedback
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ids = new Set<string>(interestedResult.loads.map((l: any) => l.cloudtrucks_load_id));
                setSavedLoadIds(ids);
            }

            setLastUpdated(new Date())
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [viewMode]);

    useEffect(() => {
        // Set initial date on mount to avoid hydration mismatch
        setLastUpdated(new Date())

        fetchData()
        checkCredentials()

        // Supabase Realtime Subscription
        // const supabase = createClient() // Removed as per refactor, not directly used here
        // const channel = supabase
        //     .channel('dashboard-feed')
        //     .on(
        //         'postgres_changes',
        //         {
        //             event: 'INSERT',
        //             table: 'found_loads',
        //             schema: 'public'
        //         },
        //         (payload) => {
        //             console.log('New load received via Realtime:', payload.new.id)
        //             fetchData()
        // 
        //             if (document.hidden && Notification.permission === 'granted') {
        //                 new Notification('CloudTrucks Scout', {
        //                     body: 'New High-Value Load Detected!',
        //                     icon: '/favicon.ico'
        //                 })
        //             }
        //         }
        //     )
        //     .on(
        //         'postgres_changes',
        //         {
        //             event: 'INSERT',
        //             table: 'search_criteria',
        //             schema: 'public'
        //         },
        //         (payload) => {
        //             console.log('New search criteria added via Realtime:', payload.new.id)
        //             fetchData()
        //         }
        //     )
        //     .subscribe()

        // Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
            // supabase.removeChannel(channel) // Removed as per refactor
        }
    }, [refreshTrigger, fetchData, checkCredentials]) // Re-run when refreshTrigger changes

    // Effect to re-fetch when viewMode changes
    useEffect(() => {
        fetchData();
        // Clear selections when switching views
        setSelectedScoutIds(new Set());
        setSelectedBackhaulIds(new Set());
    }, [viewMode, fetchData]);

    const handleDelete = async (id: string, permanent: boolean = false) => {
        try {
            const url = permanent
                ? `/api/criteria?id=${id}&permanent=true`
                : `/api/criteria?id=${id}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                setCriteriaList(prev => prev.filter(c => c.id !== id) as EnrichedCriteria[]);
                // Also remove loads for this criteria?
                setLoads(prev => prev.filter(l => l.search_criteria?.id !== id));
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

    // Batch selection handlers for scouts
    const toggleScoutSelection = (id: string) => {
        setSelectedScoutIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleScoutSelectAll = () => {
        if (selectedScoutIds.size === scoutMissions.length) {
            setSelectedScoutIds(new Set());
        } else {
            setSelectedScoutIds(new Set(scoutMissions.map(m => m.criteria.id)));
        }
    };

    // Batch selection handlers for backhauls
    const toggleBackhaulSelection = (id: string) => {
        setSelectedBackhaulIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleBackhaulSelectAll = () => {
        if (selectedBackhaulIds.size === backhaulMissions.length) {
            setSelectedBackhaulIds(new Set());
        } else {
            setSelectedBackhaulIds(new Set(backhaulMissions.map(m => m.criteria.id)));
        }
    };

    // Batch action handlers
    const handleBatchScoutAction = async (action: 'restore' | 'delete') => {
        const ids = Array.from(selectedScoutIds);
        await Promise.all(
            ids.map(id => action === 'restore' ? handleRestore(id) : handleDelete(id, true))
        );
        setSelectedScoutIds(new Set());
    };

    const handleBatchBackhaulAction = async (action: 'restore' | 'delete') => {
        const ids = Array.from(selectedBackhaulIds);
        await Promise.all(
            ids.map(id => action === 'restore' ? handleRestore(id) : handleDelete(id, true))
        );
        setSelectedBackhaulIds(new Set());
    };

    /*
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
    */

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
    const handleMarkInterested = async (load: SavedLoad) => {
        if (savingInterest) return;
        setSavingInterest(load.id);
        try {
            const res = await fetch('/api/interested', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cloudtrucks_load_id: load.details.id,
                    details: load.details,
                }),
            });
            const result = await res.json();
            if (result.success) {
                console.log('Load marked as interested');
                // Add to saved set for UI feedback
                setSavedLoadIds(prev => new Set(prev).add(load.details.id));
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
    const handleBackhaul = async (load: SavedLoad) => {
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
                // Trigger scan explicitly so the new backhaul fills immediately.
                try {
                    await fetch('/api/scan', { method: 'POST' });
                } catch {
                    // Non-fatal; user can still click "Scan Now".
                }

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
    const sortLoads = (loadsToSort: SavedLoad[]): SavedLoad[] => {
        return [...loadsToSort].sort((a, b) => {
            const getRate = (l: SavedLoad) => {
                const raw = l.details.rate || l.details.trip_rate || 0;
                return typeof raw === 'string' ? parseFloat(raw) : raw;
            };
            const getPickupDate = (l: SavedLoad) => {
                const date = (l.details.pickup_date || l.details.origin_pickup_date) as string | number | undefined;
                return date ? new Date(date).getTime() : -Infinity;
            };
            const getDistance = (l: SavedLoad) => {
                const raw = l.details.distance || l.details.trip_distance_mi || Infinity;
                return typeof raw === 'string' ? parseFloat(raw) : (raw as number);
            };
            const getDeadhead = (l: SavedLoad) => {
                return (l.details.total_deadhead_mi as number) || Infinity;
            };
            const getRPM = (l: SavedLoad) => {
                const rawRate = l.details.rate || l.details.trip_rate || 0;
                const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                const rawDist = l.details.distance || l.details.trip_distance_mi || 1;
                const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
                return dist > 0 ? rate / dist : 0;
            };

            const getDeliveryDate = (l: SavedLoad) => {
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
    const generateStats = (list: EnrichedCriteria[], loadsForStats: SavedLoad[]): MissionStats[] => {
        const stats = list.reduce((acc, criteria) => {
            acc[criteria.id] = {
                criteria: criteria,
                count: 0,
                maxRate: 0,
                latest: null
            };
            return acc;
        }, {} as Record<string, MissionStats>);

        // Overlay load stats
        loadsForStats.forEach(load => {
            // Only count if this load belongs to one of the criteria in this list
            if (load.search_criteria && stats[load.search_criteria.id]) {
                const cid = load.search_criteria.id;
                stats[cid].count++;
                const rawRate = load.details.rate || load.details.trip_rate || 0;
                const loadRate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                if (loadRate > stats[cid].maxRate) stats[cid].maxRate = loadRate;
            }
        });
        return Object.values(stats);
    };

    const scoutCriteriaIds = new Set(scoutCriteria.map(c => c.id));
    const backhaulCriteriaIds = new Set(backhaulCriteria.map(c => c.id));

    const scoutMissionLoads = loads.filter(l => l.search_criteria && scoutCriteriaIds.has(l.search_criteria.id));
    const backhaulMissionLoads = loads.filter(l => l.search_criteria && backhaulCriteriaIds.has(l.search_criteria.id));

    // --- Filter loads to only include those belonging to current criteria ---
    const criteriaIdsSet = new Set(criteriaList.map(c => c.id));
    const relevantLoads = loads.filter(l => l.search_criteria && criteriaIdsSet.has(l.search_criteria.id));

    // --- Filter out stale loads (older than 24 hours) ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const freshLoads = relevantLoads.filter(load => {
        const createdAt = new Date(load.created_at);
        return createdAt > twentyFourHoursAgo;
    });

    // --- Deduplicate loads by cloudtrucks_load_id (keep most recent) ---
    const deduplicatedLoads: SavedLoad[] = (() => {
        const loadMap: Record<string, SavedLoad> = {};
        for (const load of freshLoads) {
            const loadId = load.details?.id || load.cloudtrucks_load_id;
            if (!loadId) continue;
            
            const existing = loadMap[loadId];
            if (!existing || new Date(load.created_at) > new Date(existing.created_at)) {
                loadMap[loadId] = load;
            }
        }
        return Object.values(loadMap);
    })();

    const scoutMissions = generateStats(scoutCriteria, scoutMissionLoads);
    const backhaulMissions = generateStats(backhaulCriteria, backhaulMissionLoads);

    // --- Filter and Sort Feed ---
    const baseFilteredLoads = selectedCriteriaId
        ? deduplicatedLoads.filter(l => l.search_criteria?.id === selectedCriteriaId)
        : deduplicatedLoads;
    
    // Apply booking type filter
    const bookingFilteredLoads = bookingTypeFilter === 'all' 
        ? baseFilteredLoads
        : baseFilteredLoads.filter(l => {
            const isInstant = l.details.instant_book === true;
            return bookingTypeFilter === 'instant' ? isInstant : !isInstant;
        });
    
    const filteredLoads = sortLoads(bookingFilteredLoads);



    // activeScoutsCount for CURRENT view
    const activeScoutsCount = activeCriteriaCount;
    const totalLoadsCount = scoutMissionLoads.length;
    const backhaulLoadsCount = backhaulMissionLoads.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header / Connection Pulpit */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {viewMode === 'trash' ? 'Trash Bin' : 'Mission Control'}
                    </h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        {viewMode === 'trash'
                            ? 'Recover deleted scouts or remove them permanently.'
                            : <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> Live Feed • Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}</>
                        }
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-muted/50 p-1 rounded-lg border glass-panel">
                        <button
                            onClick={() => setViewMode('feed')}
                            className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all", viewMode === 'feed' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setViewMode('trash')}
                            className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all", viewMode === 'trash' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            Trash
                        </button>
                    </div>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleScan}
                        disabled={scanning || criteriaList.length === 0 || viewMode === 'trash'}
                        className="gap-2 bg-primary hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
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
                            <Button variant="outline" size="sm" className="gap-2 glass-panel border-white/20">
                                <ArrowUpDown className="h-4 w-4" />
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel">
                            <DropdownMenuItem onClick={() => setSortBy('rpm_high')} className={sortBy === 'rpm_high' ? 'bg-primary/10' : ''}>RPM: High to Low</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('rpm_low')} className={sortBy === 'rpm_low' ? 'bg-primary/10' : ''}>RPM: Low to High</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-primary/10' : ''}>Newest First</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_high')} className={sortBy === 'price_high' ? 'bg-primary/10' : ''}>Price: High to Low</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_low')} className={sortBy === 'price_low' ? 'bg-primary/10' : ''}>Price: Low to High</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('pickup_soonest')} className={sortBy === 'pickup_soonest' ? 'bg-primary/10' : ''}>Pickup: Soonest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('pickup_latest')} className={sortBy === 'pickup_latest' ? 'bg-primary/10' : ''}>Pickup: Latest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('delivery_soonest')} className={sortBy === 'delivery_soonest' ? 'bg-primary/10' : ''}>Delivery: Soonest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('delivery_latest')} className={sortBy === 'delivery_latest' ? 'bg-primary/10' : ''}>Delivery: Latest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('distance_short')} className={sortBy === 'distance_short' ? 'bg-primary/10' : ''}>Distance: Shortest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('deadhead_low')} className={sortBy === 'deadhead_low' ? 'bg-primary/10' : ''}>Deadhead: Lowest</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Credential Warning Banner */}
            {credentialWarning && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-600 backdrop-blur-md">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{credentialWarning}</span>
                    <a href="/dashboard/settings" className="ml-auto text-sm underline hover:no-underline font-semibold">
                        Reconnect
                    </a>
                </div>
            )}

            {/* --- COMMAND CENTER (Stats) --- */}
            <BentoGrid className="mb-10">
                <BentoGridItem
                    title="System Status"
                    description="Operational"
                    header={<div className={cn("text-4xl font-bold font-mono", loading ? "text-yellow-500" : "text-green-500")}>Online</div>}
                    icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                    className="md:col-span-1 border-l-4 border-l-green-500"
                />
                <BentoGridItem
                    title="Active Fronthauls"
                    description="Monitoring criteria"
                    header={<div className="text-4xl font-bold font-mono text-primary">{activeScoutsCount}</div>}
                    icon={<Search className="h-4 w-4 text-muted-foreground" />}
                    className="md:col-span-1 border-l-4 border-l-primary"
                />
                <BentoGridItem
                    title="Loads Found"
                    description={
                        <span>
                            Matching Criteria
                            <a href="/routes" className="block text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">
                                Backhauls: {backhaulLoadsCount}
                            </a>
                        </span>
                    }
                    header={<div className="text-4xl font-bold font-mono text-indigo-500">{totalLoadsCount}</div>}
                    icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                    className="md:col-span-1 border-l-4 border-l-indigo-500"
                />
                <BentoGridItem
                    title="Saved Loads"
                    description="Interested"
                    header={<div className="text-4xl font-bold font-mono text-orange-500">{interestedCount}</div>}
                    icon={<Star className="h-4 w-4 text-muted-foreground" />}
                    className="md:col-span-1 border-l-4 border-l-orange-500"
                />
            </BentoGrid>

            {/* --- FRONTHAULS DECK --- */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Map className="h-5 w-5 text-primary" />
                    Route Fronthauls
                </h3>

                {/* Batch Action Bar for Scouts */}
                {scoutMissions.length > 0 && (
                    <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border glass-panel">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 ml-2"
                                checked={selectedScoutIds.size === scoutMissions.length && scoutMissions.length > 0}
                                onChange={toggleScoutSelectAll}
                            />
                            <span className="text-sm text-muted-foreground ml-2">
                                {selectedScoutIds.size} fronthaul{selectedScoutIds.size !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {selectedScoutIds.size > 0 && (
                                <>
                                    {viewMode === 'trash' ? (
                                        <Button size="sm" variant="secondary" onClick={() => handleBatchScoutAction('restore')}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Restore
                                        </Button>
                                    ) : null}
                                    <Button size="sm" variant="destructive" onClick={() => handleBatchScoutAction('delete')}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {viewMode === 'trash' ? 'Delete Forever' : 'Delete'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <BentoGrid>
                    {/* 'All' Card */}
                    <BentoGridItem
                        className={cn("bg-gradient-to-br from-primary to-blue-600 text-white border-0 shadow-lg cursor-pointer", !selectedCriteriaId && "ring-4 ring-blue-200 dark:ring-blue-900")}
                        onClick={() => setSelectedCriteriaId(null)}
                        header={<div className="text-3xl font-bold text-white mb-4">{scoutMissionLoads.length}</div>}
                        title={<span className="text-white">All Fronthauls</span>}
                        description={<span className="text-blue-100">View Fronthaul Feed</span>}
                        icon={<Activity className="h-4 w-4 text-blue-200" />}
                    />

                    {/* Scout Cards */}
                    {scoutMissions.map((mission: MissionStats) => {
                        const isSelected = selectedScoutIds.has(mission.criteria.id);
                        return (
                            <BentoGridItem
                                key={mission.criteria.id}
                                className={cn(
                                    "cursor-pointer border-l-4 relative",
                                    isSelected ? "border-l-blue-500 ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20" :
                                        selectedCriteriaId === mission.criteria.id ? "border-l-primary ring-2 ring-primary bg-blue-50/50 dark:bg-blue-950/20" : "border-l-gray-300 hover:border-l-blue-300"
                                )}
                                onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                header={
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-blue-600"
                                                checked={isSelected}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => { e.stopPropagation(); toggleScoutSelection(mission.criteria.id); }}
                                            />
                                            <Badge variant="secondary" className="bg-white/50 backdrop-blur-sm">{mission.criteria.equipment_type || 'Any'}</Badge>
                                        </div>
                                        {mission.maxRate > 0 && <span className="font-mono text-green-600 font-bold">${mission.maxRate}+</span>}
                                    </div>
                                }
                                title={
                                    <div className="truncate text-sm flex items-center gap-1">
                                        {mission.criteria.origin_city} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {mission.criteria.dest_city || 'Any'}
                                    </div>
                                }
                                description={
                                    <div className="flex justify-between items-end mt-2">
                                        <span>{mission.count} Loads</span>
                                        {/* Action Buttons */}
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                }
                            />
                        )
                    })}
                </BentoGrid>
            </div>

            {/* --- BACKHAULS DECK --- */}
            <div className="space-y-4 mt-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-indigo-500" />
                    Route Backhauls
                </h3>

                {/* Batch Action Bar for Backhauls */}
                {backhaulMissions.length > 0 && (
                    <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border glass-panel">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 ml-2"
                                checked={selectedBackhaulIds.size === backhaulMissions.length && backhaulMissions.length > 0}
                                onChange={toggleBackhaulSelectAll}
                            />
                            <span className="text-sm text-muted-foreground ml-2">
                                {selectedBackhaulIds.size} backhaul{selectedBackhaulIds.size !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {selectedBackhaulIds.size > 0 && (
                                <>
                                    {viewMode === 'trash' ? (
                                        <Button size="sm" variant="secondary" onClick={() => handleBatchBackhaulAction('restore')}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Restore
                                        </Button>
                                    ) : null}
                                    <Button size="sm" variant="destructive" onClick={() => handleBatchBackhaulAction('delete')}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {viewMode === 'trash' ? 'Delete Forever' : 'Delete'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <BentoGrid>
                    {/* 'All' Card */}
                    <BentoGridItem
                        className={cn("bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0 shadow-lg cursor-pointer", !selectedCriteriaId && "ring-4 ring-indigo-200 dark:ring-indigo-900")}
                        onClick={() => setSelectedCriteriaId(null)}
                        header={<div className="text-3xl font-bold text-white mb-4">{backhaulMissionLoads.length}</div>}
                        title={<span className="text-white">All Backhauls</span>}
                        description={<span className="text-indigo-100">View Backhaul Feed</span>}
                        icon={<ArrowLeftRight className="h-4 w-4 text-indigo-100" />}
                    />

                    {/* Backhaul Cards */}
                    {backhaulMissions.map((mission: MissionStats) => {
                        const isSelected = selectedBackhaulIds.has(mission.criteria.id);
                        return (
                            <BentoGridItem
                                key={mission.criteria.id}
                                className={cn(
                                    "cursor-pointer border-l-4 relative",
                                    isSelected ? "border-l-indigo-500 ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" :
                                        selectedCriteriaId === mission.criteria.id ? "border-l-indigo-500 ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-l-gray-300 hover:border-l-indigo-300"
                                )}
                                onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                header={
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-indigo-600"
                                                checked={isSelected}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => { e.stopPropagation(); toggleBackhaulSelection(mission.criteria.id); }}
                                            />
                                            <Badge variant="secondary" className="bg-white/50 backdrop-blur-sm">{mission.criteria.equipment_type || 'Any'}</Badge>
                                        </div>
                                        {mission.maxRate > 0 && <span className="font-mono text-green-600 font-bold">${mission.maxRate}+</span>}
                                    </div>
                                }
                                title={
                                    <div className="truncate text-sm flex items-center gap-1">
                                        {mission.criteria.origin_city} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {mission.criteria.dest_city || 'Any'}
                                    </div>
                                }
                                description={
                                    <div className="flex justify-between items-end mt-2">
                                        <span>{mission.count} Loads</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                }
                            />
                        )
                    })}
                </BentoGrid>
            </div>

            {/* --- LIVE FEED --- */}
            <div className="space-y-4 mt-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Live Feed
                    </h3>
                    <div className="flex bg-muted/50 p-1 rounded-lg border glass-panel">
                        <button
                            onClick={() => setBookingTypeFilter('all')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", bookingTypeFilter === 'all' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setBookingTypeFilter('instant')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1", bookingTypeFilter === 'instant' ? "bg-white dark:bg-slate-800 text-amber-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Zap className="h-3 w-3" /> Instant
                        </button>
                        <button
                            onClick={() => setBookingTypeFilter('standard')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", bookingTypeFilter === 'standard' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            Standard
                        </button>
                    </div>
                </div>

                {filteredLoads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
                        <Filter className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                        <p className="text-muted-foreground font-medium">No loads detected.</p>
                        <p className="text-xs text-muted-foreground">Adjust your filters or wait for the next scan.</p>
                    </div>
                ) : (
                    <BentoGrid>
                        {filteredLoads.map((load) => {
                            const isSaved = savedLoadIds.has(load.details.id);

                            return (
                                <LoadCard
                                    key={load.id}
                                    load={load}
                                    isSaved={isSaved}
                                    onSave={(e) => { e.stopPropagation(); handleMarkInterested(load); }}
                                    onMarkInterested={(e) => { e.stopPropagation(); handleMarkInterested(load); }}
                                    onViewMap={(e) => { e.stopPropagation(); setSelectedLoadForMap(load); }}
                                />
                            );
                        })}
                    </BentoGrid>
                )}
            </div>

            {/* Modals */}
            {selectedLoadForMap && (
                <MapboxIntelligenceModal
                    isOpen={!!selectedLoadForMap}
                    onClose={() => setSelectedLoadForMap(null)}
                    load={selectedLoadForMap}
                />
            )}
            {editingCriteria && (
                <EditCriteriaDialog
                    open={!!editingCriteria}
                    onOpenChange={(open) => !open && setEditingCriteria(null)}
                    criteria={editingCriteria}
                    onSuccess={() => {
                        fetchData();
                        setEditingCriteria(null);
                    }}
                />
            )}
        </div>
    )
}
