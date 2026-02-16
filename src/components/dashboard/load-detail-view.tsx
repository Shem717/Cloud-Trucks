"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    FinancialsModule,
    LogisticsModule,
    TrustModule,
    AddressModule
} from "@/components/load-card-modules"
import { CloudTrucksLoad } from "@/workers/cloudtrucks-api-client"
import { X, Map, Star, Share2, Phone, Mail, ExternalLink } from "lucide-react"

interface LoadDetailViewProps {
    load: CloudTrucksLoad & Record<string, any>
    onClose: () => void
    onToggleSaved?: () => void
    isSaved?: boolean
    fuelMpg?: number
    fuelPrice?: number
}

export function LoadDetailView({ load, onClose, onToggleSaved, isSaved, fuelMpg = 6.5, fuelPrice = 3.80 }: LoadDetailViewProps) {
    if (!load) return null

    // Derived Data
    const rate = load.rate || load.trip_rate
    const dist = load.distance || load.trip_distance_mi
    const weight = load.weight || load.truck_weight_lb
    const rpm = (rate && dist) ? (rate / dist) : 0

    // Calculate real fuel cost
    const numericDist = typeof dist === 'string' ? parseFloat(dist) : (dist || 0)
    const fuelCost = fuelMpg > 0 ? Math.round((numericDist / fuelMpg) * fuelPrice) : 0

    // Equipment
    const equipment = Array.isArray(load.equipment) ? load.equipment[0] : load.equipment

    // Google Maps embed URL
    const originStr = `${load.origin_city}, ${load.origin_state}`
    const destStr = `${load.dest_city}, ${load.dest_state}`
    const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
    const mapsEmbedUrl = mapsApiKey
        ? `https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&mode=driving`
        : ''
    const mapsExternalUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`

    return (
        <div className="h-full flex flex-col bg-card/40 backdrop-blur-xl border-l border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-start bg-transparent">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-foreground">Load Details</h2>
                        <Badge variant="outline" className="text-xs">{load.id.slice(0, 8)}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono text-emerald-500 font-bold">${typeof rate === 'number' ? rate.toLocaleString() : rate}</span>
                        <span>•</span>
                        <span>${rpm.toFixed(2)}/mi</span>
                        <span>•</span>
                        <span>{dist}mi</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onToggleSaved} className={isSaved ? "text-yellow-500" : "text-muted-foreground"}>
                        <Star className={isSaved ? "fill-current" : ""} size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={18} />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-2">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="map">Map</TabsTrigger>
                        <TabsTrigger value="financials">Financials</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="details" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            <AddressModule
                                originAddress={load.origin_address}
                                destAddress={load.dest_address}
                                originCity={load.origin_city}
                                originState={load.origin_state}
                                destCity={load.dest_city}
                                destState={load.dest_state}
                                stops={load.stops}
                            />

                            <Separator />

                            <LogisticsModule
                                originDeadhead={load.origin_deadhead_mi}
                                destDeadhead={load.dest_deadhead_mi}
                                truckLength={load.truck_length_ft}
                                weight={weight}
                                warnings={load.trailer_drop_warnings}
                                isTeam={load.is_team_load}
                                hasAutoBid={load.has_auto_bid}
                                equipment={equipment}
                            />

                            <Separator />

                            <TrustModule
                                brokerName={load.broker_name}
                                mcNumber={load.broker_mc_number}
                                phone={load.contact_phone}
                                email={load.contact_email}
                            />
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="map" className="flex-1 mt-0 h-full relative p-4 flex flex-col gap-3">
                    {/* Inline Google Maps Embed */}
                    <div className="flex-1 rounded-lg overflow-hidden border border-white/10 min-h-[300px]">
                        {mapsApiKey ? (
                            <iframe
                                className="w-full h-full border-0"
                                src={mapsEmbedUrl}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title={`Route from ${originStr} to ${destStr}`}
                            />
                        ) : (
                            <div className="h-full w-full bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
                                Map unavailable — no API key configured
                            </div>
                        )}
                    </div>

                    {/* External Google Maps button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 w-full"
                        asChild
                    >
                        <a
                            href={mapsExternalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink size={14} />
                            Route via Google Maps
                        </a>
                    </Button>
                </TabsContent>

                <TabsContent value="financials" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            <FinancialsModule
                                fuelCost={fuelCost}
                                tollCost={load.estimated_toll_cost}
                                revenuePerHour={load.estimated_revenue_per_hour}
                                tripRate={typeof rate === 'string' ? parseFloat(rate) : rate}
                            />
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <h4 className="text-sm font-medium text-emerald-400 mb-2">Profitability Analysis</h4>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div className="flex justify-between">
                                        <span>Fuel Settings</span>
                                        <span className="text-white/70">{fuelMpg} MPG @ ${fuelPrice.toFixed(2)}/gal</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Trip Distance</span>
                                        <span className="text-white/70">{numericDist} mi</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Est. Gallons Used</span>
                                        <span className="text-white/70">{fuelMpg > 0 ? (numericDist / fuelMpg).toFixed(1) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-white/10">
                                        <span className="font-medium">Profit Margin</span>
                                        <span className={`font-bold ${(rate - fuelCost) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {rate ? `${(((rate - fuelCost) / rate) * 100).toFixed(0)}%` : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    )
}
