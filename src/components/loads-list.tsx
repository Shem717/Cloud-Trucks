'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, DollarSign, Weight, Calendar, Truck } from 'lucide-react'

interface Load {
    id: string;
    cloudtrucks_load_id: string;
    status: string;
    created_at: string;
    details: {
        id?: string;
        origin?: string;
        destination?: string;
        rate?: number;
        distance?: number;
        weight?: number;
        equipment?: string;
        pickup_date?: string;
        delivery_date?: string;
        [key: string]: any;
    };
}

export function LoadsList() {
    const [loads, setLoads] = useState<Load[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLoads()
        // Refresh every 30 seconds
        const interval = setInterval(fetchLoads, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchLoads = async () => {
        try {
            const response = await fetch('/api/loads')
            const result = await response.json()
            if (result.data) {
                setLoads(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch loads:', error)
        } finally {
            setLoading(false)
        }
    }

    const statusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
        switch (status) {
            case 'found': return 'default'
            case 'notified': return 'secondary'
            case 'booked': return 'default' // Will use custom styling
            case 'expired': return 'destructive'
            default: return 'secondary'
        }
    }

    const statusClassName = (status: string) => {
        return status === 'booked' ? 'bg-green-500 text-white' : ''
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Loading loads...</p>
                </CardContent>
            </Card>
        )
    }

    if (loads.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Found Loads</CardTitle>
                    <CardDescription>Automatically discovered loads matching your criteria</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-md bg-muted/50">
                        <Truck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No loads found yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            The scanner runs every 15 minutes. Add search criteria to begin.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Found Loads ({loads.length})</CardTitle>
                        <CardDescription>Automatically discovered loads matching your criteria</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        Auto-refreshing
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Route</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Found</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loads.map((load) => (
                            <TableRow key={load.id}>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">
                                                {load.details.origin || `${load.details.origin_city}, ${load.details.origin_state}` || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span>
                                                {load.details.destination || `${load.details.dest_city}, ${load.details.dest_state}` || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {(load.details.rate || load.details.trip_rate) ? (
                                        <div className="flex items-center gap-1 font-semibold text-green-600">
                                            <DollarSign className="h-4 w-4" />
                                            {Number(load.details.rate || load.details.trip_rate).toFixed(2)}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    <div className="space-y-1">
                                        {(load.details.distance || load.details.trip_distance_mi) && (
                                            <div>{load.details.distance || load.details.trip_distance_mi} mi</div>
                                        )}
                                        {(load.details.weight || load.details.truck_weight_lb) && (
                                            <div className="flex items-center gap-1">
                                                <Weight className="h-3 w-3" />
                                                {(load.details.weight || load.details.truck_weight_lb) as React.ReactNode} lbs
                                            </div>
                                        )}
                                        {load.details.equipment && (
                                            <div className="flex items-center gap-1">
                                                <Truck className="h-3 w-3" />
                                                {Array.isArray(load.details.equipment)
                                                    ? load.details.equipment.join(', ')
                                                    : load.details.equipment}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusColor(load.status)} className={statusClassName(load.status)}>
                                        {load.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {new Date(load.created_at).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
