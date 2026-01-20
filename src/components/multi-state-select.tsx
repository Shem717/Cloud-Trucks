'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Check, ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { US_REGIONS, Region } from "@/lib/us-regions"

const US_STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
];

interface MultiStateSelectProps {
    name: string;
    placeholder?: string;
    defaultValue?: string[];
    onChange?: (states: string[]) => void;
    className?: string;
}

export function MultiStateSelect({
    name,
    placeholder = "Select states",
    defaultValue = [],
    onChange,
    className
}: MultiStateSelectProps) {
    const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set(defaultValue));
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleState = (state: string) => {
        const newSet = new Set(selectedStates);
        if (newSet.has(state)) {
            newSet.delete(state);
        } else {
            newSet.add(state);
        }
        setSelectedStates(newSet);
        onChange?.(Array.from(newSet));
    };

    const selectRegion = (region: Region) => {
        const newSet = new Set(selectedStates);
        region.states.forEach(state => newSet.add(state));
        setSelectedStates(newSet);
        onChange?.(Array.from(newSet));
    };

    const clearAll = () => {
        setSelectedStates(new Set());
        onChange?.([]);
    };

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={Array.from(selectedStates).join(',')} />

            <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-left font-normal h-10 bg-slate-900/50 border-slate-600"
                onClick={() => setOpen(!open)}
            >
                {selectedStates.size === 0 ? (
                    <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                    <span>{selectedStates.size} state{selectedStates.size > 1 ? 's' : ''}</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 space-y-2">
                        {/* Region Quick Select */}
                        <div className="text-xs font-semibold text-slate-400 uppercase">Quick Select</div>
                        <div className="flex flex-wrap gap-1">
                            {US_REGIONS.map(region => (
                                <Button
                                    key={region.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs bg-slate-800 border-slate-600 hover:bg-slate-700"
                                    onClick={() => selectRegion(region)}
                                >
                                    {region.name}
                                </Button>
                            ))}
                        </div>

                        {/* Selected States Display */}
                        {selectedStates.size > 0 && (
                            <div className="flex flex-wrap gap-1 pt-2">
                                {Array.from(selectedStates).slice(0, 10).map(state => (
                                    <Badge key={state} variant="secondary" className="gap-1 bg-slate-700 hover:bg-slate-600">
                                        {state}
                                        <X
                                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleState(state);
                                            }}
                                        />
                                    </Badge>
                                ))}
                                {selectedStates.size > 10 && (
                                    <Badge variant="secondary" className="bg-slate-700">
                                        +{selectedStates.size - 10} more
                                    </Badge>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-xs hover:bg-slate-800"
                                    onClick={clearAll}
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* State List */}
                    <div className="max-h-60 overflow-y-auto p-2">
                        {US_STATES.map(state => {
                            const isSelected = selectedStates.has(state.value);
                            return (
                                <div
                                    key={state.value}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-slate-800 transition-colors",
                                        isSelected && "bg-slate-800"
                                    )}
                                    onClick={() => toggleState(state.value)}
                                >
                                    <div className={cn(
                                        "h-4 w-4 border rounded flex items-center justify-center border-slate-600",
                                        isSelected && "bg-blue-600 border-blue-600"
                                    )}>
                                        {isSelected && (
                                            <Check className="h-3 w-3 text-white" />
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-300">{state.value} - {state.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
