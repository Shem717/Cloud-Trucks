'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap, Star, ArrowUpDown, AlertTriangle, ArrowLeftRight, Search, Map, Pencil, ChevronDown, ChevronUp, ArrowRight, Fuel, Bell, Flame, Clock, Plus } from 'lucide-react'


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
import { CommandCenterLayout, CommandSidebar, CommandFeed, CommandPanel } from "@/components/dashboard/command-center-layout";
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

    const handleCreateCriteria = () => {
        setEditingCriteria({
            id: '', // Empty ID signals creation
            origin_city: '',
            origin_state: '',
            pickup_distance: 50,
            destination_states: [],
            equipment_type: 'Any',
            booking_type: 'Any'
        } as unknown as EnrichedCriteria);
    };

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

        // Clear any stuck scanning states on mount
        // This ensures spinners don't persist across page refreshes
        setScanningCriteriaIds(new Set());
        console.log('[Dashboard] Cleared all scanning states on mount');

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
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope: 'fronthaul' })
            });
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

        // Check credentials before scanning
        if (credentialWarning) {
            alert('Cannot scan: ' + credentialWarning);
            return;
        }

        setScanningCriteriaIds(prev => new Set(prev).add(id));
        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteriaId: id })
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    console.log(`Refreshed criteria ${id}: ${result.loadsFound} loads found`);
                } else {
                    console.error(`Scan failed for criteria ${id}:`, result.error);
                    // Show user-friendly error
                    if (result.error?.includes('credentials') || result.error?.includes('Unauthorized')) {
                        setCredentialWarning('Your CloudTrucks session has expired. Please reconnect your account.');
                    }
                }
                await fetchData();
            } else {
                const result = await res.json();
                console.error('Refresh failed', result.error);
                if (result.error?.includes('credentials')) {
                    setCredentialWarning('Your CloudTrucks session has expired. Please reconnect your account.');
                }
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
                    const criteriaId = result.criteria?.id;
                    await fetch('/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: criteriaId ? JSON.stringify({ criteriaId }) : undefined,
                    });
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
        <div className="h-screen w-full bg-black text-white overflow-hidden flex flex-col font-sans">
            <CommandCenterLayout>
                <CommandSidebar>
                    {/* --- HEADER (Mini) --- */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold tracking-tight text-white/90">
                            {viewMode === 'trash' ? 'TRASH BIN' : 'MISSION CONTROL'}
                        </h2>
                        <p className="text-[10px] font-mono text-emerald-500 mt-1 flex items-center gap-2">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            ONLINE • {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </p>
                    </div>

                    {/* --- FRONTHAULS DECK --- */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-1 bg-primary rounded-full" />
                                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fronthauls</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">{scoutMissions.length}</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-white/50 hover:text-white hover:bg-white/10" onClick={handleCreateCriteria}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Batch Action Bar for Scouts */}
                        {scoutMissions.length > 0 && (
                            <div className="flex items-center justify-between bg-white/5 p-1.5 rounded border border-white/10">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-3 w-3 rounded border-gray-600 bg-transparent text-primary focus:ring-0 focus:ring-offset-0"
                                        checked={selectedScoutIds.size === scoutMissions.length && scoutMissions.length > 0}
                                        onChange={toggleScoutSelectAll}
                                    />
                                    <span className="text-[10px] text-muted-foreground mr-1">All</span>
                                </div>
                                <div className="flex gap-1">
                                    {selectedScoutIds.size > 0 && (
                                        <>
                                            {viewMode === 'trash' ? (
                                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleBatchScoutAction('restore')}>
                                                    <RefreshCw className="h-3 w-3" />
                                                </Button>
                                            ) : null}
                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500 hover:text-red-400 hover:bg-red-950/30" onClick={() => handleBatchScoutAction('delete')}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {/* 'All' Card */}
                            <div
                                onClick={() => setSelectedCriteriaId(null)}
                                className={cn(
                                    "group relative overflow-hidden rounded-lg p-3 cursor-pointer transition-all border",
                                    !selectedCriteriaId
                                        ? "bg-primary/20 border-primary/50"
                                        : "bg-white/5 border-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-white">All Operations</span>
                                    <span className="text-xs font-mono text-white/70">{scoutMissionLoads.length}</span>
                                </div>
                            </div>

                            {/* Scout Cards */}
                            {scoutMissions.map((mission: MissionStats) => {
                                const isSelected = selectedScoutIds.has(mission.criteria.id);
                                return (
                                    <div
                                        key={mission.criteria.id}
                                        onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                        className={cn(
                                            "group relative rounded-lg p-3 cursor-pointer transition-all border hover:bg-white/5",
                                            isSelected ? "bg-blue-900/20 border-blue-500/50" :
                                                selectedCriteriaId === mission.criteria.id ? "bg-primary/10 border-primary/50" : "bg-transparent border-white/5"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3 rounded border-gray-600 bg-transparent text-blue-500 focus:ring-0 focus:ring-offset-0"
                                                    checked={isSelected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => { e.stopPropagation(); toggleScoutSelection(mission.criteria.id); }}
                                                />
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white/5 border-white/10 text-white/50">{mission.criteria.equipment_type || 'Any'}</Badge>
                                            </div>
                                            {mission.maxRate > 0 && <span className="font-mono text-[10px] text-green-400 font-bold">${mission.maxRate}+</span>}
                                        </div>

                                        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1 flex-wrap">
                                            <span className={!mission.criteria.origin_city ? "text-white/40" : ""}>{mission.criteria.origin_city || "Any Origin"}</span>
                                            <ArrowRight className="h-3 w-3 text-white/20" />
                                            <span className={!mission.criteria.dest_city ? "text-white/40" : ""}>{mission.criteria.dest_city || "Any Dest"}</span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-white/40 font-mono">{mission.count} Loads</span>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className={cn("h-5 w-5 text-slate-500 hover:text-green-500", scanningCriteriaIds.has(mission.criteria.id) && "animate-spin text-green-500")} onClick={(e) => { e.stopPropagation(); handleRefreshCriteria(mission.criteria.id); }}>
                                                    <RefreshCw className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-500 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-500 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {scanningCriteriaIds.has(mission.criteria.id) && (
                                            <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
                                                <RefreshCw className="h-4 w-4 text-green-500 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* --- BACKHAULS DECK --- */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-1 bg-indigo-500 rounded-full" />
                                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Backhauls</p>
                            </div>
                            <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">{backhaulMissions.length}</span>
                        </div>
                        {/* Backhaul Cards (Simplified for brevity, similar structure) */}
                        <div className="space-y-2">
                            {/* 'All' Card */}
                            <div
                                onClick={() => setSelectedCriteriaId(null)} // This logic handles both front/back effectively by resetting
                                className={cn(
                                    "group relative overflow-hidden rounded-lg p-3 cursor-pointer transition-all border",
                                    "bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/50"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-indigo-200">All Backhauls</span>
                                    <span className="text-xs font-mono text-indigo-300/70">{backhaulMissionLoads.length}</span>
                                </div>
                            </div>

                            {backhaulMissions.map((mission: MissionStats) => {
                                const isSelected = selectedBackhaulIds.has(mission.criteria.id);
                                return (
                                    <div
                                        key={mission.criteria.id}
                                        onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                        className={cn(
                                            "group relative rounded-lg p-3 cursor-pointer transition-all border hover:bg-white/5",
                                            isSelected ? "bg-indigo-900/20 border-indigo-500/50" :
                                                selectedCriteriaId === mission.criteria.id ? "bg-indigo-500/10 border-indigo-500/50" : "bg-transparent border-white/5"
                                        )}
                                    >
                                        <div className="text-xs font-medium text-indigo-100 mb-1 flex items-center gap-1 flex-wrap">
                                            <span className={!mission.criteria.origin_city ? "text-white/40" : ""}>{mission.criteria.origin_city || "Any"}</span>
                                            <ArrowRight className="h-3 w-3 text-indigo-500/50" />
                                            <span className={!mission.criteria.dest_city ? "text-white/40" : ""}>{mission.criteria.dest_city || "Any"}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-indigo-200/40 font-mono">{mission.count} Loads</span>
                                            {/* Simplified actions */}
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-indigo-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </CommandSidebar>

                <CommandFeed>
                    {/* --- FEED TOOLBAR --- */}
                    <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 mb-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('feed')}
                                className={cn("h-8 px-3 text-xs font-medium rounded-full", viewMode === 'feed' ? "bg-white text-black" : "text-white/50 hover:text-white")}
                            >
                                Live Feed
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('trash')}
                                className={cn("h-8 px-3 text-xs font-medium rounded-full", viewMode === 'trash' ? "bg-red-500/20 text-red-400" : "text-white/50 hover:text-white")}
                            >
                                Trash ({loads.filter(l => l.status === 'deleted').length})
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Sort & Filter Controls */}
                            <div className="bg-white/5 p-0.5 rounded-lg border border-white/10 flex">
                                <button onClick={() => setBookingTypeFilter('all')} className={cn("px-2 py-1 text-[10px] rounded-md transition-all", bookingTypeFilter === 'all' ? "bg-white/10 text-white" : "text-white/40")}>All</button>
                                <button onClick={() => setBookingTypeFilter('hot')} className={cn("px-2 py-1 text-[10px] rounded-md transition-all", bookingTypeFilter === 'hot' ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-orange-400")}>Hot</button>
                                <button onClick={() => setBookingTypeFilter('instant')} className={cn("px-2 py-1 text-[10px] rounded-md transition-all", bookingTypeFilter === 'instant' ? "bg-yellow-500/20 text-yellow-400" : "text-white/40 hover:text-yellow-400")}>Instant</button>
                            </div>

                            {/* Sort Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-white/60 hover:text-white border border-white/10 bg-white/5">
                                        <ArrowUpDown className="mr-1.5 h-3 w-3" />
                                        {sortBy === 'newest' ? 'Newest' :
                                            sortBy === 'price_high' ? 'Price ↑' :
                                                sortBy === 'price_low' ? 'Price ↓' :
                                                    sortBy === 'rpm_high' ? 'RPM ↑' :
                                                        sortBy === 'rpm_low' ? 'RPM ↓' :
                                                            sortBy === 'deadhead_low' ? 'DH ↓' :
                                                                sortBy === 'deadhead_high' ? 'DH ↑' :
                                                                    sortBy === 'pickup_soonest' ? 'Pickup ↑' :
                                                                        sortBy === 'pickup_latest' ? 'Pickup ↓' :
                                                                            sortBy === 'distance_short' ? 'Dist ↓' :
                                                                                sortBy === 'distance_long' ? 'Dist ↑' :
                                                                                    sortBy === 'weight_light' ? 'Weight ↓' :
                                                                                        sortBy === 'weight_heavy' ? 'Weight ↑' : 'Sort'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-200">
                                    <DropdownMenuItem onClick={() => { setSortBy('newest'); setDefaultSort('newest'); }}>Newest First</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={() => { setSortBy('price_high'); setDefaultSort('price_high'); }}>Price: High → Low</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSortBy('price_low'); setDefaultSort('price_low'); }}>Price: Low → High</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={() => { setSortBy('rpm_high'); setDefaultSort('rpm_high'); }}>RPM: High → Low</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSortBy('rpm_low'); setDefaultSort('rpm_low'); }}>RPM: Low → High</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={() => { setSortBy('deadhead_low'); setDefaultSort('deadhead_low'); }}>Deadhead: Low → High</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSortBy('deadhead_high'); setDefaultSort('deadhead_high'); }}>Deadhead: High → Low</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={() => { setSortBy('pickup_soonest'); setDefaultSort('pickup_soonest'); }}>Pickup: Soonest</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSortBy('pickup_latest'); setDefaultSort('pickup_latest'); }}>Pickup: Latest</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={() => { setSortBy('distance_short'); setDefaultSort('distance_short'); }}>Distance: Short → Long</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSortBy('distance_long'); setDefaultSort('distance_long'); }}>Distance: Long → Short</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={handleScan}
                                disabled={scanning}
                                size="sm"
                                className={cn(
                                    "h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 text-xs shadow-lg transition-all",
                                    scanning && "animate-pulse"
                                )}
                            >
                                {scanning ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Zap className="mr-2 h-3 w-3 fill-current" />}
                                {scanning ? 'Scanning...' : 'Scan Market'}
                            </Button>
                        </div>
                    </div>

                    {/* --- FEED LIST --- */}
                    {filteredLoads.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl m-4">
                            <Filter className="h-8 w-8 text-white/20 mb-2" />
                            <p className="text-sm text-white/40">No loads detected.</p>
                        </div>
                    ) : (
                        <div className="pb-20 space-y-3 px-1">
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
                                <div ref={loadMoreRef} className="h-12 flex items-center justify-center">
                                    <Activity className="h-4 w-4 animate-spin text-white/20" />
                                </div>
                            )}
                        </div>
                    )}
                </CommandFeed>

                <CommandPanel>
                    {/* --- RIGHT PANEL - INTELLIGENCE --- */}
                    <div className="space-y-6">
                        {/* Status Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-wider">System Status</p>
                                <p className={cn("text-lg font-bold mt-1", loading ? "text-yellow-500" : "text-emerald-500")}>
                                    {loading ? 'SYNCING' : 'ONLINE'}
                                </p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-wider">Saved Targets</p>
                                <p className="text-lg font-bold mt-1 text-orange-400">{interestedCount}</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Market Intelligence
                            </h4>

                            <MarketRateTrends loads={filteredLoads} />
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <SmartSuggestions
                                loads={filteredLoads}
                                savedLoadIds={savedLoadIds}
                                onSelectLoad={(load) => setSelectedLoadForMap(load as SavedLoad)}
                                onFilterInstant={() => setBookingTypeFilter('instant')}
                                onAddBackhaul={async (destCity, destState) => {
                                    // Re-using existing logic logic by duplicating it here or invoking a shared handler if we had one
                                    // For now, just logging or we could extract handleAddBackhaul to body
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
                                        if (res.ok) fetchData();
                                    } catch (e) { console.error(e) }
                                }}
                            />
                        </div>
                    </div>
                </CommandPanel>
            </CommandCenterLayout>

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
                    onScanStart={handleScanStart} // Use handler
                    onScanComplete={handleScanComplete} // Use handler
                />
            )}
            <FuelSettingsDialog
                open={showFuelSettings}
                onOpenChange={setShowFuelSettings}
                currentMpg={fuelMpg}
                currentFuelPrice={fuelPrice}
                onSave={handleSaveFuelSettings}
            />

            {/* Mobile FAB */}
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
                    {scanning ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6 fill-current" />}
                </Button>
            </div>
        </div>
    );
}
