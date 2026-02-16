'use client'

import React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

interface DateSearchProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    range: DateRange | undefined;
    setRange: (range: DateRange | undefined) => void;
    mode: 'single' | 'range';
    onModeChange: (mode: 'single' | 'range') => void;
}

export function DateSearch({
    date,
    setDate,
    range,
    setRange,
    mode,
    onModeChange
}: DateSearchProps) {
    return (
        <div className="p-0 w-auto">
            <div className="flex items-center p-2 border-b border-border space-x-2">
                <Button
                    variant={mode === 'single' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onModeChange('single')}
                    className="text-xs h-7"
                >
                    Specific Date
                </Button>
                <Button
                    variant={mode === 'range' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onModeChange('range')}
                    className="text-xs h-7"
                >
                    Date Range
                </Button>
            </div>
            <div className="p-2">
                {mode === 'single' ? (
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="rounded-md border-0"
                    />
                ) : (
                    <Calendar
                        mode="range"
                        selected={range}
                        onSelect={setRange}
                        numberOfMonths={2}
                        initialFocus
                        className="rounded-md border-0"
                    />
                )}
            </div>
        </div>
    )
}
