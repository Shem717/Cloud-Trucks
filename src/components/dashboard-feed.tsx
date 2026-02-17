'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Weight, Calendar, Truck, Activity, Filter, RefreshCw, Trash2, Zap, Star, ArrowUpDown, AlertTriangle, ArrowLeftRight, Search, Map, Pencil, ChevronDown, ChevronUp, ArrowRight, Fuel, Bell, Flame, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react'


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
import { BrokerLogo } from "./broker-logo"
import { WeatherBadge } from "./weather-badge"
import { ChainLawBadge, useChainLaws } from "./chain-law-badge"
import { MapboxIntelligenceModal } from "./mapbox-intelligence-modal"
import { EditCriteriaDialog } from "@/components/edit-criteria-dialog"
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { ProLayout, ProSidebar, ProMain, ProDetailPanel } from "@/components/dashboard/pro-layout";
import { LoadDataTable } from "@/components/dashboard/load-data-table";
import { LoadDetailView } from "@/components/dashboard/load-detail-view";
import { ProSearchHeader } from "@/components/dashboard/pro-search-header";
import { MarketTrendsModule } from "@/components/dashboard/market-trends-module";

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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [panelCollapsed, setPanelCollapsed] = useState(false);

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
    }, [defaultSort])

    const [savingInterest, setSavingInterest] = useState<string | null>(null)
    const [backhaulingId, setBackhaulingId] = useState<string | null>(null)
    const [savedLoadIds, setSavedLoadIds] = useState<Set<string>>(new Set()) // Track saved loads for UI feedback
    const [interestedCount, setInterestedCount] = useState<number>(0)
    const [credentialWarning, setCredentialWarning] = useState<string | null>(null)
    const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
    const [selectedBackhaulIds, setSelectedBackhaulIds] = useState<Set<string>>(new Set())
    const [editingCriteria, setEditingCriteria] = useState<EnrichedCriteria | null>(null) // Edit Modal State
    const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'instant' | 'standard' | 'hot'>('all') // Booking type filter
    const [hideZeroRateLoads, setHideZeroRateLoads] = useState(false) // Filter for $0 loads
    const [scanningCriteriaIds, setScanningCriteriaIds] = useState<Set<string>>(new Set()) // Track active scans for progressive feedback
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
                fetch('/api/loads?limit=100'),
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
        setScanningCriteriaIds(new Set());
        console.log('[Dashboard] Cleared all scanning states on mount');

        // Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
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
            return false;
        }
        if (criteria.min_rpm != null) {
            if (!rpm || rpm < criteria.min_rpm) {
                return false;
            }
        }

        // Weight Filter (Instant)
        if (criteria.max_weight != null && loadWeight != null && loadWeight > criteria.max_weight) {
            return false;
        }

        return true;
    };

    // Calculate these memos for the filters
    const scoutMissionLoads = loads.filter(l => l.search_criteria && scoutCriteriaIds.has(l.search_criteria.id) && matchesCriteriaFilters(l));
    const backhaulMissionLoads = loads.filter(l => l.search_criteria && backhaulCriteriaIds.has(l.search_criteria.id) && matchesCriteriaFilters(l));

    const scoutMissions = generateStats(scoutCriteria, scoutMissionLoads);
    const backhaulMissions = generateStats(backhaulCriteria, backhaulMissionLoads);

    // --- Deduplicate loads by ID AND Content (aggressive) ---
    // Moved to useMemo for safety/performance
    const deduplicatedLoads = useMemo(() => {
        const uniqueLoads: SavedLoad[] = [];
        const seenIds = new Set<string>();
        const seenContentHashes = new Set<string>();

        // Filter out stale loads (older than 24 hours) here if needed, or just sort
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const freshLoads = loads.filter(load => new Date(load.created_at) > twentyFourHoursAgo);

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
    }, [loads]);

    // --- Filter loads to only include those belonging to current criteria ---
    const criteriaIdsSet = new Set(criteriaList.map(c => c.id));

    const filteredLoads = (viewMode === 'trash' ? loads : deduplicatedLoads.filter(l => l.search_criteria && criteriaIdsSet.has(l.search_criteria.id)))
        .filter(l => {
            // Further filter by selection if active
            if (selectedScoutIds.size > 0 && l.search_criteria && !selectedScoutIds.has(l.search_criteria.id)) return false;
            if (selectedBackhaulIds.size > 0 && l.search_criteria && !selectedBackhaulIds.has(l.search_criteria.id)) return false;
            if (selectedCriteriaId && l.search_criteria?.id !== selectedCriteriaId) return false;

            // Hide $0 loads filter
            if (hideZeroRateLoads) {
                const rate = l.details.trip_rate || l.details.rate || 0;
                if (rate <= 0) return false;
            }

            // Booking Type Filter (if applicable to load details)
            if (bookingTypeFilter !== 'all') {
                const isInstant = l.details.instant_book === true;
                const isHot = (typeof l.details.rate === 'number' && typeof l.details.distance === 'number') ? (l.details.rate / l.details.distance >= 3) : false;

                if (bookingTypeFilter === 'instant' && !isInstant) return false;
                if (bookingTypeFilter === 'hot' && !isHot) return false;
                if (bookingTypeFilter === 'standard' && (isInstant || isHot)) return false;
            }

            // Also apply match filters
            if (!matchesCriteriaFilters(l)) return false;

            return true;
        });

    // Sort
    const sortedLoads = sortLoads(filteredLoads);

    // --- Pro Layout State ---
    const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
    const selectedLoad = loads.find(l => l.id === selectedLoadId)?.details;
    const selectedLoadWrapper = loads.find(l => l.id === selectedLoadId);

    const handleRowClick = (row: any) => {
        setSelectedLoadId(row.id);
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!selectedLoadId) {
                    if (sortedLoads.length > 0) setSelectedLoadId(sortedLoads[0].id);
                    return;
                }
                const idx = sortedLoads.findIndex(l => l.id === selectedLoadId);
                if (idx !== -1 && idx < sortedLoads.length - 1) {
                    setSelectedLoadId(sortedLoads[idx + 1].id);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!selectedLoadId) return;
                const idx = sortedLoads.findIndex(l => l.id === selectedLoadId);
                if (idx > 0) {
                    setSelectedLoadId(sortedLoads[idx - 1].id);
                }
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (selectedLoadWrapper) {
                    handleToggleSaved(selectedLoadWrapper);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLoadId, sortedLoads, selectedLoadWrapper, handleToggleSaved]);

    return (
        <div className="h-screen w-full bg-black text-white overflow-hidden flex flex-col font-sans">
            <ProLayout>
                <ProSidebar>
                    <div className="p-4 space-y-6">
                        {/* --- HEADER (Mini) --- */}
                        <div className="mb-4">
                            <h2 className="text-xl font-bold tracking-tight text-white/90">
                                {viewMode === 'trash' ? 'TRASH BIN' : 'MARKET'}
                            </h2>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                <span className="flex items-center gap-2">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    ONLINE
                                </span>
                                <span>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                            </div>
                        </div>

                        {/* Market Trends (New) */}
                        <div className="flex-1 overflow-hidden rounded-lg border border-white/5 mb-4">
                            <MarketTrendsModule loads={sortedLoads} />
                        </div>

                        {/* --- FRONTHAULS --- */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Fronthauls</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCreateCriteria}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            {/* 'All' Card */}
                            <div
                                onClick={() => setSelectedCriteriaId(null)}
                                className={cn(
                                    "group relative overflow-hidden rounded-md p-2 cursor-pointer transition-all border",
                                    !selectedCriteriaId
                                        ? "bg-primary/20 border-primary/50"
                                        : "bg-white/5 border-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white">All Active</span>
                                    <span className="text-[10px] font-mono text-white/70">{scoutMissionLoads.length}</span>
                                </div>
                            </div>

                            {/* Scouts List */}
                            {scoutMissions.map((mission: MissionStats) => (
                                    <div
                                        key={mission.criteria.id}
                                        onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                        className={cn(
                                            "group relative rounded-md p-2 cursor-pointer transition-all border hover:bg-white/5",
                                            selectedCriteriaId === mission.criteria.id ? "bg-primary/10 border-primary/50" : "bg-transparent border-white/5"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-mono text-white/50">{mission.criteria.equipment_type || 'Any'}</span>
                                            {mission.maxRate > 0 && <span className="text-[10px] text-green-400 font-mono">${mission.maxRate}+</span>}
                                        </div>
                                        <div className="text-xs font-medium text-white flex items-center gap-1">
                                            <span className="truncate max-w-[40%]">{mission.criteria.origin_city || "Any"}</span>
                                            <ArrowRight className="h-3 w-3 text-white/20 flex-shrink-0" />
                                            <span className="truncate max-w-[40%]">{mission.criteria.dest_city || "Any"}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-white" onClick={(e) => { e.stopPropagation(); handleRefreshCriteria(mission.criteria.id); }}>
                                                    <RefreshCw className={cn("h-3 w-3", scanningCriteriaIds.has(mission.criteria.id) && "animate-spin")} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1">{mission.count}</Badge>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        {/* --- BACKHAULS --- */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Backhauls</span>
                                <span className="text-[10px] text-muted-foreground">{backhaulMissionLoads.length} loads</span>
                            </div>
                            {backhaulMissions.length === 0 ? (
                                <div className="text-[10px] text-muted-foreground/60 py-2 text-center">
                                    No backhaul queries yet. Save a load and create a backhaul from its destination.
                                </div>
                            ) : (
                                <>
                                    {backhaulMissions.map((mission: MissionStats) => (
                                        <div
                                            key={mission.criteria.id}
                                            onClick={() => setSelectedCriteriaId(mission.criteria.id)}
                                            className={cn(
                                                "group relative rounded-md p-2 cursor-pointer transition-all border hover:bg-white/5",
                                                selectedCriteriaId === mission.criteria.id ? "bg-amber-500/10 border-amber-500/30" : "bg-transparent border-white/5"
                                            )}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-bold text-amber-400/70 uppercase tracking-wider">Return</span>
                                                {mission.maxRate > 0 && <span className="text-[10px] text-green-400 font-mono">${mission.maxRate}+</span>}
                                            </div>
                                            <div className="text-xs font-medium text-white flex items-center gap-1">
                                                <span className="truncate max-w-[40%]">{mission.criteria.origin_city || "Any"}</span>
                                                <ArrowRight className="h-3 w-3 text-amber-500/40 flex-shrink-0" />
                                                <span className="truncate max-w-[40%]">{mission.criteria.dest_city || "Any"}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-white" onClick={(e) => { e.stopPropagation(); handleRefreshCriteria(mission.criteria.id); }}>
                                                        <RefreshCw className={cn("h-3 w-3", scanningCriteriaIds.has(mission.criteria.id) && "animate-spin")} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); setEditingCriteria(mission.criteria); }}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(mission.criteria.id); }}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-400">{mission.count}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </ProSidebar>

                <ProMain>
                    <ProSearchHeader onSuccess={() => {
                        // Trigger refresh
                        fetchData();
                    }} />

                    {/* Main Content Area */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {/* Load Data Table (Replacing Card Feed) */}
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden p-4 flex flex-col">
                                {/* Toolbar - Always visible */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-muted-foreground mr-2">Showing {sortedLoads.length} loads</div>
                                        <div className="h-4 w-px bg-white/10 mx-2" />
                                        <Button
                                            size="sm"
                                            variant={bookingTypeFilter === 'all' ? "secondary" : "ghost"}
                                            onClick={() => setBookingTypeFilter('all')}
                                            className="h-7 text-xs"
                                        >
                                            All
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={bookingTypeFilter === 'hot' ? "secondary" : "ghost"}
                                            onClick={() => setBookingTypeFilter('hot')}
                                            className="h-7 text-xs text-orange-400"
                                        >
                                            Hot
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={bookingTypeFilter === 'standard' ? "secondary" : "ghost"}
                                            onClick={() => setBookingTypeFilter('standard')}
                                            className="h-7 text-xs"
                                        >
                                            Standard
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={bookingTypeFilter === 'instant' ? "secondary" : "ghost"}
                                            onClick={() => setBookingTypeFilter('instant')}
                                            className="h-7 text-xs text-yellow-400"
                                        >
                                            Instant
                                        </Button>
                                        <div className="h-4 w-px bg-white/10 mx-2" />
                                        <Button
                                            size="sm"
                                            variant={hideZeroRateLoads ? "secondary" : "ghost"}
                                            onClick={() => setHideZeroRateLoads(!hideZeroRateLoads)}
                                            className="h-7 text-xs"
                                        >
                                            Hide $0
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={handleScan} disabled={scanning} className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                            <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
                                            {scanning ? 'Scanning...' : 'Scan Market'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Content Area */}
                                {sortedLoads.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                        <Truck size={48} className="mb-4 opacity-20" />
                                        <p>No loads found matching your criteria.</p>
                                        <Button variant="link" onClick={handleCreateCriteria}>Create a new search</Button>
                                    </div>
                                ) : (
                                    /* DATA GRID */
                                    <div className="flex-1 overflow-hidden rounded-md border border-white/10">
                                    <LoadDataTable
                                        data={sortedLoads.map(l => ({
                                            ...l.details,
                                            id: l.id,
                                            status: l.status,
                                            // Map API fields to Table expectations
                                            rate: l.details.trip_rate || l.details.rate,
                                            distance: l.details.trip_distance_mi || l.details.distance,
                                            pickup_date: l.details.origin_pickup_date || l.details.pickup_date,
                                            delivery_date: l.details.dest_delivery_date || l.details.delivery_date,
                                            weight: l.details.truck_weight_lb || l.details.weight,
                                            equipment: l.details.equipment
                                        }))}
                                        onRowClick={(row) => setSelectedLoadId(row.id)}
                                        selectedId={selectedLoadId}
                                        onSaveSelected={(rows) => {
                                            rows.forEach(row => {
                                                const wrapper = loads.find(l => l.id === row.id)
                                                if (wrapper && !savedLoadIds.has(wrapper.details.id)) {
                                                    handleToggleSaved(wrapper)
                                                }
                                            })
                                        }}
                                        onCompareSelected={(rows) => {
                                            if (rows.length >= 2) {
                                                setSelectedLoadId(rows[0].id)
                                            }
                                        }}
                                        onAddToRoute={(rows) => {
                                            rows.forEach(row => {
                                                const wrapper = loads.find(l => l.id === row.id)
                                                if (wrapper) {
                                                    routeBuilder.addLoad({
                                                        id: wrapper.id,
                                                        cloudtrucks_load_id: wrapper.cloudtrucks_load_id || wrapper.details.id,
                                                        details: wrapper.details,
                                                        created_at: wrapper.created_at,
                                                    })
                                                }
                                            })
                                            routeBuilder.setIsOpen(true)
                                        }}
                                    />
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                </ProMain>

                {/* DETAIL PANEL SLIDE-OVER */}
                <div
                    className={cn(
                        "absolute top-0 right-0 bottom-0 w-[400px] bg-background/80 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-300 z-50",
                        selectedLoadId ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    {selectedLoad && selectedLoadWrapper ? (
                        <LoadDetailView
                            load={selectedLoad}
                            onClose={() => setSelectedLoadId(null)}
                            isSaved={savedLoadIds.has(selectedLoad.id)}
                            onToggleSaved={() => handleToggleSaved(selectedLoadWrapper)}
                            fuelMpg={fuelMpg}
                            fuelPrice={fuelPrice}
                        />
                    ) : null}
                </div>
            </ProLayout>

            {/* Modals & Overlays */}
            {
                editingCriteria && (
                    <EditCriteriaDialog
                        open={!!editingCriteria}
                        onOpenChange={(open) => !open && setEditingCriteria(null)}
                        criteria={editingCriteria}
                        onSuccess={() => {
                            setEditingCriteria(null);
                            fetchData();
                        }}
                    />
                )
            }

            <FuelSettingsDialog
                open={showFuelSettings}
                onOpenChange={setShowFuelSettings}
                currentMpg={fuelMpg}
                currentFuelPrice={fuelPrice}
                onSave={handleSaveFuelSettings}
            />
        </div >
    )
}
