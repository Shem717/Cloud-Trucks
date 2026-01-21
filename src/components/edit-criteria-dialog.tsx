'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
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
}

interface EditCriteriaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    criteria: EnrichedCriteria;
    onSuccess: () => void;
}

// Reused styles
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{children}</label>
);

const inputStyles = "bg-slate-900/50 border-slate-600 h-10 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm rounded-md placeholder:text-slate-600";

export function EditCriteriaDialog({ open, onOpenChange, criteria, onSuccess }: EditCriteriaDialogProps) {
    const [submitting, setSubmitting] = useState(false);

    // State for controlled inputs
    const [originState, setOriginState] = useState(criteria.origin_state || "");
    const [destStates, setDestStates] = useState<string[]>(
        Array.isArray(criteria.destination_states)
            ? criteria.destination_states
            : typeof criteria.destination_states === 'string'
                ? [criteria.destination_states]
                : criteria.destination_state
                    ? [criteria.destination_state]
                    : []
    );

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
        updates.origin_state = formData.get('origin_state');

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

        const rawMaxWeight = formData.get('max_weight');
        updates.max_weight = rawMaxWeight ? parseInt(rawMaxWeight as string) : null;

        // Date
        const rawDate = formData.get('pickup_date') as string;
        updates.pickup_date = rawDate || null;

        // Enums
        const equip = formData.get('equipment_type');
        updates.equipment_type = equip === 'Any' ? null : equip;

        const booking = formData.get('booking_type');
        updates.booking_type = booking === 'Any' ? null : booking;

        try {
            const res = await fetch('/api/criteria', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    id: criteria.id,
                    updates
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update scout');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-200">
                <DialogHeader>
                    <DialogTitle>Edit Scout</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit} className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Origin Group */}
                        <div className="flex-1">
                            <FieldLabel>Pickup (City & State)</FieldLabel>
                            <div className="flex gap-2">
                                <CityAutocomplete
                                    name="origin_city"
                                    defaultValue={criteria.origin_city}
                                    required
                                    onStateChange={(st) => setOriginState(st)}
                                    className="flex-[2]"
                                />
                                <div className="flex-1 w-[60px]">
                                    <Input
                                        name="origin_state"
                                        value={originState}
                                        onChange={(e) => setOriginState(e.target.value.toUpperCase().slice(0, 2))}
                                        placeholder="ST"
                                        maxLength={2}
                                        required
                                        className={cn(inputStyles, "text-center font-bold uppercase")}
                                    />
                                </div>
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

                    <div className="grid grid-cols-3 gap-4">
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

                        {/* Date */}
                        <div>
                            <FieldLabel>Date</FieldLabel>
                            <div className="relative">
                                <Input
                                    type="date"
                                    name="pickup_date"
                                    defaultValue={criteria.pickup_date ? new Date(criteria.pickup_date).toISOString().split('T')[0] : ''}
                                    className={cn(inputStyles, "pl-10 appearance-none")}
                                    style={{ colorScheme: 'dark' }}
                                />
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
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
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
            </DialogContent>
        </Dialog>
    );
}
