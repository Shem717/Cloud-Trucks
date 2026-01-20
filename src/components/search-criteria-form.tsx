'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { MultiStateSelect } from "@/components/multi-state-select"

import { SearchCriteria } from "@/workers/cloudtrucks-api-client";

interface SearchCriteriaFormProps {
    onSuccess?: (criteria: SearchCriteria) => void; // Pass the newly created criteria
}

// Field groups that manage state synchronization between city and state selectors
function OriginFieldGroup() {
    const [stateValue, setStateValue] = React.useState("");

    const handleCityStateChange = (state: string) => {
        if (state) {
            setStateValue(state);
        }
    };

    return (
        <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400 mb-1 block">Pickup <span className="text-slate-500">(city & state)</span></label>
            <div className="flex gap-1.5">
                <CityAutocomplete
                    name="origin_city"
                    required
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
                        className="bg-slate-900/50 border-slate-600 h-10 text-center font-bold uppercase"
                    />
                </div>
            </div>
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
            <label className="text-xs text-slate-400 mb-1 block">Dropoff <span className="text-slate-500">(city or states/region)</span></label>
            <div className="flex gap-1.5">
                <CityAutocomplete
                    name="dest_city"
                    placeholder="Any City"
                    onStateChange={handleCityStateChange}
                    className="flex-[1.5]"
                />
                <MultiStateSelect
                    name="destination_states"
                    placeholder="Region/States"
                    className="flex-1 min-w-[120px]"
                    value={selectedStates}
                    onChange={setSelectedStates}
                />
            </div>
        </div>
    );
}

export function SearchCriteriaForm({ onSuccess }: SearchCriteriaFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [outcome, setOutcome] = useState<{ error?: string; success?: string } | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)

        startTransition(async () => {
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
                    const text = await response.text().catch(() => '')
                    console.error('Raw response:', text)
                    throw new Error(`Server returned ${response.status} ${response.statusText}`)
                }

                if (result.error) {
                    setOutcome({ error: result.error })
                } else {
                    setOutcome({ success: 'Added! Scanning started...' })

                    // Call onSuccess with the newly created criteria for optimistic UI update
                    if (result.criteria) {
                        onSuccess?.(result.criteria)
                    }

                    form.reset()
                    router.refresh()
                    setTimeout(() => setOutcome(null), 3000)
                }
            } catch (error: unknown) {
                console.error('Form submission error:', error)
                const message = error instanceof Error ? error.message : 'Failed to save';
                setOutcome({ error: message })
            }
        })
    }

    return (
        <div className="mb-6">
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
                {/* Main Search Bar - Horizontal */}
                <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm shadow-xl">
                    {/* Origin */}
                    <OriginFieldGroup />

                    {/* Radius */}
                    <div className="w-[100px]">
                        <label className="text-xs text-slate-400 mb-1.5 block font-medium">Radius</label>
                        <select name="pickup_distance" defaultValue="50" className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                            <option value="50">50 mi</option>
                            <option value="100">100 mi</option>
                            <option value="150">150 mi</option>
                            <option value="200">200 mi</option>
                            <option value="300">300 mi</option>
                            <option value="400">400 mi</option>
                        </select>
                    </div>

                    {/* Pickup Date */}
                    <div className="w-[140px]">
                        <label className="text-xs text-slate-400 mb-1.5 block font-medium">Date</label>
                        <Input
                            type="date"
                            name="pickup_date"
                            className="bg-slate-900/50 border-slate-600 h-10 text-slate-300 focus:border-blue-500"
                        />
                    </div>

                    {/* Arrow Divider */}
                    <div className="hidden xl:flex items-center justify-center text-slate-600 pb-1 px-1">
                        <div className="w-4 h-[1px] bg-slate-700"></div>
                    </div>

                    {/* Destination */}
                    <DestinationFieldGroup />

                    {/* More Filters Toggle */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-slate-400 hover:text-white h-10"
                    >
                        Filters
                        {showFilters ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                    </Button>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-500 h-10 px-6"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Add
                            </>
                        )}
                    </Button>
                </div>

                {/* Expandable Filters */}
                <div className={cn(
                    "grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/30 transition-all duration-200",
                    showFilters ? "opacity-100" : "hidden"
                )}>
                    {/* Trailer Type - matches CloudTrucks options */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Trailer Type</label>
                        <select name="equipment_type" className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400">
                            <option value="Any">Any</option>
                            <option value="Dry Van">Dry Van</option>
                            <option value="Power Only">Power Only</option>
                        </select>
                    </div>
                    {/* Booking Type - matches CloudTrucks options */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Booking Type</label>
                        <select name="booking_type" className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400">
                            <option value="Any">Any</option>
                            <option value="instant">Instant Book</option>
                            <option value="standard">Standard Book</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Min Rate ($)</label>
                        <Input
                            name="min_rate"
                            type="number"
                            step="0.01"
                            placeholder="Any"
                            className="bg-slate-900/50 border-slate-600 h-9"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Max Weight (lbs)</label>
                        <Input
                            name="max_weight"
                            type="number"
                            placeholder="45000"
                            defaultValue="45000"
                            className="bg-slate-900/50 border-slate-600 h-9"
                        />
                    </div>
                </div>
            </form>
        </div>
    )
}

