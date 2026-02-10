'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Loader2, Search, ChevronDown, Calendar, MapPin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { MultiStateSelect } from "@/components/multi-state-select"

import { SearchCriteria } from "@/workers/cloudtrucks-api-client";

interface SearchCriteriaFormProps {
    onSuccess?: (criteria: SearchCriteria) => void;
}

// Reusable label component for consistency
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{children}</label>
)

// Consistent Input Style
const inputStyles = "bg-slate-900/50 border-slate-600 h-10 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm rounded-md placeholder:text-slate-600"

function OriginFieldGroup() {
    const [stateValue, setStateValue] = React.useState("");
    const [cityValue, setCityValue] = React.useState<string | undefined>(undefined);
    const [isLocating, setIsLocating] = React.useState(false);
    const [locateError, setLocateError] = React.useState<string | null>(null);

    const handleCityStateChange = (state: string) => {
        if (state) {
            setStateValue(state);
            // Clear specific city value so user can type freely after locating
            // But we don't want to clear it immediately if it was just set.
            // Actually, CityAutocomplete will sync internal state, so we can clear our force-prop
            // after a short timeout or just keep it until user types?
            // "CityAutocomplete" uses useEffect to sync. If we set undefined, it might not "reset". 
            // It only syncs if value !== undefined. So setting it back to undefined is safe.
            setTimeout(() => setCityValue(undefined), 100);
        }
    };

    const handleLocateMe = () => {
        setLocateError(null);

        if (!navigator.geolocation) {
            setLocateError("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                // Using BigDataCloud's free client-side reverse geocoding
                const res = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                const data = await res.json();

                if (data.city && data.principalSubdivision) {
                    setCityValue(data.city);
                    // Standardize state code (usually 2 letters)
                    // The API returns full state name sometimes or code. 
                    // Let's rely on CityAutocomplete to infer state from city if possible, 
                    // or trust the API if it gives a code.
                    // Actually, let's just use the city and let the Autocomplete component resolve the state 
                    // via its own internal logic if it matches a known US city, 
                    // OR set the state directly if we have a code.

                    // The API returns "principalSubdivisionCode" usually (e.g. "US-TX").
                    let stateCode = data.principalSubdivisionCode || "";
                    if (stateCode.startsWith("US-")) {
                        stateCode = stateCode.replace("US-", "");
                    }

                    if (stateCode.length === 2) {
                        setStateValue(stateCode);
                    }
                } else {
                    console.error("Could not detect city/state");
                    setLocateError("We found your location but could not determine city/state.");
                }
            } catch (error) {
                console.error("Reverse geocoding failed", error);
                setLocateError("Could not reverse geocode your location. Please enter city/state manually.");
            } finally {
                setIsLocating(false);
            }
        }, (error) => {
            console.error("Geolocation failed", error);
            setIsLocating(false);
            setLocateError("Unable to retrieve location. Please check browser location permissions.");
        });
    };

    return (
        <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Pickup <span className="text-slate-500 font-normal normal-case">(city & state)</span></FieldLabel>
                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-wider disabled:opacity-50"
                >
                    {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    {isLocating ? "Locating..." : "Use My Location"}
                </button>
            </div>
            <div className="flex gap-2">
                <CityAutocomplete
                    name="origin_city"
                    required
                    value={cityValue}
                    onStateChange={handleCityStateChange}
                    className="flex-[2]"
                />
                <div className="flex-1 min-w-[60px] max-w-[80px]">
                    <Input
                        name="origin_state"
                        value={stateValue}
                        onChange={(e) => setStateValue(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="ST"
                        maxLength={2}
                        required
                        className={cn(inputStyles, "text-center font-bold uppercase")}
                    />
                </div>
            </div>
            {locateError && (
                <p className="mt-2 text-xs text-amber-400">{locateError}</p>
            )}
        </div>
    );
}

function DestinationFieldGroup() {
    const [selectedStates, setSelectedStates] = React.useState<string[]>([]);

    const handleCityStateChange = (state: string) => {
        if (state && !selectedStates.includes(state)) {
            setSelectedStates([state]);
        }
    };

    return (
        <div className="flex-1 min-w-[240px]">
            <FieldLabel>Dropoff <span className="text-slate-500 font-normal normal-case">(city or states)</span></FieldLabel>
            <div className="flex gap-2">
                <CityAutocomplete
                    name="dest_city"
                    placeholder="Any City"
                    onStateChange={handleCityStateChange}
                    className="flex-[1.5]"
                />
                <MultiStateSelect
                    name="destination_states"
                    placeholder="Regions/States"
                    className={cn(inputStyles, "flex-1 min-w-[120px] px-3")}
                    value={selectedStates}
                    onChange={setSelectedStates}
                />
            </div>
        </div>
    );
}

export function SearchCriteriaForm({ onSuccess }: SearchCriteriaFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [outcome, setOutcome] = useState<{ error?: string; success?: string } | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)

        setIsSubmitting(true)
        setOutcome(null)

        try {
            const response = await fetch('/api/criteria', {
                method: 'POST',
                body: formData,
            })

            let result;
            try {
                result = await response.json()
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError)
                throw new Error(`Server returned ${response.status} ${response.statusText}`)
            }

            if (result.error) {
                setOutcome({ error: result.error })
            } else {
                setOutcome({ success: 'Added! Scanning started...' })

                if (result.criteria) {
                    onSuccess?.(result.criteria)
                }

                // Trigger a scan explicitly
                try {
                    const criteriaId = result.criteria?.id;
                    fetch('/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: criteriaId ? JSON.stringify({ criteriaId }) : undefined
                    })
                } catch {
                    // Non-fatal
                }

                form.reset()

                // Clear loading state immediately so UI feels responsive
                setIsSubmitting(false)

                // Refresh data in background without blocking UI
                startTransition(() => {
                    router.refresh()
                })

                setTimeout(() => setOutcome(null), 3000)
            }
        } catch (error: unknown) {
            console.error('Form submission error:', error)
            const message = error instanceof Error ? error.message : 'Failed to save';
            setOutcome({ error: message })
        } finally {
            // Ensure loading is off if we didn't succeed (success case handles it inside explicitly)
            if (outcome?.error || !outcome?.success) {
                setIsSubmitting(false)
            }
        }
    }

    return (
        <div className="mb-8">
            {/* Alerts */}
            {outcome?.error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{outcome.error}</AlertDescription>
                </Alert>
            )}
            {outcome?.success && (
                <Alert className="mb-4 bg-green-500/10 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{outcome.success}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                {/* Control Bar Container */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
                    <div className="relative z-10 bg-slate-900/60 backdrop-blur-md rounded-t-xl p-4 gap-4 flex flex-col xl:flex-row xl:items-end">

                        <div className="flex flex-1 flex-wrap gap-4 items-end">
                            {/* Origin */}
                            <OriginFieldGroup />

                            {/* Pickup Date / Date Range */}
                            <div className="flex-none relative z-20">
                                <FieldLabel>Date Range</FieldLabel>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            name="pickup_date"
                                            placeholder="Start"
                                            className={cn(inputStyles, "pl-9 pr-2 w-28 appearance-none text-xs")}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            name="pickup_date_end"
                                            placeholder="End"
                                            className={cn(inputStyles, "pl-9 pr-2 w-28 appearance-none text-xs")}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Radius */}
                            <div className="w-[110px]">
                                <FieldLabel>Radius</FieldLabel>
                                <div className="relative">
                                    <select name="pickup_distance" defaultValue="50" className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}>
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

                            {/* Decorative Divider */}
                            <div className="hidden xl:block h-8 w-px bg-slate-700 mx-2 mb-1"></div>

                            {/* Destination */}
                            <DestinationFieldGroup />
                        </div>
                    </div>

                    {/* Expandable Filters Panel */}
                    <div className="border-t border-slate-800/50 bg-slate-900/30 py-4 px-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            {/* Trailer Type */}
                            <div>
                                <FieldLabel>Trailer Type</FieldLabel>
                                <div className="relative">
                                    <select name="equipment_type" className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}>
                                        <option value="Any">Any Equipment</option>
                                        <option value="Dry Van">Dry Van</option>
                                        <option value="Power Only">Power Only</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Booking Type */}
                            <div>
                                <FieldLabel>Booking Type</FieldLabel>
                                <div className="relative">
                                    <select name="booking_type" className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}>
                                        <option value="Any">Any Method</option>
                                        <option value="instant">Instant Book</option>
                                        <option value="standard">Standard Book</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Min Rate ($)</FieldLabel>
                                <Input
                                    name="min_rate"
                                    type="number"
                                    step="0.01"
                                    placeholder="Any"
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
                                    className={inputStyles}
                                />
                            </div>

                            <div>
                                <FieldLabel>Max Weight (lbs)</FieldLabel>
                                <Input
                                    name="max_weight"
                                    type="number"
                                    placeholder="45000"
                                    defaultValue="45000"
                                    className={inputStyles}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Group */}
                    <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-b-xl border-t border-slate-800/50">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all duration-300 font-semibold"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Add Criteria
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
