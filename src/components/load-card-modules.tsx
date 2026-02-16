"use client"

import { Button } from "@/components/ui/button"
import {
    DollarSign,
    MapPin,
    Truck,
    AlertTriangle,
    Star,
    Phone,
    Mail,
    Timer,
    BookOpen,
    Navigation,
} from "lucide-react"
import { extractLoadAddresses, openInMaps } from "@/lib/address-utils"

// --- Financials ---
export function FinancialsModule({ fuelCost, tollCost, revenuePerHour, tripRate }: any) {
    const netProfit = tripRate - fuelCost - (tollCost || 0);
    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Financials
            </h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Gross Rate</div>
                    <div className="text-xl font-bold text-emerald-400">${tripRate?.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit (Est)</div>
                    <div className="text-xl font-bold text-white">${netProfit?.toLocaleString()}</div>
                </div>
            </div>
            {/* Breakdowns */}
            <div className="text-xs text-muted-foreground space-y-1 pl-1">
                <div className="flex justify-between">
                    <span>Est. Fuel Cost</span>
                    <span>-${fuelCost}</span>
                </div>
                {tollCost > 0 && (
                    <div className="flex justify-between">
                        <span>Est. Tolls</span>
                        <span>-${tollCost}</span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                    <span>Rev / Hour</span>
                    <span className="text-white font-mono">${(Number(revenuePerHour) || 0).toFixed(2)}/hr</span>
                </div>
            </div>
        </div>
    )
}

// --- Address ---
export function AddressModule({ originCity, originState, destCity, destState, originAddress, destAddress, stops, details }: any) {
    // Use extractLoadAddresses to dig into stops data for hidden addresses
    const addresses = extractLoadAddresses(details || { stops, origin_address: originAddress, dest_address: destAddress, origin_city: originCity, origin_state: originState, dest_city: destCity, dest_state: destState });
    const { origin, destination } = addresses;

    // Filter intermediate stops (not ORIGIN or DESTINATION)
    const intermediateStops = (stops || []).filter((s: any) => s.type !== 'ORIGIN' && s.type !== 'DESTINATION');

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Route
            </h4>
            <div className="relative border-l-2 border-white/10 ml-2 pl-6 space-y-6 py-2">
                {/* Origin */}
                <div className="relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-background" />
                    <div>
                        <div className="font-bold text-white text-base">{origin.city || originCity}, {origin.state || originState}</div>
                        {origin.hasAddress ? (
                            <div className="space-y-1">
                                <div className="text-xs text-white/80">{origin.address}</div>
                                {origin.zip && <div className="text-[10px] text-muted-foreground">ZIP: {origin.zip}</div>}
                                <button
                                    onClick={(e) => { e.stopPropagation(); openInMaps(origin); }}
                                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors mt-0.5"
                                >
                                    <Navigation className="h-2.5 w-2.5" /> Open in Maps
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">
                                {origin.lat && origin.lon ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openInMaps(origin); }}
                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Navigation className="h-2.5 w-2.5" /> View on Maps (coords available)
                                    </button>
                                ) : 'Address masked by broker'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Intermediate Stops */}
                {intermediateStops.map((stop: any, idx: number) => {
                    const stopCity = stop.location_city || stop.city;
                    const stopState = stop.location_state || stop.state;
                    const stopAddr = stop.location_address1 || stop.address;
                    const stopZip = stop.location_zip || stop.zip;
                    return (
                        <div key={idx} className="relative">
                            <span className="absolute -left-[29px] top-2 h-2 w-2 rounded-full bg-yellow-500" />
                            <div>
                                <div className="text-sm text-white/80">Stop {idx + 1}: {stopCity}, {stopState}</div>
                                {stopAddr && <div className="text-xs text-muted-foreground">{stopAddr}</div>}
                                {stopZip && <div className="text-[10px] text-muted-foreground">ZIP: {stopZip}</div>}
                            </div>
                        </div>
                    );
                })}

                {/* Destination */}
                <div className="relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-rose-500 ring-4 ring-background" />
                    <div>
                        <div className="font-bold text-white text-base">{destination.city || destCity}, {destination.state || destState}</div>
                        {destination.hasAddress ? (
                            <div className="space-y-1">
                                <div className="text-xs text-white/80">{destination.address}</div>
                                {destination.zip && <div className="text-[10px] text-muted-foreground">ZIP: {destination.zip}</div>}
                                <button
                                    onClick={(e) => { e.stopPropagation(); openInMaps(destination); }}
                                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors mt-0.5"
                                >
                                    <Navigation className="h-2.5 w-2.5" /> Open in Maps
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">
                                {destination.lat && destination.lon ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openInMaps(destination); }}
                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Navigation className="h-2.5 w-2.5" /> View on Maps (coords available)
                                    </button>
                                ) : 'Address masked by broker'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Load Details (Extra API Data) ---
export function LoadDetailsModule({ details }: { details: any }) {
    if (!details) return null;

    const ageMin = details.age_min;
    const bookingInstructions = details.booking_instructions;
    const estimatedRateMin = details.estimated_rate_min;
    const estimatedRateMax = details.estimated_rate_max;
    const instantBook = details.instant_book;
    const hasAutoBid = details.has_auto_bid;
    const ctFuelCost = details.estimated_fuel_cost;
    const ctTollCost = details.estimated_toll_cost;
    const ctRevPerHour = details.estimated_revenue_per_hour;

    // Check if there's anything worth showing
    const hasData = ageMin || bookingInstructions || estimatedRateMin || estimatedRateMax || hasAutoBid || ctFuelCost || ctRevPerHour;
    if (!hasData) return null;

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Load Intel
            </h4>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2 text-xs">
                {/* Age / Freshness */}
                {ageMin != null && (
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Timer className="h-3 w-3" /> Posted
                        </span>
                        <span className={`font-medium ${ageMin < 30 ? 'text-emerald-400' : ageMin < 120 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`}
                        </span>
                    </div>
                )}

                {/* Rate Range */}
                {(estimatedRateMin || estimatedRateMax) && (
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="h-3 w-3" /> Rate Range
                        </span>
                        <span className="text-white font-mono">
                            ${estimatedRateMin?.toLocaleString()} – ${estimatedRateMax?.toLocaleString()}
                        </span>
                    </div>
                )}

                {/* CT Estimates */}
                {ctRevPerHour != null && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CT Rev/Hour</span>
                        <span className="text-white font-mono">${Number(ctRevPerHour).toFixed(2)}/hr</span>
                    </div>
                )}
                {ctFuelCost != null && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CT Fuel Est.</span>
                        <span className="text-white font-mono">-${Number(ctFuelCost).toLocaleString()}</span>
                    </div>
                )}
                {ctTollCost != null && ctTollCost > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CT Toll Est.</span>
                        <span className="text-white font-mono">-${Number(ctTollCost).toLocaleString()}</span>
                    </div>
                )}

                {/* Booking Info */}
                {(instantBook || hasAutoBid) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        {instantBook && (
                            <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded text-[10px] font-bold text-amber-400 uppercase tracking-wider">Instant Book</span>
                        )}
                        {hasAutoBid && (
                            <span className="px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/25 rounded text-[10px] font-bold text-purple-400 uppercase tracking-wider">Auto Bid</span>
                        )}
                    </div>
                )}

                {/* Booking Instructions */}
                {bookingInstructions && (
                    <div className="pt-1 border-t border-white/5">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Booking Instructions</div>
                        <div className="text-white/80 text-xs leading-relaxed bg-white/5 rounded p-2">{bookingInstructions}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Logistics ---
export function LogisticsModule({ originDeadhead, destDeadhead, truckLength, weight, warnings, isTeam, equipment }: any) {
    const equipmentLabel = equipment || (truckLength ? `${truckLength}' Van` : 'Unknown')
    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Truck className="h-4 w-4" /> Logistics
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/10 p-2 rounded flex justify-between">
                    <span className="text-muted-foreground">Deadhead (Org)</span>
                    <span className="text-white">{originDeadhead} mi</span>
                </div>
                <div className="bg-muted/10 p-2 rounded flex justify-between">
                    <span className="text-muted-foreground">Deadhead (Dst)</span>
                    <span className="text-white">{destDeadhead} mi</span>
                </div>
                <div className="bg-muted/10 p-2 rounded flex justify-between">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="text-white">{weight?.toLocaleString()} lbs</span>
                </div>
                <div className="bg-muted/10 p-2 rounded flex justify-between">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="text-white">{equipmentLabel}</span>
                </div>
            </div>
            {warnings && warnings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-400 flex gap-2 items-start mt-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <div className="flex flex-col">
                        {warnings.map((w: string, i: number) => <span key={i}>{w}</span>)}
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Trust ---
export function TrustModule({ brokerName, mcNumber, phone, email }: any) {
    const saferUrl = mcNumber
        ? `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mcNumber}`
        : null

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Star className="h-4 w-4" /> Broker
            </h4>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-bold text-white">{brokerName}</div>
                        <div className="text-xs text-muted-foreground">MC: {mcNumber || 'N/A'}</div>
                    </div>
                    {/* Placeholder Logo */}
                    <div className="h-8 w-8 bg-white/10 rounded flex items-center justify-center text-xs font-bold">
                        {brokerName?.substring(0, 2)}
                    </div>
                </div>

                {/* SAFER Link */}
                {saferUrl && (
                    <a
                        href={saferUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <span className="inline-block px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider">SAFER</span>
                        View FMCSA Safety Record →
                    </a>
                )}

                {/* Contact Details */}
                <div className="text-xs text-muted-foreground space-y-1.5">
                    {phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a href={`tel:${phone}`} className="text-white/80 hover:text-white transition-colors">{phone}</a>
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a href={`mailto:${email}`} className="text-white/80 hover:text-white transition-colors truncate">{email}</a>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {phone ? (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-2" asChild>
                            <a href={`tel:${phone}`}><Phone className="h-3 w-3" /> Call</a>
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-2" disabled>
                            <Phone className="h-3 w-3" /> No Phone
                        </Button>
                    )}
                    {email ? (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-2" asChild>
                            <a href={`mailto:${email}`}><Mail className="h-3 w-3" /> Email</a>
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-2" disabled>
                            <Mail className="h-3 w-3" /> No Email
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
