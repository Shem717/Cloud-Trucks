'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Check, ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
    value?: string[]; // Controlled value
    onChange?: (states: string[]) => void;
    className?: string;
}

export function MultiStateSelect({
    name,
    placeholder = "Select states",
    defaultValue = [],
    value,
    onChange,
    className
}: MultiStateSelectProps) {
    const [internalState, setInternalState] = useState<Set<string>>(new Set(defaultValue));
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync with controlled value prop
    useEffect(() => {
        if (value) {
            setInternalState(new Set(value));
        }
    }, [value]);

    const selectedStates = value ? new Set(value) : internalState;

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
        setInternalState(newSet);
        onChange?.(Array.from(newSet));
    };

    const toggleRegion = (region: Region) => {
        const newSet = new Set(selectedStates);
        const allSelected = region.states.every(state => selectedStates.has(state));

        if (allSelected) {
            region.states.forEach(state => newSet.delete(state));
        } else {
            region.states.forEach(state => newSet.add(state));
        }

        setInternalState(newSet);
        onChange?.(Array.from(newSet));
    };

    const removeState = (state: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newSet = new Set(selectedStates);
        newSet.delete(state);
        setInternalState(newSet);
        onChange?.(Array.from(newSet));
    };

    const clearAll = () => {
        setInternalState(new Set());
        onChange?.([]);
    };

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={Array.from(selectedStates).join(',')} />

            <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-left font-normal h-10 bg-slate-900/50 border-slate-600 hover:border-slate-500 transition-colors"
                onClick={() => setOpen(!open)}
            >
                {selectedStates.size === 0 ? (
                    <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                    <span className="font-semibold truncate">
                        {selectedStates.size === 1
                            ? Array.from(selectedStates)[0]
                            : `${selectedStates.size} states`
                        }
                    </span>
                )}
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
            </Button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-[480px] overflow-hidden backdrop-blur-sm">
                    <div className="p-4 space-y-3">
                        {/* Region Quick Select */}
                        <div>
                            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></span>
                                Quick Select
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {US_REGIONS.map(region => {
                                    const selectedCount = region.states.filter(state => selectedStates.has(state)).length;
                                    const allSelected = selectedCount === region.states.length;
                                    const someSelected = selectedCount > 0 && selectedCount < region.states.length;

                                    return (
                                        <Button
                                            key={region.id}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 text-xs font-semibold border transition-all duration-200 hover:scale-105",
                                                allSelected && "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30",
                                                someSelected && "bg-gradient-to-r from-blue-600/60 to-indigo-600/60 text-white border-blue-500/60 hover:from-blue-600/70 hover:to-indigo-600/70",
                                                !allSelected && !someSelected && "bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 hover:border-slate-500"
                                            )}
                                            onClick={() => toggleRegion(region)}
                                            title={someSelected ? `${selectedCount}/${region.states.length} states selected` : undefined}
                                        >
                                            {region.name}
                                            {someSelected && (
                                                <span className="ml-1.5 text-[10px] opacity-90 font-bold">({selectedCount})</span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected States Display */}
                        {selectedStates.size > 0 && (
                            <div className="border-t border-slate-700/50 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
                                        Selected ({selectedStates.size})
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearAll}
                                        className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                                    {Array.from(selectedStates).sort().map(state => (
                                        <button
                                            key={state}
                                            type="button"
                                            onClick={(e) => removeState(state, e)}
                                            className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-red-600 hover:to-red-500 text-white rounded-md text-xs font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                                            title={`Remove ${state}`}
                                        >
                                            <span>{state}</span>
                                            <X className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* State List */}
                    <div className="border-t border-slate-700/50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                        <div className="p-3 space-y-0.5">
                            {US_STATES.map(state => {
                                const isSelected = selectedStates.has(state.value);
                                return (
                                    <div
                                        key={state.value}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-all duration-150",
                                            isSelected
                                                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30"
                                                : "hover:bg-slate-800/50"
                                        )}
                                        onClick={() => toggleState(state.value)}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 border-2 rounded-md flex items-center justify-center transition-all duration-200",
                                            isSelected
                                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500 shadow-lg shadow-blue-500/30"
                                                : "border-slate-600 hover:border-slate-500"
                                        )}>
                                            {isSelected && (
                                                <Check className="h-3.5 w-3.5 text-white animate-in zoom-in duration-150" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium transition-colors",
                                            isSelected ? "text-white" : "text-slate-300"
                                        )}>
                                            {state.value}
                                        </span>
                                        <span className={cn(
                                            "text-xs transition-colors flex-1",
                                            isSelected ? "text-slate-300" : "text-slate-500"
                                        )}>
                                            {state.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
