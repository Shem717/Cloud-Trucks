'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface SearchCriteriaFormProps {
    onSuccess?: () => void;
}

const US_STATES = [
    { value: 'AL', label: 'AL' }, { value: 'AK', label: 'AK' }, { value: 'AZ', label: 'AZ' },
    { value: 'AR', label: 'AR' }, { value: 'CA', label: 'CA' }, { value: 'CO', label: 'CO' },
    { value: 'CT', label: 'CT' }, { value: 'DE', label: 'DE' }, { value: 'FL', label: 'FL' },
    { value: 'GA', label: 'GA' }, { value: 'HI', label: 'HI' }, { value: 'ID', label: 'ID' },
    { value: 'IL', label: 'IL' }, { value: 'IN', label: 'IN' }, { value: 'IA', label: 'IA' },
    { value: 'KS', label: 'KS' }, { value: 'KY', label: 'KY' }, { value: 'LA', label: 'LA' },
    { value: 'ME', label: 'ME' }, { value: 'MD', label: 'MD' }, { value: 'MA', label: 'MA' },
    { value: 'MI', label: 'MI' }, { value: 'MN', label: 'MN' }, { value: 'MS', label: 'MS' },
    { value: 'MO', label: 'MO' }, { value: 'MT', label: 'MT' }, { value: 'NE', label: 'NE' },
    { value: 'NV', label: 'NV' }, { value: 'NH', label: 'NH' }, { value: 'NJ', label: 'NJ' },
    { value: 'NM', label: 'NM' }, { value: 'NY', label: 'NY' }, { value: 'NC', label: 'NC' },
    { value: 'ND', label: 'ND' }, { value: 'OH', label: 'OH' }, { value: 'OK', label: 'OK' },
    { value: 'OR', label: 'OR' }, { value: 'PA', label: 'PA' }, { value: 'RI', label: 'RI' },
    { value: 'SC', label: 'SC' }, { value: 'SD', label: 'SD' }, { value: 'TN', label: 'TN' },
    { value: 'TX', label: 'TX' }, { value: 'UT', label: 'UT' }, { value: 'VT', label: 'VT' },
    { value: 'VA', label: 'VA' }, { value: 'WA', label: 'WA' }, { value: 'WV', label: 'WV' },
    { value: 'WI', label: 'WI' }, { value: 'WY', label: 'WY' }
];

export function SearchCriteriaForm({ onSuccess }: SearchCriteriaFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [outcome, setOutcome] = useState<{ error?: string; success?: string } | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            try {
                const response = await fetch('/api/criteria', {
                    method: 'POST',
                    body: formData,
                })

                const result = await response.json()

                if (result.error) {
                    setOutcome({ error: result.error })
                } else {
                    setOutcome({ success: 'Added!' })
                    event.currentTarget.reset()
                    router.refresh()
                    onSuccess?.()
                    setTimeout(() => setOutcome(null), 2000)
                }
            } catch (error) {
                setOutcome({ error: 'Failed to save' })
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
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-slate-400 mb-1 block">Pickup</label>
                        <div className="flex gap-1">
                            <Input
                                name="origin_city"
                                placeholder="City"
                                required
                                className="flex-1 bg-slate-900/50 border-slate-600 focus:border-blue-500 h-10"
                            />
                            <Select name="origin_state">
                                <SelectTrigger className="w-[70px] bg-slate-900/50 border-slate-600 h-10">
                                    <SelectValue placeholder="ST" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {US_STATES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Radius */}
                    <div className="w-[110px]">
                        <label className="text-xs text-slate-400 mb-1 block">Radius</label>
                        <Select name="pickup_distance" defaultValue="50">
                            <SelectTrigger className="bg-slate-900/50 border-slate-600 h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Exact</SelectItem>
                                <SelectItem value="50">50 mi</SelectItem>
                                <SelectItem value="100">100 mi</SelectItem>
                                <SelectItem value="150">150 mi</SelectItem>
                                <SelectItem value="200">200 mi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pickup Date */}
                    <div className="w-[130px]">
                        <label className="text-xs text-slate-400 mb-1 block">Date</label>
                        <Input
                            type="date"
                            name="pickup_date"
                            className="bg-slate-900/50 border-slate-600 h-10 text-slate-300"
                        />
                    </div>

                    {/* Arrow Divider */}
                    <div className="hidden sm:flex items-center justify-center text-blue-400 text-2xl font-light pb-1">
                        →
                    </div>

                    {/* Destination */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-slate-400 mb-1 block">Dropoff <span className="text-slate-500">(optional)</span></label>
                        <div className="flex gap-1">
                            <Input
                                name="dest_city"
                                placeholder="Anywhere"
                                className="flex-1 bg-slate-900/50 border-slate-600 focus:border-blue-500 h-10"
                            />
                            <Select name="destination_state">
                                <SelectTrigger className="w-[70px] bg-slate-900/50 border-slate-600 h-10">
                                    <SelectValue placeholder="ST" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <SelectItem value="any">Any</SelectItem>
                                    {US_STATES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                        <Select name="equipment_type">
                            <SelectTrigger className="bg-slate-900/50 border-slate-600 h-9">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Any">Any</SelectItem>
                                <SelectItem value="Dry Van">Dry Van</SelectItem>
                                <SelectItem value="Power Only">Power Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Booking Type - matches CloudTrucks options */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Booking Type</label>
                        <Select name="booking_type">
                            <SelectTrigger className="bg-slate-900/50 border-slate-600 h-9">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Any">Any</SelectItem>
                                <SelectItem value="instant">Instant Book</SelectItem>
                                <SelectItem value="standard">Standard Book</SelectItem>
                            </SelectContent>
                        </Select>
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
