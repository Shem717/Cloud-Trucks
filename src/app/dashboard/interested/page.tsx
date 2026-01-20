'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Weight, Calendar, Truck, Trash2, ArrowLeft, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { cn } from "@/lib/utils"
import { BrokerLogo } from "@/components/broker-logo"
// Reuse types if possible, or redefine for speed given simple page
interface Load {
    id: string; // Internal interest ID
    created_at: string;
    cloudtrucks_load_id: string;
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
                <div className="grid gap-4">
                    {loads.map(load => {
                        const origin = load.details.origin_city
                            ? `${load.details.origin_city}, ${load.details.origin_state}`
                            : load.details.origin;
                        const dest = load.details.dest_city
                            ? `${load.details.dest_city}, ${load.details.dest_state}`
                            : load.details.destination;

                        const rawRate = load.details.rate || load.details.trip_rate;
                        const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;

                        const broker = load.details.broker_name;
                        const isSelected = selectedIds.has(load.id);

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
                                    "overflow-hidden hover:border-blue-400/50 transition-all pl-8",
                                    isSelected && "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500"
                                )}>
                                    <div className="flex flex-col md:flex-row">
                                        <div className="flex-1 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-yellow-500/10 text-yellow-600 border-0">
                                                        Saved
                                                    </Badge>
                                                    {broker && (
                                                        <div className="flex items-center gap-2">
                                                            <BrokerLogo name={broker} size="sm" />
                                                            <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                                                                {broker}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    Saved: {new Date(load.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="text-lg font-semibold">{origin}</div>
                                                    {load.details.origin_address && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {load.details.origin_address}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-center px-2">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                        {load.details.distance ? `${load.details.distance} mi Loaded` : '---'}
                                                    </span>
                                                    <div className="text-muted-foreground">→</div>
                                                </div>
                                                <div className="flex-1 text-right">
                                                    <div className="text-lg font-semibold">{dest}</div>
                                                    {load.details.dest_address && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-[200px] text-right">
                                                            {load.details.dest_address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {load.details.pickup_date ? new Date(load.details.pickup_date).toLocaleDateString() : 'Date N/A'}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="h-4 w-4" />
                                                    {Array.isArray(load.details.equipment) ? load.details.equipment.join(', ') : load.details.equipment}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center p-5 bg-muted/30 min-w-[150px] border-l space-y-3">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    ${rate?.toFixed(0) || '---'}
                                                </div>
                                                {rate && load.details.distance && (
                                                    <Badge variant="secondary" className="mt-1 font-mono text-mono text-xs">
                                                        ${(rate / load.details.distance).toFixed(2)}/mi
                                                    </Badge>
                                                )}
                                                {load.details.total_deadhead_mi && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {load.details.total_deadhead_mi} mi deadhead
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full">
                                                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" asChild>
                                                    <a href={`https://app.cloudtrucks.com/loads/${load.cloudtrucks_load_id}/book`} target="_blank">
                                                        Book
                                                    </a>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-3"
                                                    onClick={() => handleBackhaul(load)}
                                                    disabled={backhaulingId === load.id}
                                                    title="Create Return Trip Search"
                                                >
                                                    {backhaulingId === load.id ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ArrowLeftRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                {viewMode === 'trash' ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="px-3 hover:bg-green-100 hover:text-green-600"
                                                        onClick={() => handleRestore(load.id)}
                                                        title="Restore"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="px-3 hover:bg-red-100 hover:text-red-600"
                                                        onClick={() => handleSoftDelete(load.id)}
                                                        disabled={deletingId === load.id}
                                                        title="Move to Trash"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
        </div>
    )
}


