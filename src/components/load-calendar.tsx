'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    MapPin,
    DollarSign,
    Truck,
    Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CloudTrucksLoad } from '@/workers/cloudtrucks-api-client'

interface SavedLoad {
    id: string
    details: CloudTrucksLoad & Record<string, any>
    created_at: string
    status?: string
    cloudtrucks_load_id?: string
}

interface CalendarDay {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    loads: SavedLoad[]
}

// Get days for a month view
function getCalendarDays(year: number, month: number, loads: SavedLoad[]): CalendarDay[] {
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Start from Sunday of the first week
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    // End on Saturday of the last week
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    // Group loads by pickup date
    const loadsByDate = new Map<string, SavedLoad[]>()
    loads.forEach(load => {
        const pickupDate = load.details.pickup_date || load.details.origin_pickup_date
        if (pickupDate) {
            const dateKey = new Date(pickupDate).toDateString()
            if (!loadsByDate.has(dateKey)) loadsByDate.set(dateKey, [])
            loadsByDate.get(dateKey)!.push(load)
        }
    })

    // Generate all days
    const current = new Date(startDate)
    while (current <= endDate) {
        const dateKey = current.toDateString()
        days.push({
            date: new Date(current),
            isCurrentMonth: current.getMonth() === month,
            isToday: current.toDateString() === today.toDateString(),
            loads: loadsByDate.get(dateKey) || []
        })
        current.setDate(current.getDate() + 1)
    }

    return days
}

interface LoadCalendarProps {
    loads: SavedLoad[]
    onSelectLoad?: (load: SavedLoad) => void
    className?: string
}

export function LoadCalendar({ loads, onSelectLoad, className }: LoadCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const days = useMemo(() => getCalendarDays(year, month, loads), [year, month, loads])

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const goToToday = () => {
        setCurrentDate(new Date())
    }

    // Stats for current month
    const monthStats = useMemo(() => {
        const monthLoads = days
            .filter(d => d.isCurrentMonth)
            .flatMap(d => d.loads)

        const totalValue = monthLoads.reduce((sum, l) => {
            const rate = typeof l.details.rate === 'string' ? parseFloat(l.details.rate) : l.details.rate
            return sum + (rate || 0)
        }, 0)

        const instantCount = monthLoads.filter(l => l.details.instant_book === true).length

        return {
            totalLoads: monthLoads.length,
            totalValue,
            instantCount,
            daysWithLoads: days.filter(d => d.isCurrentMonth && d.loads.length > 0).length
        }
    }, [days])

    return (
        <Card className={cn("p-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Load Calendar</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                    <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-36 text-center">{monthName}</span>
                    <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/30 rounded-lg text-xs">
                <div className="text-center">
                    <div className="text-muted-foreground">Loads</div>
                    <div className="font-bold text-lg">{monthStats.totalLoads}</div>
                </div>
                <div className="text-center">
                    <div className="text-muted-foreground">Value</div>
                    <div className="font-bold text-lg text-emerald-500">
                        ${Math.round(monthStats.totalValue / 1000)}k
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-muted-foreground">Instant</div>
                    <div className="font-bold text-lg text-amber-500">{monthStats.instantCount}</div>
                </div>
                <div className="text-center">
                    <div className="text-muted-foreground">Active Days</div>
                    <div className="font-bold text-lg">{monthStats.daysWithLoads}</div>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <button
                        key={index}
                        onClick={() => day.loads.length > 0 && setSelectedDay(day)}
                        className={cn(
                            "aspect-square p-1 rounded-lg text-sm relative transition-all",
                            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                            !day.isCurrentMonth && "text-muted-foreground/40",
                            day.isToday && "ring-2 ring-primary",
                            day.loads.length > 0 && "cursor-pointer"
                        )}
                    >
                        <span className={cn(
                            "block w-6 h-6 rounded-full leading-6 mx-auto text-xs",
                            day.isToday && "bg-primary text-primary-foreground"
                        )}>
                            {day.date.getDate()}
                        </span>
                        {day.loads.length > 0 && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {day.loads.length <= 3 ? (
                                    day.loads.map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    ))
                                ) : (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[8px] text-emerald-500 font-bold">+{day.loads.length - 2}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Day Detail Modal */}
            <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            {selectedDay?.date.toLocaleDateString('default', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {selectedDay?.loads.map((load) => {
                            const d = load.details
                            const rate = typeof d.rate === 'string' ? parseFloat(d.rate) : d.rate
                            const dist = typeof d.distance === 'string' ? parseFloat(d.distance) : d.distance

                            return (
                                <div
                                    key={load.id}
                                    className="p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                    onClick={() => {
                                        onSelectLoad?.(load)
                                        setSelectedDay(null)
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="h-3 w-3 text-emerald-500" />
                                                <span className="font-medium truncate">
                                                    {d.origin_city}, {d.origin_state}
                                                </span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="font-medium truncate">
                                                    {d.dest_city}, {d.dest_state}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Truck className="h-3 w-3" />
                                                    {dist} mi
                                                </span>
                                                {d.instant_book && (
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                                        <Zap className="h-2 w-2 mr-0.5" />
                                                        Instant
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-500">
                                                ${rate?.toLocaleString()}
                                            </div>
                                            {rate && dist && (
                                                <div className="text-[10px] text-muted-foreground">
                                                    ${(rate / dist).toFixed(2)}/mi
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

// Compact calendar toggle button
interface CalendarToggleProps {
    loads: SavedLoad[]
    onSelectLoad?: (load: SavedLoad) => void
}

export function CalendarToggle({ loads, onSelectLoad }: CalendarToggleProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Count loads with pickup dates
    const loadsWithDates = loads.filter(l =>
        l.details.pickup_date || l.details.origin_pickup_date
    ).length

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsOpen(true)}
            >
                <CalendarIcon className="h-4 w-4" />
                Calendar
                {loadsWithDates > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                        {loadsWithDates}
                    </Badge>
                )}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Load Calendar</DialogTitle>
                    <LoadCalendar
                        loads={loads}
                        onSelectLoad={(load) => {
                            onSelectLoad?.(load)
                            setIsOpen(false)
                        }}
                        className="border-0 rounded-none"
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
