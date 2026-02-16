'use client'

import React, { useState } from 'react'
import { Map, List, Globe } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CityAutocomplete } from "@/components/city-autocomplete"
import { MultiStateSelect } from "@/components/multi-state-select"
import { cn } from "@/lib/utils"

interface DestinationSearchProps {
    type: 'city' | 'states' | 'regions';
    onTypeChange: (type: 'city' | 'states' | 'regions') => void;
    cityValue: string;
    onCityChange: (val: string) => void;
    statesValue: string[];
    onStatesChange: (val: string[]) => void;
}

export function DestinationSearch({
    type,
    onTypeChange,
    cityValue,
    onCityChange,
    statesValue,
    onStatesChange
}: DestinationSearchProps) {
    return (
        <div className="p-2 w-[340px]">
            <Tabs defaultValue={type} onValueChange={(v) => onTypeChange(v as any)} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4 bg-secondary/30">
                    <TabsTrigger value="city" className="text-xs font-medium">City</TabsTrigger>
                    <TabsTrigger value="states" className="text-xs font-medium">States / Regions</TabsTrigger>
                </TabsList>

                <TabsContent value="city" className="space-y-3 mt-0">
                    <div className="p-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Destination City</label>
                        <CityAutocomplete
                            name="dest_search_input"
                            value={cityValue}
                            onValueChange={onCityChange}
                            placeholder="City or Zip Code"
                            className="w-full bg-secondary/50 border-secondary-foreground/10"
                        />
                        <p className="text-[10px] text-muted-foreground mt-2">
                            Enter a specific city for precise delivery targeting.
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="states" className="space-y-3 mt-0">
                    <div className="p-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Multi-State Selection</label>
                        <MultiStateSelect
                            name="dest_states_input"
                            placeholder="Select States or Regions..."
                            value={statesValue}
                            onChange={onStatesChange}
                            className="w-full"
                        />
                        <p className="text-[10px] text-muted-foreground mt-2">
                            Select multiple states or preset regions (e.g. Midwest, Tri-State).
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
