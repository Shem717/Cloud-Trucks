'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, MapPin, DollarSign, Scale, Truck } from 'lucide-react'

interface Criteria {
    id: string;
    origin_city: string | null;
    dest_city: string | null;
    min_rate: number | null;
    min_weight: number | null;
    max_weight: number | null;
    equipment_type: string | null;
    active: boolean;
    created_at: string;
}

export function CriteriaList({ refreshTrigger }: { refreshTrigger?: number }) {
    const [criteria, setCriteria] = useState<Criteria[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCriteria = async () => {
        try {
            const response = await fetch('/api/criteria')
            const result = await response.json()
            if (result.data) {
                setCriteria(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch criteria:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCriteria()
    }, [refreshTrigger])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this search criteria?')) return

        try {
            await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' })
            setCriteria(criteria.filter(c => c.id !== id))
        } catch (error) {
            console.error('Failed to delete:', error)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Loading criteria...</p>
                </CardContent>
            </Card>
        )
    }

    if (criteria.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Active Searches</CardTitle>
                    <CardDescription>Your automated load search criteria</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">No search criteria yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Add criteria above to start automated scanning
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Searches ({criteria.length})</CardTitle>
                <CardDescription>Your automated load search criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {criteria.map((c) => (
                    <div
                        key={c.id}
                        className="p-4 border rounded-lg hover:shadow-sm transition-shadow bg-card"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                {c.active ? (
                                    <Badge variant="default" className="bg-green-500">Active</Badge>
                                ) : (
                                    <Badge variant="secondary">Paused</Badge>
                                )}
                                {c.equipment_type && (
                                    <Badge variant="outline">
                                        <Truck className="h-3 w-3 mr-1" />
                                        {c.equipment_type}
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(c.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {c.origin_city && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>From: {c.origin_city}</span>
                                </div>
                            )}
                            {c.dest_city && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>To: {c.dest_city}</span>
                                </div>
                            )}
                            {c.min_rate && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <DollarSign className="h-4 w-4" />
                                    <span>Min Rate: ${c.min_rate.toFixed(2)}</span>
                                </div>
                            )}
                            {(c.min_weight || c.max_weight) && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Scale className="h-4 w-4" />
                                    <span>
                                        Weight: {c.min_weight || 0} - {c.max_weight || '∞'} lbs
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
