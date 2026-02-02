'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { US_CITIES, City } from "@/lib/us-cities"

interface CityAutocompleteProps {
    name: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: string;
    value?: string;
    onStateChange?: (state: string) => void;
    className?: string;
}

export function CityAutocomplete({
    name,
    placeholder = "City",
    required = false,
    defaultValue = "",
    value: controlledValue,
    onStateChange,
    className
}: CityAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const [suggestions, setSuggestions] = React.useState<City[]>([])
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Sync internal value with controlled value if provided
    React.useEffect(() => {
        if (controlledValue !== undefined) {
            setInternalValue(controlledValue);
        }
    }, [controlledValue]);

    const value = internalValue;
    const setValue = setInternalValue;

    // On initial load, look up city state and call onStateChange
    React.useEffect(() => {
        if (defaultValue && onStateChange && !controlledValue) {
            const matchedCity = US_CITIES.find(
                city => city.value.toLowerCase() === defaultValue.toLowerCase()
            );
            if (matchedCity) {
                onStateChange(matchedCity.state);
            }
        }
    }, [defaultValue, onStateChange, controlledValue]);

    // Handle outside click to close suggestions
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleInputProto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setValue(val)

        if (val.length < 2) {
            setSuggestions([])
            setOpen(false)
            return
        }

        const filtered = US_CITIES.filter(city =>
            city.value.toLowerCase().includes(val.toLowerCase()) ||
            city.state.toLowerCase().includes(val.toLowerCase())
        ).slice(0, 10) // Limit to 10 suggestions

        setSuggestions(filtered)
        setOpen(filtered.length > 0)
    }

    const selectCity = (city: City) => {
        setValue(city.value)
        if (onStateChange) {
            onStateChange(city.state)
        }
        setOpen(false)
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <Input
                name={name}
                value={value}
                onChange={handleInputProto}
                onFocus={() => value.length >= 2 && setSuggestions(suggestions) && setOpen(true)}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
                className={cn("w-full bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:border-blue-500 h-10 text-slate-900 dark:text-slate-200", className)}
            />

            {open && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((city, index) => (
                        <div
                            key={`${city.value}-${city.state}-${index}`}
                            className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-900 dark:text-slate-200 flex justify-between items-center"
                            onClick={() => selectCity(city)}
                        >
                            <span>{city.value}</span>
                            <span className="text-slate-500 dark:text-slate-500 text-xs">{city.state}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
