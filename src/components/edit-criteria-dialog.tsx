'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { MultiStateSelect } from "@/components/multi-state-select";
import { SearchCriteria } from "@/workers/cloudtrucks-api-client";

// Extended interface for criteria that includes the id and potentially other fields
interface EnrichedCriteria extends SearchCriteria {
    id: string;
    origin_states?: string | string[];
    destination_states?: string | string[];
    is_backhaul?: boolean;
    pickup_date_end?: string | null;
}

interface EditCriteriaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    criteria: EnrichedCriteria;
    onSuccess: () => void;
    onScanStart?: (id: string) => void;
    onScanComplete?: (id: string) => void;
}

// Reused styles
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{children}</label>
);

const inputStyles = "bg-slate-900/50 border-slate-600 h-10 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm rounded-md placeholder:text-slate-600";

export function EditCriteriaDialog({ open, onOpenChange, criteria, onSuccess, onScanStart, onScanComplete }: EditCriteriaDialogProps) {
    const [submitting, setSubmitting] = useState(false);

    // State for controlled inputs - both origin and destination use arrays for multi-state select
    const [originStates, setOriginStates] = useState<string[]>(
        Array.isArray(criteria.origin_states)
            ? criteria.origin_states
            : typeof criteria.origin_states === 'string'
                ? [criteria.origin_states]
                : criteria.origin_state
                    ? [criteria.origin_state]
                    : []
    );
    const [destStates, setDestStates] = useState<string[]>(
        Array.isArray(criteria.destination_states)
            ? criteria.destination_states
            : typeof criteria.destination_states === 'string'
                ? [criteria.destination_states]
                : criteria.destination_state
                    ? [criteria.destination_state]
                    : []
    );

    useEffect(() => {
        if (!open) return;

        // Initialize origin states array
        const nextOriginStates = Array.isArray(criteria.origin_states)
            ? criteria.origin_states
            : typeof criteria.origin_states === 'string'
                ? [criteria.origin_states]
                : criteria.origin_state
                    ? [criteria.origin_state]
                    : [];
        setOriginStates(nextOriginStates);

        // Initialize destination states array
        const nextDestStates = Array.isArray(criteria.destination_states)
            ? criteria.destination_states
            : typeof criteria.destination_states === 'string'
                ? [criteria.destination_states]
                : criteria.destination_state
                    ? [criteria.destination_state]
                    : [];
        setDestStates(nextDestStates);
    }, [criteria.id, open]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        // Prepare updates object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {};

        // Parse form data
        // Origin
        updates.origin_city = formData.get('origin_city');
        updates.origin_states = originStates.length > 0 ? originStates : null;
        if (originStates.length === 1) {
            updates.origin_state = originStates[0];
        } else {
            updates.origin_state = null;
        }

        // Dest
        updates.dest_city = formData.get('dest_city');
        updates.destination_states = destStates.length > 0 ? destStates : null;
        if (destStates.length === 1) {
            updates.destination_state = destStates[0];
        } else {
            updates.destination_state = null;
        }

        // Numbers
        updates.pickup_distance = parseInt(formData.get('pickup_distance') as string) || 50;

        const rawMinRate = formData.get('min_rate');
        updates.min_rate = rawMinRate ? parseFloat(rawMinRate as string) : null;

        const rawMinRpm = formData.get('min_rpm');
        updates.min_rpm = rawMinRpm ? parseFloat(rawMinRpm as string) : null;

        const rawMaxWeight = formData.get('max_weight');
        updates.max_weight = rawMaxWeight ? parseInt(rawMaxWeight as string) : null;

        // Date
        const rawDate = formData.get('pickup_date') as string;
        updates.pickup_date = rawDate || null;

        const rawEndDate = formData.get('pickup_date_end') as string;
        updates.pickup_date_end = rawEndDate || null;

        // Enums
        const equip = formData.get('equipment_type');
        updates.equipment_type = equip === 'Any' ? null : equip;

        const booking = formData.get('booking_type');
        updates.booking_type = booking === 'Any' ? null : booking;

        try {
            let res;
            let newCriteriaId = criteria.id;

            if (criteria.id) {
                // UPDATE existing
                res = await fetch('/api/criteria', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update',
                        id: criteria.id,
                        updates
                    })
                });
            } else {
                // CREATE new
                // For create, we send the fields directly in body (or nested depending on API, but usually formData structure for POST)
                // The /api/criteria POST endpoint expects formData usually or JSON.
                // Let's assume it accepts JSON for consistency or we use the formData we have if the API expects it.
                // Looking at search-criteria-form (step 116), it uses formData directly.
                // But here we processed 'updates' object. Let's send JSON if the API supports it, or reconstruct formData.
                // To be safe and consistent with previous Edit, let's assume the API handles JSON if we formatted it?
                // Actually SearchCriteriaForm uses `body: formData`.
                // Let's use formData for creation to match SearchCriteriaForm.
                // But we modified state (originStates/destStates) which might not be in formData exactly as expected if we relied on controlled inputs.
                // We should append the multi-select states to formData if they are not picked up.
                // formData.getAll('origin_states')?

                // Let's use the same JSON body structure but for CREATE if possible.
                // If /api/criteria POST only accepts FormData, we must use FormData.
                // SearchCriteriaForm uses FormData.
                // Let's stick to FormData for creation to be safe.
                const createData = new FormData();
                Object.entries(updates).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        if (Array.isArray(value)) {
                            value.forEach(v => createData.append(key, v));
                        } else {
                            createData.append(key, String(value));
                        }
                    }
                });
                // Ensure is_backhaul is set if passed in props
                if (criteria.is_backhaul) {
                    createData.append('is_backhaul', 'true');
                }

                res = await fetch('/api/criteria', {
                    method: 'POST',
                    body: createData,
                });
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            const result = await res.json();
            if (result.criteria?.id) {
                newCriteriaId = result.criteria.id;
            }

            onSuccess();
            onOpenChange(false);

            // Trigger background scan
            if (newCriteriaId) {
                console.log('[DIALOG] Triggering scan for:', newCriteriaId);
                if (onScanStart) onScanStart(newCriteriaId);
                fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ criteriaId: newCriteriaId })
                }).then(scanRes => {
                    if (onScanComplete) onScanComplete(newCriteriaId);
                }).catch(err => {
                    console.error('[DIALOG] Scan failed:', err);
                    if (onScanComplete) onScanComplete(newCriteriaId);
                });
            }

        } catch (error) {
            console.error('Operation failed:', error);
            alert('Failed to save operation');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
            {/* Manual backdrop */}
            <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

            {/* Content without portal wrapping */}
            <DialogPrimitive.Content
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-[600px] bg-slate-900 border border-slate-800 text-slate-200 rounded-lg shadow-lg p-6 max-h-[90vh] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                onEscapeKeyDown={() => onOpenChange(false)}
            >
                {/* Close button */}
                <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>

                <DialogHeader>
                    <DialogTitle>{criteria.is_backhaul ? 'Edit Backhaul' : 'Edit Fronthaul'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit} className="grid gap-6 py-4 overflow-y-auto pr-2 max-h-[calc(90vh-12rem)]">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Origin Group */}
                        <div className="flex-1">
                            <FieldLabel>Pickup (City & State)</FieldLabel>
                            <div className="flex gap-2">
                                <CityAutocomplete
                                    name="origin_city"
                                    defaultValue={criteria.origin_city}
                                    required
                                    onStateChange={(st) => {
                                        if (st && !originStates.includes(st)) {
                                            setOriginStates([st]);
                                        }
                                    }}
                                    className="flex-[1.5]"
                                />
                                <MultiStateSelect
                                    name="origin_states"
                                    placeholder="States"
                                    className={cn(inputStyles, "flex-1 min-w-[100px] px-3")}
                                    value={originStates}
                                    onChange={setOriginStates}
                                />
                            </div>
                        </div>

                        {/* Destination Group */}
                        <div className="flex-1">
                            <FieldLabel>Dropoff</FieldLabel>
                            <div className="flex gap-2">
                                <CityAutocomplete
                                    name="dest_city"
                                    placeholder="Any City"
                                    defaultValue={criteria.dest_city || ''}
                                    onStateChange={(st) => {
                                        if (st && !destStates.includes(st)) {
                                            setDestStates([st]);
                                        }
                                    }}
                                    className="flex-[1.5]"
                                />
                                <MultiStateSelect
                                    name="destination_states"
                                    placeholder="States"
                                    className={cn(inputStyles, "flex-1 min-w-[100px] px-3")}
                                    value={destStates}
                                    onChange={setDestStates}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pickup Distance */}
                        <div>
                            <FieldLabel>Radius</FieldLabel>
                            <div className="relative">
                                <select
                                    name="pickup_distance"
                                    defaultValue={criteria.pickup_distance || 50}
                                    className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                >
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

                        {/* Equipment */}
                        <div>
                            <FieldLabel>Trailer Type</FieldLabel>
                            <div className="relative">
                                <select
                                    name="equipment_type"
                                    defaultValue={criteria.equipment_type || 'Any'}
                                    className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                >
                                    <option value="Any">Any Equipment</option>
                                    <option value="Dry Van">Dry Van</option>
                                    <option value="Power Only">Power Only</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="col-span-1 md:col-span-2">
                            <FieldLabel>Date Range</FieldLabel>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="date"
                                        name="pickup_date"
                                        placeholder="Start"
                                        defaultValue={criteria.pickup_date ? new Date(criteria.pickup_date).toISOString().split('T')[0] : ''}
                                        className={cn(inputStyles, "pl-10 appearance-none")}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                                <div className="relative flex-1">
                                    <Input
                                        type="date"
                                        name="pickup_date_end"
                                        placeholder="End"
                                        defaultValue={criteria.pickup_date_end ? new Date(criteria.pickup_date_end).toISOString().split('T')[0] : ''}
                                        className={cn(inputStyles, "pl-10 appearance-none")}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {/* Min Rate */}
                        <div>
                            <FieldLabel>Min Rate ($)</FieldLabel>
                            <Input
                                name="min_rate"
                                type="number"
                                step="0.01"
                                placeholder="Any"
                                defaultValue={criteria.min_rate || ''}
                                className={inputStyles}
                            />
                        </div>

                        {/* Min RPM */}
                        <div>
                            <FieldLabel>Min RPM ($/mi)</FieldLabel>
                            <Input
                                name="min_rpm"
                                type="number"
                                step="0.01"
                                placeholder="Any"
                                defaultValue={(criteria as { min_rpm?: number | null }).min_rpm || ''}
                                className={inputStyles}
                            />
                        </div>

                        {/* Max Weight */}
                        <div>
                            <FieldLabel>Max Weight (lbs)</FieldLabel>
                            <Input
                                name="max_weight"
                                type="number"
                                placeholder="45000"
                                defaultValue={criteria.max_weight || 45000}
                                className={inputStyles}
                            />
                        </div>

                        {/* Booking Type */}
                        <div>
                            <FieldLabel>Booking Type</FieldLabel>
                            <div className="relative">
                                <select
                                    name="booking_type"
                                    defaultValue={criteria.booking_type || 'Any'}
                                    className={cn(inputStyles, "w-full appearance-none px-3 cursor-pointer")}
                                >
                                    <option value="Any">Any Method</option>
                                    <option value="instant">Instant Book</option>
                                    <option value="standard">Standard Book</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPrimitive.Content>
        </DialogPrimitive.Root>
    );
}
