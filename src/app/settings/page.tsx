'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Settings, SortAsc, MapPin, Truck, Fuel, ArrowLeftRight, Loader2, Save, Home } from 'lucide-react'
import { usePreferences } from '@/hooks/use-preferences'
import { MultiStateSelect } from "@/components/multi-state-select"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { SortOption } from '@/app/api/preferences/route'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_high', label: 'Highest Price' },
    { value: 'price_low', label: 'Lowest Price' },
    { value: 'rpm_high', label: 'Highest RPM' },
    { value: 'rpm_low', label: 'Lowest RPM' },
    { value: 'deadhead_low', label: 'Lowest Deadhead' },
    { value: 'deadhead_high', label: 'Highest Deadhead' },
    { value: 'pickup_soonest', label: 'Pickup Soonest' },
    { value: 'pickup_latest', label: 'Pickup Latest' },
    { value: 'distance_short', label: 'Shortest Distance' },
    { value: 'distance_long', label: 'Longest Distance' },
    { value: 'weight_light', label: 'Lightest Weight' },
    { value: 'weight_heavy', label: 'Heaviest Weight' },
]

const EQUIPMENT_OPTIONS = [
    { value: 'any', label: 'Any Equipment' },
    { value: 'Dry Van', label: 'Dry Van' },
    { value: 'Reefer', label: 'Reefer' },
    { value: 'Flatbed', label: 'Flatbed' },
    { value: 'Power Only', label: 'Power Only' },
]

const BOOKING_OPTIONS = [
    { value: 'any', label: 'Any Booking Type' },
    { value: 'instant', label: 'Instant Book Only' },
    { value: 'standard', label: 'Standard Only' },
]

const FieldLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {children}
    </label>
)

const inputStyles = "bg-slate-900/50 border-slate-600 h-10 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm rounded-md placeholder:text-slate-600"

export default function SettingsPage() {
    const { preferences, isLoading, updatePreferences } = usePreferences()
    const [saving, setSaving] = useState(false)

    // Local form state
    const [formState, setFormState] = useState({
        default_sort: 'newest' as SortOption,
        preferred_min_rate: '',
        preferred_min_rpm: '',
        preferred_max_weight: '',
        preferred_min_weight: '',
        preferred_equipment_type: 'any',
        preferred_booking_type: 'any',
        preferred_pickup_distance: '50',
        home_city: '',
        home_state: '',
        preferred_destination_states: [] as string[],
        avoid_states: [] as string[],
        auto_suggest_backhauls: true,
        backhaul_max_deadhead: '100',
        backhaul_min_rpm: '2.00',
        fuel_mpg: '6.5',
        fuel_price_per_gallon: '3.80',
    })

    // Sync form state with preferences when loaded
    useEffect(() => {
        if (preferences) {
            setFormState({
                default_sort: (preferences.default_sort as SortOption) || 'newest',
                preferred_min_rate: preferences.preferred_min_rate?.toString() || '',
                preferred_min_rpm: preferences.preferred_min_rpm?.toString() || '',
                preferred_max_weight: preferences.preferred_max_weight?.toString() || '',
                preferred_min_weight: preferences.preferred_min_weight?.toString() || '',
                preferred_equipment_type: preferences.preferred_equipment_type || 'any',
                preferred_booking_type: preferences.preferred_booking_type || 'any',
                preferred_pickup_distance: preferences.preferred_pickup_distance?.toString() || '50',
                home_city: preferences.home_city || '',
                home_state: preferences.home_state || '',
                preferred_destination_states: preferences.preferred_destination_states || [],
                avoid_states: preferences.avoid_states || [],
                auto_suggest_backhauls: preferences.auto_suggest_backhauls ?? true,
                backhaul_max_deadhead: preferences.backhaul_max_deadhead?.toString() || '100',
                backhaul_min_rpm: preferences.backhaul_min_rpm?.toString() || '2.00',
                fuel_mpg: preferences.fuel_mpg?.toString() || '6.5',
                fuel_price_per_gallon: preferences.fuel_price_per_gallon?.toString() || '3.80',
            })
        }
    }, [preferences])

    const handleSave = async () => {
        setSaving(true)
        try {
            await updatePreferences({
                default_sort: formState.default_sort,
                preferred_min_rate: formState.preferred_min_rate ? parseFloat(formState.preferred_min_rate) : null,
                preferred_min_rpm: formState.preferred_min_rpm ? parseFloat(formState.preferred_min_rpm) : null,
                preferred_max_weight: formState.preferred_max_weight ? parseInt(formState.preferred_max_weight) : null,
                preferred_min_weight: formState.preferred_min_weight ? parseInt(formState.preferred_min_weight) : null,
                preferred_equipment_type: formState.preferred_equipment_type === 'any' ? null : formState.preferred_equipment_type,
                preferred_booking_type: formState.preferred_booking_type === 'any' ? null : formState.preferred_booking_type,
                preferred_pickup_distance: parseInt(formState.preferred_pickup_distance) || 50,
                home_city: formState.home_city || null,
                home_state: formState.home_state || null,
                preferred_destination_states: formState.preferred_destination_states.length > 0 ? formState.preferred_destination_states : null,
                avoid_states: formState.avoid_states.length > 0 ? formState.avoid_states : null,
                auto_suggest_backhauls: formState.auto_suggest_backhauls,
                backhaul_max_deadhead: parseInt(formState.backhaul_max_deadhead) || 100,
                backhaul_min_rpm: parseFloat(formState.backhaul_min_rpm) || 2.00,
                fuel_mpg: parseFloat(formState.fuel_mpg) || 6.5,
                fuel_price_per_gallon: parseFloat(formState.fuel_price_per_gallon) || 3.80,
            })
            toast.success('Settings saved successfully')
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Settings className="h-6 w-6 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                    </div>
                    <p className="text-slate-400">Manage your preferences for load searching, sorting, and backhaul suggestions.</p>
                </div>

                <div className="space-y-6">
                    {/* Sorting Preferences */}
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <SortAsc className="h-5 w-5 text-blue-400" />
                                Sorting Preferences
                            </CardTitle>
                            <CardDescription>Set your default sort order for the load feed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>Default Sort Order</FieldLabel>
                                    <Select
                                        value={formState.default_sort}
                                        onValueChange={(value) => setFormState(s => ({ ...s, default_sort: value as SortOption }))}
                                    >
                                        <SelectTrigger className={inputStyles}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700">
                                            {SORT_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Load Preferences */}
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <Truck className="h-5 w-5 text-emerald-400" />
                                Load Preferences
                            </CardTitle>
                            <CardDescription>Set default filters for new search missions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Minimum Rate ($)</FieldLabel>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 1500"
                                        value={formState.preferred_min_rate}
                                        onChange={(e) => setFormState(s => ({ ...s, preferred_min_rate: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Minimum RPM ($/mile)</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 2.50"
                                        value={formState.preferred_min_rpm}
                                        onChange={(e) => setFormState(s => ({ ...s, preferred_min_rpm: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Minimum Weight (lbs)</FieldLabel>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 10000"
                                        value={formState.preferred_min_weight}
                                        onChange={(e) => setFormState(s => ({ ...s, preferred_min_weight: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Maximum Weight (lbs)</FieldLabel>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 45000"
                                        value={formState.preferred_max_weight}
                                        onChange={(e) => setFormState(s => ({ ...s, preferred_max_weight: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Pickup Distance (miles)</FieldLabel>
                                    <Input
                                        type="number"
                                        placeholder="50"
                                        value={formState.preferred_pickup_distance}
                                        onChange={(e) => setFormState(s => ({ ...s, preferred_pickup_distance: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Equipment Type</FieldLabel>
                                    <Select
                                        value={formState.preferred_equipment_type}
                                        onValueChange={(value) => setFormState(s => ({ ...s, preferred_equipment_type: value }))}
                                    >
                                        <SelectTrigger className={inputStyles}>
                                            <SelectValue placeholder="Any Equipment" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700">
                                            {EQUIPMENT_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <FieldLabel>Booking Type</FieldLabel>
                                    <Select
                                        value={formState.preferred_booking_type}
                                        onValueChange={(value) => setFormState(s => ({ ...s, preferred_booking_type: value }))}
                                    >
                                        <SelectTrigger className={inputStyles}>
                                            <SelectValue placeholder="Any Booking Type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700">
                                            {BOOKING_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location Preferences */}
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <MapPin className="h-5 w-5 text-amber-400" />
                                Location Preferences
                            </CardTitle>
                            <CardDescription>Set your home base and preferred lanes for backhaul suggestions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel icon={Home}>Home City</FieldLabel>
                                        <CityAutocomplete
                                            name="home_city"
                                            defaultValue={formState.home_city}
                                            onStateChange={(state) => setFormState(s => ({ ...s, home_state: state }))}
                                            placeholder="Enter your home city"
                                            className={inputStyles}
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Home State</FieldLabel>
                                        <Input
                                            type="text"
                                            placeholder="e.g., TX"
                                            maxLength={2}
                                            value={formState.home_state}
                                            onChange={(e) => setFormState(s => ({ ...s, home_state: e.target.value.toUpperCase() }))}
                                            className={inputStyles}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>Preferred Destination States</FieldLabel>
                                    <p className="text-xs text-slate-500 mb-2">States you prefer for backhaul loads. Backhaul suggestions will search for loads going to these states.</p>
                                    <MultiStateSelect
                                        name="preferred_destination_states"
                                        placeholder="Select preferred states"
                                        value={formState.preferred_destination_states}
                                        onChange={(states) => setFormState(s => ({ ...s, preferred_destination_states: states }))}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>States to Avoid</FieldLabel>
                                    <p className="text-xs text-slate-500 mb-2">States you want to avoid. These will be excluded from search results and backhaul suggestions.</p>
                                    <MultiStateSelect
                                        name="avoid_states"
                                        placeholder="Select states to avoid"
                                        value={formState.avoid_states}
                                        onChange={(states) => setFormState(s => ({ ...s, avoid_states: states }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Backhaul Settings */}
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <ArrowLeftRight className="h-5 w-5 text-purple-400" />
                                Backhaul Settings
                            </CardTitle>
                            <CardDescription>Configure automatic backhaul suggestions for your saved loads.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="auto_suggest"
                                        checked={formState.auto_suggest_backhauls}
                                        onCheckedChange={(checked) => setFormState(s => ({ ...s, auto_suggest_backhauls: checked === true }))}
                                    />
                                    <Label htmlFor="auto_suggest" className="text-slate-200 font-medium cursor-pointer">
                                        Automatically suggest backhaul loads when I save a load
                                    </Label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel>Max Deadhead (miles)</FieldLabel>
                                        <p className="text-xs text-slate-500 mb-2">Maximum empty miles for backhaul pickup</p>
                                        <Input
                                            type="number"
                                            placeholder="100"
                                            value={formState.backhaul_max_deadhead}
                                            onChange={(e) => setFormState(s => ({ ...s, backhaul_max_deadhead: e.target.value }))}
                                            className={inputStyles}
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Minimum RPM ($/mile)</FieldLabel>
                                        <p className="text-xs text-slate-500 mb-2">Only show backhauls above this rate per mile</p>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="2.00"
                                            value={formState.backhaul_min_rpm}
                                            onChange={(e) => setFormState(s => ({ ...s, backhaul_min_rpm: e.target.value }))}
                                            className={inputStyles}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fuel Settings */}
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <Fuel className="h-5 w-5 text-red-400" />
                                Fuel & Cost Settings
                            </CardTitle>
                            <CardDescription>Configure your truck&apos;s fuel efficiency for profit calculations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Miles Per Gallon (MPG)</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="6.5"
                                        value={formState.fuel_mpg}
                                        onChange={(e) => setFormState(s => ({ ...s, fuel_mpg: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Fuel Price ($/gallon)</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="3.80"
                                        value={formState.fuel_price_per_gallon}
                                        onChange={(e) => setFormState(s => ({ ...s, fuel_price_per_gallon: e.target.value }))}
                                        className={inputStyles}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Settings
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
