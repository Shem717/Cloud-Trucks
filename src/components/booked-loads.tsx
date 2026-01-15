'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, DollarSign, Truck, Clock, Loader2, RefreshCw } from 'lucide-react'

interface BookedLoad {
    id: string;
    origin: string;
    destination: string;
    pickup_date: string;
    rate: number;
    equipment: string;
    status: string;
    broker: string;
}

export function BookedLoads() {
    const [loads, setLoads] = useState<BookedLoad[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    const fetchBookedLoads = async () => {
        try {
            const response = await fetch('/api/bookings')
            const result = await response.json()
            if (result.data) {
                setLoads(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch booked loads:', error)
        } finally {
            setLoading(false)
        }
    }

    const syncBookedLoads = async () => {
        setSyncing(true)
        try {
            const response = await fetch('/api/bookings/sync', { method: 'POST' })
            const result = await response.json()
            if (result.success) {
                // Refresh the list after sync
                await fetchBookedLoads()
            }
        } catch (error) {
            console.error('Failed to sync booked loads:', error)
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchBookedLoads()
    }, [])

    if (loading) {
        return (
            <Card className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-700/30">
                <CardContent className="pt-6 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                    <span className="ml-2 text-amber-200">Loading bookings...</span>
                </CardContent>
            </Card>
        )
    }

    if (loads.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="h-5 w-5 text-amber-400" />
                            Current Bookings
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={syncBookedLoads}
                            disabled={syncing}
                            className="text-amber-400 hover:text-amber-300"
                        >
                            {syncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-400 text-sm mb-3">No active bookings found.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={syncBookedLoads}
                        disabled={syncing}
                        className="w-full text-amber-400 border-amber-600/50 hover:bg-amber-900/20"
                    >
                        {syncing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Syncing from CloudTrucks...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sync from CloudTrucks
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-700/30">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-100">
                    <Calendar className="h-5 w-5 text-amber-400" />
                    Current Bookings ({loads.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {loads.map((load) => (
                    <div
                        key={load.id}
                        className="p-4 rounded-lg bg-slate-900/50 border border-amber-700/20 hover:border-amber-600/40 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                    {load.status}
                                </Badge>
                                {load.equipment && (
                                    <Badge variant="outline" className="text-slate-400 border-slate-600">
                                        <Truck className="h-3 w-3 mr-1" />
                                        {load.equipment}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-amber-400 font-semibold">
                                ${load.rate?.toLocaleString()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                                <MapPin className="h-4 w-4 text-green-400" />
                                <span>{load.origin}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <MapPin className="h-4 w-4 text-red-400" />
                                <span>{load.destination}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(load.pickup_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-xs">Broker: {load.broker}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
