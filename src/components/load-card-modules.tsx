import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Phone, Mail, ShieldCheck, Truck, Scale, AlertTriangle, 
    Droplets, HandCoins, Receipt, Castle, Calculator, MapPin, Navigation
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// --- Types ---
interface FinancialsModuleProps {
    fuelCost?: number | string;
    tollCost?: number | string;
    revenuePerHour?: number | string;
    tripRate: number | string;
}

interface LogisticsModuleProps {
    originDeadhead?: number | string;
    destDeadhead?: number | string;
    truckLength?: number | string;
    weight: number;
    warnings?: string[];
    isTeam?: boolean;
    hasAutoBid?: boolean;
}

interface TrustModuleProps {
    brokerName: string;
    mcNumber?: string;
    phone?: string;
    email?: string;
}

interface AddressModuleProps {
    originAddress?: string;
    destAddress?: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    stops?: Array<{
        type: string;
        city?: string;
        state?: string;
        address?: string;
        [key: string]: unknown;
    }>;
}

// --- Helper ---
const safeFloat = (val: number | string | undefined): number | null => {
    if (val === undefined || val === null) return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? null : num;
};

// --- Components ---

export function FinancialsModule({ fuelCost, tollCost, tripRate }: FinancialsModuleProps) {
    const [showProfit, setShowProfit] = useState(false);
    
    const safeTripRate = safeFloat(tripRate) || 0;
    const safeFuel = safeFloat(fuelCost) || 0;
    const safeTolls = safeFloat(tollCost) || 0;

    const netProfit = safeTripRate - safeFuel - safeTolls;
    const margin = safeTripRate > 0 ? (netProfit / safeTripRate) * 100 : 0;

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <HandCoins className="h-3 w-3" /> Financials
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> Est. Fuel
                    </div>
                    <div className="font-mono font-medium mt-1">
                        {safeFuel > 0 ? `$${safeFuel.toFixed(0)}` : 'N/A'}
                    </div>
                </div>
                <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Receipt className="h-3 w-3" /> Est. Tolls
                    </div>
                    <div className="font-mono font-medium mt-1">
                        {safeTolls > 0 ? `$${safeTolls.toFixed(0)}` : '$0'}
                    </div>
                </div>
                {showProfit ? (
                    <div className="col-span-2 p-2 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Est. Net Profit</div>
                                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                    ${netProfit.toFixed(0)}
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-xs text-muted-foreground">Margin</div>
                                 <div className="font-mono text-sm font-medium">{margin.toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="col-span-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full gap-2 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowProfit(true);
                            }}
                        >
                            <Calculator className="h-3 w-3" />
                            Calculate Net Profit
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function LogisticsModule({ originDeadhead, destDeadhead, truckLength, weight, warnings, isTeam, hasAutoBid }: LogisticsModuleProps) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Truck className="h-3 w-3" /> Logistics
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
                 <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">Deadhead (Org/Dst)</div>
                    <div className="font-mono text-sm">
                        {originDeadhead ?? '?'}mi / {destDeadhead ?? '?'}mi
                    </div>
                 </div>
                 <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">Truck Req</div>
                     <div className="font-mono text-sm">
                        {truckLength ? `${truckLength}ft` : 'Any'} • {(weight / 1000).toFixed(1)}k lbs
                    </div>
                 </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
                {isTeam && <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Team Required</Badge>}
                {hasAutoBid && <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Auto-Bid Active</Badge>}
            </div>

            {warnings && warnings.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900">
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3" /> Warnings
                    </div>
                    <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function TrustModule({ brokerName, mcNumber, phone, email }: TrustModuleProps) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Trust & Contact
            </h4>
            
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3">
                <div className="font-medium text-sm mb-1">{brokerName}</div>
                {mcNumber && (
                    <a 
                        href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mcNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Castle className="h-3 w-3" /> MC#{mcNumber} (Verify on SAFER)
                    </a>
                )}
                
                <Separator className="my-2" />
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {phone ? (
                         <Button variant="outline" size="sm" className="h-8 gap-2 w-full" onClick={(e) => { e.stopPropagation(); window.open(`tel:${phone}`); }}>
                            <Phone className="h-3 w-3" /> Call
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" className="h-8 gap-2 w-full" disabled>
                            <Phone className="h-3 w-3" /> No Phone
                        </Button>
                    )}
                    
                    {email ? (
                        <Button variant="outline" size="sm" className="h-8 gap-2 w-full" onClick={(e) => { e.stopPropagation(); window.open(`mailto:${email}`); }}>
                            <Mail className="h-3 w-3" /> Email
                        </Button>
                    ) : (
                         <Button variant="outline" size="sm" className="h-8 gap-2 w-full" disabled>
                            <Mail className="h-3 w-3" /> No Email
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AddressModule({ originAddress, destAddress, originCity, originState, destCity, destState, stops }: AddressModuleProps) {
    // Extract address info from stops array (CloudTrucks format)
    // Stops have: location_address1, location_address2, location_city, location_state, location_zip, location_lat, location_long
    const extractStopAddress = (stop: any) => {
        const addr1 = stop?.location_address1 || stop?.address || '';
        const addr2 = stop?.location_address2 || '';
        const city = stop?.location_city || stop?.city || '';
        const state = stop?.location_state || stop?.state || '';
        const zip = stop?.location_zip || stop?.zip || '';
        const lat = stop?.location_lat;
        const lon = stop?.location_long || stop?.location_lon;
        
        const fullAddress = [addr1, addr2].filter(Boolean).join(', ');
        const cityStateZip = [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '');
        
        return {
            address: fullAddress,
            cityStateZip,
            city,
            state,
            zip,
            lat,
            lon,
            hasAddress: fullAddress.trim().length > 0,
            type: stop?.type || stop?.type_detail || '',
        };
    };
    
    // Find origin and destination stops
    const originStop = (stops || []).find((s: any) => s.type === 'ORIGIN' || s.type_detail === 'PICKUP');
    const destStop = (stops || []).find((s: any) => s.type === 'DESTINATION' || s.type_detail === 'DELIVERY');
    
    const origin = originStop ? extractStopAddress(originStop) : { 
        address: originAddress || '', 
        cityStateZip: `${originCity}, ${originState}`,
        city: originCity,
        state: originState,
        hasAddress: !!(originAddress && originAddress.trim()),
        lat: null,
        lon: null,
    };
    
    const dest = destStop ? extractStopAddress(destStop) : { 
        address: destAddress || '', 
        cityStateZip: `${destCity}, ${destState}`,
        city: destCity,
        state: destState,
        hasAddress: !!(destAddress && destAddress.trim()),
        lat: null,
        lon: null,
    };
    
    // Get any additional stops (not origin/destination)
    const additionalStops = (stops || [])
        .filter((s: any) => s.type !== 'ORIGIN' && s.type !== 'DESTINATION')
        .map(extractStopAddress)
        .filter(s => s.hasAddress);
    
    const hasAnyAddressData = origin.hasAddress || dest.hasAddress || additionalStops.length > 0;
    
    const openInMaps = (address: string, city: string, state: string, lat?: number, lon?: number) => {
        if (lat && lon) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city + ', ' + state)}`, '_blank');
        }
    };
    
    if (!hasAnyAddressData) {
        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Addresses
                </h4>
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-muted-foreground">
                        Address data not available for this load.
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Addresses may be revealed for Instant Book loads.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Addresses
            </h4>
            
            <div className="space-y-2">
                {/* Origin Address */}
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50">
                    <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400">Pickup</div>
                            {origin.hasAddress ? (
                                <>
                                    <div className="text-sm font-medium mt-0.5">{origin.address}</div>
                                    <div className="text-xs text-muted-foreground">{origin.cityStateZip}</div>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">{origin.cityStateZip}</div>
                            )}
                        </div>
                        {origin.hasAddress && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openInMaps(origin.address, origin.city, origin.state, origin.lat, origin.lon);
                                }}
                            >
                                <Navigation className="h-3 w-3 mr-1" /> Map
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Destination Address */}
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                    <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-red-700 dark:text-red-400">Delivery</div>
                            {dest.hasAddress ? (
                                <>
                                    <div className="text-sm font-medium mt-0.5">{dest.address}</div>
                                    <div className="text-xs text-muted-foreground">{dest.cityStateZip}</div>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">{dest.cityStateZip}</div>
                            )}
                        </div>
                        {dest.hasAddress && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openInMaps(dest.address, dest.city, dest.state, dest.lat, dest.lon);
                                }}
                            >
                                <Navigation className="h-3 w-3 mr-1" /> Map
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Additional stops with addresses */}
                {additionalStops.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-dashed">
                        <div className="text-xs font-medium text-muted-foreground">Additional Stops</div>
                        {additionalStops.map((stop, idx) => (
                            <div key={idx} className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-blue-700 dark:text-blue-400">{stop.type}</div>
                                        <div className="text-sm font-medium mt-0.5">{stop.address}</div>
                                        <div className="text-xs text-muted-foreground">{stop.cityStateZip}</div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 px-2 text-xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openInMaps(stop.address, stop.city, stop.state, stop.lat, stop.lon);
                                        }}
                                    >
                                        <Navigation className="h-3 w-3 mr-1" /> Map
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
