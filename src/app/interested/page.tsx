'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { MapPin, DollarSign, Weight, Calendar, Truck, Trash2, ArrowLeft, ArrowLeftRight, RefreshCw, Navigation, Users, User, Map, Loader2, ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { BrokerLogo } from "@/components/broker-logo"
import { WeatherBadge } from "@/components/weather-badge"
import { extractLoadAddresses, openInMaps } from "@/lib/address-utils"
import { MapboxIntelligenceModal } from "@/components/mapbox-intelligence-modal"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { MultiStateSelect } from "@/components/multi-state-select"
// Reuse types if possible, or redefine for speed given simple page
interface Load {
    id: string; // Internal interest ID
    created_at: string;
    cloudtrucks_load_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any;
}

interface BackhaulDraft {
    load_id: string;
    origin_city: string;
    origin_state: string;
    dest_city: string;
    destination_states: string[];
    equipment_type: string;
    pickup_distance: number;
    booking_type: string;
    min_rate?: number | null;
    min_rpm?: number | null;
    max_weight?: number | null;
    pickup_date?: string | null;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{children}</label>
);

const inputStyles = "bg-slate-900/50 border-slate-600 h-10 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm rounded-md placeholder:text-slate-600";

export default function InterestedPage() {
    const [loads, setLoads] = useState<Load[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [backhaulingId, setBackhaulingId] = useState<string | null>(null)
    const [selectedLoadForMap, setSelectedLoadForMap] = useState<Load | null>(null)
    const [backhaulDialogOpen, setBackhaulDialogOpen] = useState(false)
    const [backhaulDraft, setBackhaulDraft] = useState<BackhaulDraft | null>(null)
    const [originState, setOriginState] = useState('')
    const [destStates, setDestStates] = useState<string[]>([])

    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')

    useEffect(() => {
        fetchInterested()

        // Auto-refresh every 5 minutes to get updated load data from scans
        const interval = setInterval(() => {
            fetchInterested()
        }, 5 * 60 * 1000) // 5 minutes

        return () => clearInterval(interval)
    }, [viewMode])

    useEffect(() => {
        if (!backhaulDraft) return;
        setOriginState(backhaulDraft.origin_state || '')
        setDestStates(backhaulDraft.destination_states || [])
    }, [backhaulDraft])

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

    const openBackhaulDialog = (load: Load) => {
        const equip = Array.isArray(load.details.equipment) ? load.details.equipment[0] : load.details.equipment;
        const maxWeight = load.details.weight || load.details.truck_weight_lb || 45000;
        const pickupDate = load.details.pickup_date || load.details.origin_pickup_date || null;

        setBackhaulDraft({
            load_id: load.id,
            origin_city: load.details.dest_city || '',
            origin_state: load.details.dest_state || '',
            dest_city: load.details.origin_city || '',
            destination_states: load.details.origin_state ? [load.details.origin_state] : [],
            equipment_type: equip || 'Any',
            pickup_distance: 50,
            booking_type: 'Any',
            min_rate: null,
            min_rpm: null,
            max_weight: maxWeight,
            pickup_date: pickupDate,
        })
        setBackhaulDialogOpen(true)
    }

    const handleBackhaulSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!backhaulDraft || backhaulingId) return

        setBackhaulingId(backhaulDraft.load_id)
        try {
            const formData = new FormData(event.currentTarget)
            formData.set('origin_state', originState)
            formData.set('destination_states', destStates.join(','))
            formData.append('is_backhaul', 'true')

            const res = await fetch('/api/criteria', {
                method: 'POST',
                body: formData
            })

            const result = await res.json()
            if (res.ok) {
                console.log('Backhaul criteria created:', result)
                toast.success('Backhaul created. Scan started.')
                setBackhaulDialogOpen(false)
                setBackhaulDraft(null)
                fetch('/api/scan', { method: 'POST' }).catch(() => {
                    // Non-fatal; user can still click "Scan Now".
                })
                window.location.href = '/dashboard'
            } else {
                console.error('Failed to create backhaul:', result.error)
                toast.error(result.error || 'Failed to create backhaul')
            }
        } catch (error) {
            console.error('Backhaul error:', error)
            toast.error('Failed to create backhaul')
        } finally {
            setBackhaulingId(null)
        }
    }

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
                        {viewMode === 'trash' ? 'Trash Bin' : 'Saved Loads'}
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
                <div className="flex items-center justify-between bg-card/40 backdrop-blur-md p-3 rounded-xl border border-slate-800/60 glass-panel">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 ml-2"
                            checked={selectedIds.size === loads.length && loads.length > 0}
                            onChange={toggleSelectAll}
                        />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Selection</span>
                        <span className="text-xs font-semibold bg-slate-800/70 text-slate-200 px-2 py-1 rounded-full">
                            {selectedIds.size}/{loads.length}
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
                <div className="grid gap-3">
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
                                    "overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-md hover:scale-[1.005] pl-7 bg-card/50 backdrop-blur-sm",
                                    isSelected && "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500"
                                )}>
                                    <div className="flex flex-col md:flex-row">
                                        <div className="flex-1 p-4 space-y-2">
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
                                                    <span className="text-[11px] text-muted-foreground font-mono">
                                                        {new Date(load.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 text-[15px] font-semibold">
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
                                                            <span className="text-[11px] font-normal text-muted-foreground truncate max-w-[240px]">
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
                                                <div className="md:text-right">
                                                    <div className="flex items-center md:justify-end gap-2 text-[15px] font-semibold">
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
                                                                <div className="flex items-center justify-start md:justify-end gap-1 mt-1">
                                                                    <span className="text-[11px] font-normal text-muted-foreground truncate max-w-[240px] md:text-right">
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

                                            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground pt-1">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2 py-0.5">
                                                    {dist ? `${dist.toFixed(0)} mi loaded` : '---'}
                                                </span>
                                                {isTeam ? (
                                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] gap-1 px-1.5">
                                                        <Users className="h-3 w-3" /> Team
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px] gap-1 px-1.5">
                                                        <User className="h-3 w-3" /> Solo
                                                    </Badge>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Truck className="h-4 w-4" />
                                                    {Array.isArray(load.details.equipment) ? load.details.equipment.join(', ') : load.details.equipment}
                                                </span>
                                                {(load.details.weight || load.details.truck_weight_lb) && (
                                                    <span className="flex items-center gap-1">
                                                        <Weight className="h-4 w-4" />
                                                        {load.details.weight || load.details.truck_weight_lb} lbs
                                                    </span>
                                                )}
                                                {rpm && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-400 px-2 py-0.5 font-mono text-[11px]">
                                                        ${rpm}/mi
                                                    </span>
                                                )}
                                                {load.details.total_deadhead_mi && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {load.details.total_deadhead_mi} mi deadhead
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
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
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center justify-center p-3 bg-muted/30 border-t md:border-t-0 md:border-l min-w-[160px]">
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-green-600 flex items-center justify-center">
                                                    <span className="text-lg mr-0.5">$</span>
                                                    {rate?.toFixed(0) || '---'}
                                                </div>
                                                {rpm && (
                                                    <Badge variant="secondary" className="mt-1 font-mono text-xs">
                                                        ${rpm}/mi
                                                    </Badge>
                                                )}
                                                {load.details.total_deadhead_mi && (
                                                    <div className="text-[11px] text-muted-foreground mt-1">
                                                        {load.details.total_deadhead_mi} mi deadhead
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 font-semibold"
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

                                            <div className="flex flex-col gap-2 w-full mt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedLoadForMap(load)}
                                                    className="w-full justify-between"
                                                    title="View Route Intelligence"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <Map className="h-4 w-4" />
                                                        Route
                                                    </span>
                                                    <Navigation className="h-3.5 w-3.5 opacity-60" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openBackhaulDialog(load)}
                                                    disabled={backhaulingId === load.id}
                                                    className="w-full justify-between border-indigo-500/40 text-indigo-200 hover:text-white hover:bg-indigo-600/20"
                                                    title="Search Return Trip (Swap Origin/Dest)"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        {backhaulingId === load.id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ArrowLeftRight className="h-4 w-4" />
                                                        )}
                                                        Backhaul
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-widest opacity-70">New</span>
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

            {backhaulDraft && (
                <Dialog
                    open={backhaulDialogOpen}
                    onOpenChange={(open) => {
                        setBackhaulDialogOpen(open)
                        if (!open) setBackhaulDraft(null)
                    }}
                >
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-200">
                        <DialogHeader>
                            <DialogTitle>Create Backhaul Search</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleBackhaulSubmit} className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex-1">
                                    <FieldLabel>Pickup (City & State)</FieldLabel>
                                    <div className="flex gap-2">
                                        <CityAutocomplete
                                            name="origin_city"
                                            defaultValue={backhaulDraft.origin_city}
                                            required
                                            onStateChange={(st) => setOriginState(st)}
                                            className="flex-[2]"
                                        />
                                        <div className="flex-1 w-[60px]">
                                            <Input
                                                name="origin_state"
                                                value={originState}
                                                onChange={(e) => setOriginState(e.target.value.toUpperCase().slice(0, 2))}
                                                placeholder="ST"
                                                maxLength={2}
                                                required
                                                className={cn(inputStyles, "text-center font-bold uppercase")}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <FieldLabel>Dropoff</FieldLabel>
                                    <div className="flex gap-2">
                                        <CityAutocomplete
                                            name="dest_city"
                                            placeholder="Any City"
                                            defaultValue={backhaulDraft.dest_city || ''}
                                            onStateChange={(st) => {
                                                if (st && !destStates.includes(st)) {
                                                    setDestStates([st])
                                                }
                                            }}
                                            className="flex-[1.5]"
                                        />
                                        <MultiStateSelect
                                            name="destination_states"
                                            placeholder="States"
                                            className={cn(inputStyles, "flex-1 min-w-[100px] px-3")}
                                            value={destStates}
                                            onChange={setDestStates}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <FieldLabel>Radius</FieldLabel>
                                    <div className="relative">
                                        <select
                                            name="pickup_distance"
                                            defaultValue={backhaulDraft.pickup_distance || 50}
                                            className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                        >
                                            <option value="50">50 mi</option>
                                            <option value="100">100 mi</option>
                                            <option value="150">150 mi</option>
                                            <option value="200">200 mi</option>
                                            <option value="300">300 mi</option>
                                            <option value="400">400 mi</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Date</FieldLabel>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            name="pickup_date"
                                            defaultValue={backhaulDraft.pickup_date ? new Date(backhaulDraft.pickup_date).toISOString().split('T')[0] : ''}
                                            className={cn(inputStyles, "pl-10 appearance-none")}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Trailer Type</FieldLabel>
                                    <div className="relative">
                                        <select
                                            name="equipment_type"
                                            defaultValue={backhaulDraft.equipment_type || 'Any'}
                                            className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                        >
                                            <option value="Any">Any Equipment</option>
                                            <option value="Dry Van">Dry Van</option>
                                            <option value="Power Only">Power Only</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <FieldLabel>Min Rate ($)</FieldLabel>
                                    <Input
                                        name="min_rate"
                                        type="number"
                                        step="0.01"
                                        placeholder="Any"
                                        defaultValue={backhaulDraft.min_rate || ''}
                                        className={inputStyles}
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Min RPM ($/mi)</FieldLabel>
                                    <Input
                                        name="min_rpm"
                                        type="number"
                                        step="0.01"
                                        placeholder="Any"
                                        defaultValue={backhaulDraft.min_rpm || ''}
                                        className={inputStyles}
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Max Weight (lbs)</FieldLabel>
                                    <Input
                                        name="max_weight"
                                        type="number"
                                        placeholder="45000"
                                        defaultValue={backhaulDraft.max_weight || 45000}
                                        className={inputStyles}
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Booking Type</FieldLabel>
                                    <div className="relative">
                                        <select
                                            name="booking_type"
                                            defaultValue={backhaulDraft.booking_type || 'Any'}
                                            className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                        >
                                            <option value="Any">Any Method</option>
                                            <option value="instant">Instant Book</option>
                                            <option value="standard">Standard Book</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setBackhaulDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!!backhaulingId} className="bg-blue-600 hover:bg-blue-500">
                                    {backhaulingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create Backhaul
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
