'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap, Star, ArrowUpDown, AlertTriangle, ArrowLeftRight, Search, Map, Pencil, ChevronDown, ChevronUp, ArrowRight, Fuel, Bell, Flame, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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
import { FuelSettingsDialog } from "@/components/fuel-settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouteBuilder } from "@/components/route-builder";
import { useHOS, HOSSettingsButton } from "@/components/hos-tracker";
import { SmartSuggestions } from "@/components/smart-suggestions";
import { CalendarToggle } from "@/components/load-calendar";
import { MarketRateTrends } from "@/components/market-rate-trends";

import { useDefaultSort } from "@/hooks/use-preferences";

type SortOption = 'newest' | 'price_high' | 'price_low' | 'rpm_high' | 'rpm_low' | 'deadhead_low' | 'deadhead_high' | 'pickup_soonest' | 'pickup_latest' | 'distance_short' | 'distance_long' | 'weight_light' | 'weight_heavy';

interface SavedLoad {
    id: string;
    cloudtrucks_load_id?: string;
    created_at: string;
    status: string;
    details: CloudTrucksLoad & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    search_criteria?: EnrichedCriteria;
}

interface EnrichedCriteria extends SearchCriteria {
    id: string;
    deleted_at?: string | null;
    is_backhaul?: boolean;
    active?: boolean;
    origin_states?: string | string[]; // Allow string or array
    destination_states?: string | string[]; // Allow string or array
    last_scanned_at?: string | null;
    scan_status?: 'scanning' | 'success' | 'error' | null;
    scan_error?: string | null;
    last_scan_loads_found?: number | null;
    pickup_date_end?: string | null;
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
    const { defaultSort, setDefaultSort } = useDefaultSort()
    const [sortBy, setSortBy] = useState<SortOption>('newest')
    const [viewMode, setViewMode] = useState<'feed' | 'trash'>('feed');

    // Sync sortBy with user's default sort preference
    useEffect(() => {
        if (defaultSort && defaultSort !== sortBy) {
            setSortBy(defaultSort)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultSort])
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
    const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'instant' | 'standard' | 'hot'>('all') // Booking type filter
    const [scanningCriteriaIds, setScanningCriteriaIds] = useState<Set<string>>(new Set()) // Track active scans for progressive feedback
    const [cabbieMode, setCabbieMode] = useState(false) // Toggle for high-contrast driver mode
    const [showFuelSettings, setShowFuelSettings] = useState(false)
    const [fuelMpg, setFuelMpg] = useState(6.5)
    const [fuelPrice, setFuelPrice] = useState(3.80)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [visibleCount, setVisibleCount] = useState(20)
    const { ref: loadMoreRef, inView } = useInView()

    // Route Builder integration
    const routeBuilder = useRouteBuilder()

    // HOS (Hours of Service) tracking
    const hos = useHOS()

    // Compare Loads feature - removed per user request

    useEffect(() => {
        if (inView) {
            setVisibleCount(prev => prev + 20);
        }
    }, [inView]);

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
    }, []);

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
        if (permission === 'granted') {
            new Notification('CloudTrucks Scout', { body: 'Hot Load Alerts Enabled!' });
        }
    }, []);

    const checkForHotLoads = useCallback((newLoads: SavedLoad[]) => {
        if (!notificationsEnabled) return;
        const hotLoads = newLoads.filter(l => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate;
            const dist = typeof l.details.distance === 'string' ? parseFloat(l.details.distance) : l.details.distance;
            if (!rate || !dist) return false;
            const rpm = rate / dist;
            return rpm >= 3.0;
        });

        if (hotLoads.length > 0) {
            new Notification('High Value Loads Found!', {
                body: `${hotLoads.length} loads found showing > $3.00/mi. Top: $${hotLoads[0].details.rate}`,
                icon: '/icon-192x192.png'
            });
        }
    }, [notificationsEnabled]);

    useEffect(() => {
        const savedMpg = localStorage.getItem('cloudtrucks_mpg');
        const savedPrice = localStorage.getItem('cloudtrucks_fuel_price');
        if (savedMpg) setFuelMpg(parseFloat(savedMpg));
        if (savedPrice) setFuelPrice(parseFloat(savedPrice));
    }, []);

    const handleSaveFuelSettings = (mpg: number, price: number) => {
        setFuelMpg(mpg);
        setFuelPrice(price);
        localStorage.setItem('cloudtrucks_mpg', mpg.toString());
        localStorage.setItem('cloudtrucks_fuel_price', price.toString());
    };

    const checkCredentials = useCallback(async () => {
        if (isPublic) {
            setCredentialWarning(null);
            return;
        }

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
    }, [isPublic]);

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch criteria based on viewMode
            const criteriaUrl = viewMode === 'trash' ? '/api/criteria?view=trash' : '/api/criteria';

            const [loadsRes, criteriaRes, interestedRes] = await Promise.all([
                fetch('/api/loads'),
                fetch(criteriaUrl, { cache: 'no-store' }),
                fetch('/api/saved')
            ])

            const loadsResult = await loadsRes.json()
            const criteriaResult = await criteriaRes.json()
            const interestedResult = await interestedRes.json()

            const loadsData: SavedLoad[] = loadsResult.data || [];
            const criteriaData: EnrichedCriteria[] = criteriaResult.data || [];

            setLoads(loadsData);

            // Check for hot loads
            checkForHotLoads(loadsData);

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

    const handleScanStart = useCallback((id: string) => {
        setScanningCriteriaIds(prev => new Set(prev).add(id));
    }, []);

    const handleScanComplete = useCallback((id: string) => {
        setScanningCriteriaIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        // Also refresh data to show new results
        fetchData();
    }, [fetchData]);

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

    const handleRefreshCriteria = async (id: string) => {
        if (scanningCriteriaIds.has(id)) return;

        setScanningCriteriaIds(prev => new Set(prev).add(id));
        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteriaId: id })
            });

            if (res.ok) {
                const result = await res.json();
                console.log(`Refreshed criteria ${id}: ${result.loadsFound} loads found`);
                await fetchData();
            }
        } catch (error) {
            console.error('Refresh failed', error);
        } finally {
            setScanningCriteriaIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // --- Toggle Saved ---
    const handleToggleSaved = async (load: SavedLoad) => {
        if (savingInterest) return;
        setSavingInterest(load.id);
        try {
            const loadId = load.details.id;
            const isAlreadySaved = savedLoadIds.has(loadId);

            if (isAlreadySaved) {
                const res = await fetch(`/api/saved?cloudtrucks_load_id=${encodeURIComponent(loadId)}`, {
                    method: 'DELETE',
                });
                const result = await res.json();
                if (result.success) {
                    const next = new Set(savedLoadIds);
                    next.delete(loadId);
                    setSavedLoadIds(next);
                } else {
                    console.error('Failed to remove saved load:', result.error);
                }
                return;
            }

            const res = await fetch('/api/saved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cloudtrucks_load_id: loadId,
                    details: load.details,
                }),
            });
            const result = await res.json();
            if (result.success) {
                const next = new Set(savedLoadIds);
                next.add(loadId);
                setSavedLoadIds(next);
            } else {
                console.error('Failed to save load:', result.error);
            }
        } catch (error) {
            console.error('Toggle saved error:', error);
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
                case 'deadhead_low':
                    return getDeadhead(a) - getDeadhead(b);
                case 'deadhead_high':
                    return getDeadhead(b) - getDeadhead(a);
                case 'pickup_soonest':
                    return getPickupDate(a) - getPickupDate(b);
                case 'pickup_latest':
                    return getPickupDate(b) - getPickupDate(a);
                case 'distance_short':
                    return getDistance(a) - getDistance(b);
                case 'distance_long':
                    return getDistance(b) - getDistance(a);
                case 'weight_light': {
                    const getWeight = (l: SavedLoad) => {
                        const weight = l.details.weight || l.details.truck_weight_lb || 0;
                        return typeof weight === 'string' ? parseFloat(weight) : weight;
                    };
                    return getWeight(a) - getWeight(b);
                }
                case 'weight_heavy': {
                    const getWeight = (l: SavedLoad) => {
                        const weight = l.details.weight || l.details.truck_weight_lb || 0;
                        return typeof weight === 'string' ? parseFloat(weight) : weight;
                    };
                    return getWeight(b) - getWeight(a);
                }
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

    const matchesCriteriaFilters = (load: SavedLoad) => {
        // Look up the latest criteria state from our list, providing a fallback to the load's attached criteria if needed
        const loadCriteriaId = load.search_criteria?.id;
        if (!loadCriteriaId) return true;

        const liveCriteria = criteriaList.find(c => c.id === loadCriteriaId);
        const criteria = liveCriteria || (load.search_criteria as EnrichedCriteria | undefined);

        if (!criteria) return true;

        const rawRate = load.details.rate || load.details.trip_rate || 0;
        const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
        const rawDist = load.details.distance || load.details.trip_distance_mi || 0;
        const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
        const rpm = rate && dist ? rate / dist : null;

        // Weight Check
        const weight = load.details.weight || load.details.truck_weight_lb;
        const loadWeight = typeof weight === 'string' ? parseFloat(weight) : weight;

        // Rate & RPM Filters
        if (criteria.min_rate != null && rate < criteria.min_rate) {
            console.log(`[FILTER] Load ${load.id} filtered by rate: ${rate} < ${criteria.min_rate}`);
            return false;
        }
        if (criteria.min_rpm != null) {
            if (!rpm || rpm < criteria.min_rpm) {
                console.log(`[FILTER] Load ${load.id} filtered by RPM: ${rpm?.toFixed(2)} < ${criteria.min_rpm}`);
                return false;
            }
        }

        // Weight Filter (Instant)
        if (criteria.max_weight != null && loadWeight != null && loadWeight > criteria.max_weight) {
            return false;
        }

        return true;
    };

    const scoutMissionLoads = loads.filter(l => l.search_criteria && scoutCriteriaIds.has(l.search_criteria.id) && matchesCriteriaFilters(l));
    const backhaulMissionLoads = loads.filter(l => l.search_criteria && backhaulCriteriaIds.has(l.search_criteria.id) && matchesCriteriaFilters(l));

    console.log('[DASHBOARD] Total loads:', loads.length);
    console.log('[DASHBOARD] Scout loads after filter:', scoutMissionLoads.length);
    console.log('[DASHBOARD] Backhaul loads after filter:', backhaulMissionLoads.length);

    // --- Filter loads to only include those belonging to current criteria ---
    const criteriaIdsSet = new Set(criteriaList.map(c => c.id));
    const relevantLoads = loads.filter(l => l.search_criteria && criteriaIdsSet.has(l.search_criteria.id) && matchesCriteriaFilters(l));

    // --- Filter out stale loads (older than 24 hours) ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const freshLoads = relevantLoads.filter(load => {
        const createdAt = new Date(load.created_at);
        return createdAt > twentyFourHoursAgo;
    });

    // --- Deduplicate loads by ID AND Content (aggressive) ---
    const deduplicatedLoads: SavedLoad[] = (() => {
        const uniqueLoads: SavedLoad[] = [];
        const seenIds = new Set<string>();
        const seenContentHashes = new Set<string>();

        // Sort by created_at DESC so we keep the newest one
        const sorted = [...freshLoads].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        for (const load of sorted) {
            const loadId = load.details?.id || load.cloudtrucks_load_id;

            // 1. Dedup by ID
            if (loadId && seenIds.has(loadId)) continue;
            if (loadId) seenIds.add(loadId);

            // 2. Dedup by Content Hash (Origin + Dest + Rate + Pickup)
            // This catches cases where CloudTrucks issues new IDs for identical loads (noise)
            const d = load.details;
            const origin = d.origin_city || d.origin;
            const dest = d.dest_city || d.destination;
            const rate = d.rate || d.trip_rate;
            const pickup = d.pickup_date || d.origin_pickup_date;

            // Only use content hash if we have enough data points
            if (origin && dest && rate) {
                const contentHash = `${origin}|${dest}|${rate}|${pickup}`; // e.g. "Las Vegas|Ridgecrest|820|2026-01-26..."
                if (seenContentHashes.has(contentHash)) continue;
                seenContentHashes.add(contentHash);
            }

            uniqueLoads.push(load);
        }
        return uniqueLoads;
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
            if (bookingTypeFilter === 'hot') {
                // Hot loads are >$3/mi RPM
                const rawRate = l.details.rate || l.details.trip_rate || 0;
                const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
                const rawDist = l.details.distance || l.details.trip_distance_mi || 1;
                const dist = typeof rawDist === 'string' ? parseFloat(rawDist) : rawDist;
                const rpm = dist > 0 ? rate / dist : 0;
                return rpm >= 3.0;
            }
            const isInstant = l.details.instant_book === true;
            return bookingTypeFilter === 'instant' ? isInstant : !isInstant;
        });

    // Apply strict date filter - remove loads with pickup before criteria's pickup_date
    const dateFilteredLoads = bookingFilteredLoads.filter(load => {
        const criteria = load.search_criteria;
        if (!criteria?.pickup_date) return true; // No date filter = show all

        const pickupDate = load.details.pickup_date || load.details.origin_pickup_date;
        if (!pickupDate) return true; // No pickup date on load = show it

        // Normalize both dates to YYYY-MM-DD for comparison (ignore time)
        const criteriaDateStr = (criteria.pickup_date as string).slice(0, 10); // Get YYYY-MM-DD
        const criteriaEndDateStr = criteria.pickup_date_end ? (criteria.pickup_date_end as string).slice(0, 10) : null;

        const loadDateObj = new Date(pickupDate as string);
        const loadDateStr = loadDateObj.toISOString().slice(0, 10); // Get YYYY-MM-DD

        // If end date is present, check range [start, end]
        if (criteriaEndDateStr) {
            return loadDateStr >= criteriaDateStr && loadDateStr <= criteriaEndDateStr;
        }

        // Otherwise, match exact date or on/after depending on requirement. 
        // Previously it was on/after: return loadDateStr >= criteriaDateStr;
        // User requested "Date range search instead of just single date searching".
        // Single date search usually implies "on that date" or "on/after".
        // The previous code was `return loadDateStr >= criteriaDateStr;` (On or After).
        // Let's keep it as "On or After" if only start date is provided, OR "Within Range" if end is provided.
        // Actually, if it's a "single date" in the UI, it might mean exact match, but ">= start" 
        // is typical for logistics "Available Date".
        return loadDateStr >= criteriaDateStr;
    });

    const filteredLoads = sortLoads(dateFilteredLoads);



    // activeScoutsCount for CURRENT view
    const activeScoutsCount = activeCriteriaCount;
    const totalLoadsCount = scoutMissionLoads.length;
    const backhaulLoadsCount = backhaulMissionLoads.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full overflow-x-hidden">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 pb-6 border-b border-white/10 flex-wrap">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground/90">
                        {viewMode === 'trash' ? 'Trash Bin' : 'Mission Control'}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live Feed • Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <CalendarToggle
                        loads={filteredLoads}
                        onSelectLoad={(load) => setSelectedLoadForMap(load as SavedLoad)}
                    />
                    <HOSSettingsButton />
                    <ThemeToggle />
                    <div className="bg-muted/50 p-1 rounded-lg border border-border inline-flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('feed')}
                            className={cn(
                                "transition-all",
                                viewMode === 'feed'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            Live Feed
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('trash')}
                            className={cn(
                                "transition-all",
                                viewMode === 'trash'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            Trash ({loads.filter(l => l.status === 'deleted').length})
                        </Button>
                    </div>

                    <Button
                        variant={cabbieMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCabbieMode(!cabbieMode)}
                        className={cn(
                            "transition-all font-bold uppercase tracking-wider",
                            cabbieMode ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500" : "text-muted-foreground border-dashed"
                        )}
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        {cabbieMode ? "Cabbie Mode: ON" : "Cabbie Mode"}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFuelSettings(true)}
                        className="glass-panel border-white/20 text-amber-500 hover:text-amber-400"
                    >
                        <Fuel className="mr-2 h-4 w-4" />
                        Settings
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={requestNotificationPermission}
                        className={cn(
                            "glass-panel border-white/20",
                            notificationsEnabled ? "text-green-500 hover:text-green-400" : "text-slate-500 hover:text-slate-400"
                        )}
                        title={notificationsEnabled ? "Alerts Active" : "Enable Alerts"}
                    >
                        <Bell className={cn("h-4 w-4", notificationsEnabled && "fill-current")} />
                    </Button>

                    <Button
                        onClick={handleScan}
                        disabled={scanning}
                        className={cn(
                            "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-lg transition-all hover:scale-105",
                            scanning && "animate-pulse"
                        )}
                    >
                        {scanning ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-2 h-4 w-4 fill-current" />
                                Scan Market
                            </>
                        )}
                    </Button>


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

            {/* --- SMART SUGGESTIONS & MARKET INSIGHTS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                <SmartSuggestions
                    loads={filteredLoads}
                    savedLoadIds={savedLoadIds}
                    onSelectLoad={(load) => setSelectedLoadForMap(load as SavedLoad)}
                    onFilterInstant={() => setBookingTypeFilter('instant')}
                    onAddBackhaul={async (destCity, destState) => {
                        // Create a backhaul search criteria
                        try {
                            const formData = new FormData();
                            formData.append('origin_city', destCity);
                            formData.append('origin_state', destState);
                            formData.append('is_backhaul', 'true');
                            formData.append('pickup_distance', '50');
                            formData.append('booking_type', 'Any');
                            formData.append('equipment_type', 'Any');

                            const res = await fetch('/api/criteria', {
                                method: 'POST',
                                body: formData
                            });

                            if (res.ok) {
                                // Trigger scan
                                await fetch('/api/scan', { method: 'POST' });
                                fetchData();
                            }
                        } catch (error) {
                            console.error('Failed to create backhaul:', error);
                        }
                    }}
                />

                <MarketRateTrends loads={filteredLoads} />
            </div>

            {/* --- COMMAND CENTER (Stats) --- */}
            <div className="space-y-4 mb-10">
                {/* KPI Cards */}
                <BentoGrid className="mb-8">
                    <BentoGridItem
                        title="System Status"
                        description="Operational"
                        header={<div className={cn("text-3xl font-bold", loading ? "text-yellow-500" : "text-emerald-500")}>{loading ? 'Syncing...' : 'Online'}</div>}
                        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                        className="md:col-span-1 glass-panel hover:bg-card/50"
                    />
                    <BentoGridItem
                        title="Active Fronthauls"
                        description={
                            <span>
                                Monitoring
                                <a href="/routes" className="block text-xs text-muted-foreground hover:text-primary mt-1 underline decoration-dotted">
                                    View {backhaulLoadsCount} Backhauls
                                </a>
                            </span>
                        }
                        header={<div className="text-3xl font-bold text-primary">{totalLoadsCount}</div>}
                        icon={<Search className="h-4 w-4 text-muted-foreground" />}
                        className="md:col-span-1 glass-panel hover:bg-card/50"
                    />
                    <BentoGridItem
                        title="Loads Acquired"
                        description="Since last reset"
                        header={<div className="text-3xl font-bold text-foreground">{totalLoadsCount}</div>}
                        icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                        className="md:col-span-1 glass-panel hover:bg-card/50"
                    />
                    <BentoGridItem
                        title="Saved Targets"
                        description="High interest"
                        header={<div className="text-3xl font-bold text-orange-500">{interestedCount}</div>}
                        icon={<Star className="h-4 w-4 text-muted-foreground" />}
                        className="md:col-span-1 glass-panel hover:bg-card/50"
                    />
                </BentoGrid>
            </div>

            {/* --- FRONTHAULS DECK --- */}
            <div className="space-y-4 rounded-sm border border-dashed border-border/50 bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Logistics Feed</p>
                        </div>
                        <h3 className="text-lg font-bold font-mono uppercase text-foreground flex items-center gap-2">
                            Route Fronthauls
                        </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-background border border-border px-2 py-1 rounded-sm text-foreground/70">{scoutMissions.length} ROUTES ACTIVE</span>
                </div>

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
                                isLoading={scanningCriteriaIds.has(mission.criteria.id)}
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
                                    <div className="text-sm flex flex-wrap items-center gap-1">
                                        <span>{mission.criteria.origin_city}{mission.criteria.origin_state ? `, ${mission.criteria.origin_state}` : ''}</span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span>{mission.criteria.dest_city ? `${mission.criteria.dest_city}${mission.criteria.destination_state ? `, ${mission.criteria.destination_state}` : ''}` : 'Any'}</span>
                                    </div>
                                }
                                description={
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span>{mission.count} Loads</span>
                                            {/* Action Buttons */}
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className={cn("h-6 w-6 text-slate-400 hover:text-green-500", scanningCriteriaIds.has(mission.criteria.id) && "animate-spin text-green-500")} onClick={(e) => { e.stopPropagation(); handleRefreshCriteria(mission.criteria.id); }}>
                                                    <RefreshCw className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        {mission.criteria.last_scanned_at && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded inline-flex">
                                                <Clock className="h-3 w-3 opacity-70" />
                                                <span>
                                                    {new Date(mission.criteria.last_scanned_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        )
                    })}
                </BentoGrid>
            </div>

            {/* --- BACKHAULS DECK --- */}
            <div className="space-y-4 mt-10 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Backhauls</p>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-indigo-500" />
                            Route Backhauls
                        </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">{backhaulMissions.length} routes</span>
                </div>

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
                                isLoading={scanningCriteriaIds.has(mission.criteria.id)}
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
                                    <div className="text-sm flex flex-wrap items-center gap-1">
                                        <span>{mission.criteria.origin_city}{mission.criteria.origin_state ? `, ${mission.criteria.origin_state}` : ''}</span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span>{mission.criteria.dest_city ? `${mission.criteria.dest_city}${mission.criteria.destination_state ? `, ${mission.criteria.destination_state}` : ''}` : 'Any'}</span>
                                    </div>
                                }
                                description={
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span>{mission.count} Loads</span>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className={cn("h-6 w-6 text-slate-400 hover:text-green-500", scanningCriteriaIds.has(mission.criteria.id) && "animate-spin text-green-500")} onClick={(e) => { e.stopPropagation(); handleRefreshCriteria(mission.criteria.id); }}>
                                                    <RefreshCw className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        {mission.criteria.last_scanned_at && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded inline-flex">
                                                <Clock className="h-3 w-3 opacity-70" />
                                                <span>
                                                    {new Date(mission.criteria.last_scanned_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
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
                            onClick={() => setBookingTypeFilter('hot')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1", bookingTypeFilter === 'hot' ? "bg-orange-500/20 text-orange-500 shadow-sm border border-orange-500/30" : "text-muted-foreground hover:text-foreground hover:text-orange-400")}
                        >
                            <Flame className="h-3 w-3" /> Hot
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
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2">
                                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    Sort
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 glass-panel max-h-[400px] overflow-y-auto">
                                <DropdownMenuItem onClick={() => setSortBy('price_high')}>
                                    Price: High to Low
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('price_low')}>
                                    Price: Low to High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('rpm_high')}>
                                    RPM: High to Low
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('rpm_low')}>
                                    RPM: Low to High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('deadhead_low')}>
                                    Deadhead: Shortest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('deadhead_high')}>
                                    Deadhead: Longest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('pickup_soonest')}>
                                    Pickup: Earliest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('pickup_latest')}>
                                    Pickup: Latest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('distance_short')}>
                                    Loaded miles: Lowest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('distance_long')}>
                                    Loaded miles: Highest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('weight_light')}>
                                    Weight: Lightest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('weight_heavy')}>
                                    Weight: Heaviest
                                </DropdownMenuItem>
                                {sortBy !== defaultSort && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setDefaultSort(sortBy)}
                                            className="text-blue-400"
                                        >
                                            <Star className="h-4 w-4 mr-2" />
                                            Set as default
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                        {filteredLoads.slice(0, visibleCount).map((load) => {
                            const isSaved = savedLoadIds.has(load.details.id);
                            const isInRouteBuilder = routeBuilder.isLoadInBuilder(load.details.id);

                            return (
                                <LoadCard
                                    key={load.id}
                                    load={load}
                                    isSaved={isSaved}
                                    onToggleSaved={(e) => { e.stopPropagation(); handleToggleSaved(load); }}
                                    onViewMap={(e) => { e.stopPropagation(); setSelectedLoadForMap(load); }}
                                    onAddToRoute={(e) => {
                                        e.stopPropagation();
                                        routeBuilder.addLoad({
                                            id: load.id,
                                            cloudtrucks_load_id: load.cloudtrucks_load_id || load.details.id,
                                            details: load.details,
                                            created_at: load.created_at
                                        });
                                    }}
                                    isInRouteBuilder={isInRouteBuilder}
                                    cabbieMode={cabbieMode}
                                    mpg={fuelMpg}
                                    fuelPrice={fuelPrice}
                                />
                            );
                        })}
                        {filteredLoads.length > visibleCount && (
                            <div ref={loadMoreRef} className="col-span-full h-24 flex items-center justify-center">
                                <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}
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
                    onScanStart={(id) => {
                        setScanningCriteriaIds(prev => {
                            const next = new Set(prev);
                            next.add(id);
                            return next;
                        });
                    }}
                    onScanComplete={(id) => {
                        setScanningCriteriaIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                        fetchData();
                    }}
                />
            )}
            <FuelSettingsDialog
                open={showFuelSettings}
                onOpenChange={setShowFuelSettings}
                currentMpg={fuelMpg}
                currentFuelPrice={fuelPrice}
                onSave={handleSaveFuelSettings}
            />

            {/* Mobile Floating Action Button (FAB) for Scan */}
            <div className="fixed bottom-6 right-6 z-50 md:hidden">
                <Button
                    onClick={handleScan}
                    disabled={scanning}
                    size="lg"
                    className={cn(
                        "h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90",
                        scanning && "animate-pulse"
                    )}
                >
                    {scanning ? (
                        <RefreshCw className="h-6 w-6 animate-spin" />
                    ) : (
                        <Zap className="h-6 w-6 fill-current" />
                    )}
                </Button>
            </div>
        </div>
    )
}
