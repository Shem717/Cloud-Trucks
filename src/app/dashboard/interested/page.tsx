'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Trash2, RefreshCw, Calendar, Truck, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InterestedLoad {
    id: string;
    cloudtrucks_load_id: string;
    status: 'interested' | 'available' | 'expired' | 'unknown';
    last_checked_at: string | null;
    created_at: string;
    details: {
        origin_city?: string;
        origin_state?: string;
        dest_city?: string;
        dest_state?: string;
        trip_rate?: string | number;
        trip_distance_mi?: number;
        equipment?: string[];
        origin_pickup_date?: string;
        total_deadhead_mi?: number;
        [key: string]: any;
    };
}

export default function InterestedLoadsPage() {
    const [loads, setLoads] = useState<InterestedLoad[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchInterestedLoads();
    }, []);

    const fetchInterestedLoads = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/interested');
            const result = await res.json();
            if (result.loads) {
                setLoads(result.loads);
            }
        } catch (error) {
            console.error('Failed to fetch interested loads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckAvailability = async () => {
        if (checking) return;
        setChecking(true);
        try {
            const res = await fetch('/api/interested/check', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                console.log('Availability check complete:', result.results);
                // Refresh to get updated statuses
                await fetchInterestedLoads();
            } else {
                console.error('Check failed:', result.error);
            }
        } catch (error) {
            console.error('Check availability error:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (deleting) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/interested?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setLoads(prev => prev.filter(l => l.id !== id));
            }
        } catch (error) {
            console.error('Failed to remove load:', error);
        } finally {
            setDeleting(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'expired': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'interested': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Star className="h-8 w-8 text-yellow-500" />
                        Interested Loads
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Loads you've marked for tracking • {loads.length} total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleCheckAvailability}
                        disabled={checking || loads.length === 0}
                        className="gap-2"
                    >
                        {checking ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {checking ? 'Checking...' : 'Check Availability'}
                    </Button>
                    <Button variant="secondary" disabled className="gap-2">
                        <Clock className="h-4 w-4" />
                        Run Dispatch Plan
                    </Button>
                </div>
            </div>

            {/* Load List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : loads.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Star className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg">No interested loads yet</p>
                        <p className="text-sm mt-1">Mark loads as "Interested" from the dashboard to track them here.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {loads.map((load) => {
                        const rate = typeof load.details.trip_rate === 'string'
                            ? parseFloat(load.details.trip_rate)
                            : load.details.trip_rate || 0;
                        const distance = load.details.trip_distance_mi || 0;
                        const rpm = rate && distance ? (rate / distance).toFixed(2) : null;

                        return (
                            <Card key={load.id} className="group overflow-hidden transition-all hover:shadow-md">
                                <div className="flex flex-col md:flex-row">
                                    {/* Left: Route Info */}
                                    <div className="flex-1 p-5 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-2">
                                                <Badge className={cn("border", getStatusColor(load.status))}>
                                                    {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
                                                </Badge>
                                                {load.last_checked_at && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Checked {new Date(load.last_checked_at).toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                Added {new Date(load.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-lg font-semibold">
                                                    <MapPin className="h-4 w-4 text-green-500" />
                                                    {load.details.origin_city}, {load.details.origin_state}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center px-4">
                                                <span className="text-xs text-muted-foreground">
                                                    {distance ? `${distance.toFixed(0)} mi` : '---'}
                                                </span>
                                                <div className="w-20 h-[1px] bg-border my-1" />
                                            </div>
                                            <div className="flex-1 text-right">
                                                <div className="text-lg font-semibold">
                                                    {load.details.dest_city}, {load.details.dest_state}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                            {load.details.origin_pickup_date && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(load.details.origin_pickup_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                            )}
                                            {load.details.equipment && (
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="h-4 w-4" />
                                                    {Array.isArray(load.details.equipment) ? load.details.equipment.join(', ') : load.details.equipment}
                                                </div>
                                            )}
                                            {load.details.total_deadhead_mi && (
                                                <span>{load.details.total_deadhead_mi} mi deadhead</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Rate & Actions */}
                                    <div className="flex md:flex-col items-center justify-center p-5 bg-muted/30 border-t md:border-t-0 md:border-l min-w-[160px] gap-4">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-green-600">
                                                ${rate?.toFixed(0) || '---'}
                                            </div>
                                            {rpm && (
                                                <Badge variant="secondary" className="mt-1 font-mono text-xs">
                                                    ${rpm}/mi
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(load.id)}
                                            disabled={deleting === load.id}
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 className={cn("h-4 w-4", deleting === load.id && "animate-pulse")} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
