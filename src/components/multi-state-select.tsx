'use client'

import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

    // Derived state handles the controlled/uncontrolled switch automatically
    const selectedStates = value ? new Set(value) : internalState;

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
        <Popover open={open} onOpenChange={setOpen}>
            <input type="hidden" name={name} value={Array.from(selectedStates).join(',')} />
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                        "w-full justify-between text-left font-normal bg-slate-900/50 border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 transition-colors",
                        className
                    )}
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
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[400px] p-0 border-slate-700/50 bg-slate-900/40 backdrop-blur-xl shadow-2xl"
                align="start"
                side="bottom"
                sideOffset={4}
            >
                <div>
                    {/* Region Quick Select */}
                    <div className="p-4 border-b border-slate-700/50 bg-slate-900/20">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                            Quick Regions
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {US_REGIONS.map(region => {
                                const selectedCount = region.states.filter(state => selectedStates.has(state)).length;
                                const allSelected = selectedCount === region.states.length;
                                const someSelected = selectedCount > 0 && selectedCount < region.states.length;

                                return (
                                    <button
                                        key={region.id}
                                        type="button"
                                        className={cn(
                                            "h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded border transition-all duration-200",
                                            allSelected
                                                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-500"
                                                : someSelected
                                                    ? "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                                                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200"
                                        )}
                                        onClick={() => toggleRegion(region)}
                                    >
                                        {region.name}
                                        {someSelected && (
                                            <span className="ml-1 opacity-70">({selectedCount})</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected States Display */}
                    {selectedStates.size > 0 && (
                        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    Selected ({selectedStates.size})
                                </div>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                                {Array.from(selectedStates).sort().map(state => (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={(e) => removeState(state, e)}
                                        className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-500/50 text-slate-200 hover:text-red-200 rounded text-[11px] font-medium transition-all"
                                    >
                                        <span>{state}</span>
                                        <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main State List */}
                    <div className="h-[280px] overflow-y-auto p-2 bg-slate-950/30">
                        <div className="grid grid-cols-2 gap-1">
                            {US_STATES.map(state => {
                                const isSelected = selectedStates.has(state.value);
                                return (
                                    <div
                                        key={state.value}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-all duration-150 group",
                                            isSelected
                                                ? "bg-blue-600/10 border border-blue-500/20"
                                                : "hover:bg-slate-800/50 border border-transparent hover:border-slate-700"
                                        )}
                                        onClick={() => toggleState(state.value)}
                                    >
                                        <div className={cn(
                                            "h-4 w-4 border rounded flex items-center justify-center transition-all duration-200",
                                            isSelected
                                                ? "bg-blue-600 border-blue-500 shadow-sm"
                                                : "border-slate-600 group-hover:border-slate-500 bg-slate-900/50"
                                        )}>
                                            {isSelected && (
                                                <Check className="h-3 w-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-sm font-medium leading-none",
                                                isSelected ? "text-blue-100" : "text-slate-300"
                                            )}>
                                                {state.value}
                                            </span>
                                            <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                                                {state.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
