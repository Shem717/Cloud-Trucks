'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Clock, AlertTriangle, Check, Coffee, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

// Federal HOS Rules (simplified for 11-hour driving / 14-hour on-duty limit)
const MAX_DRIVING_HOURS = 11
const MAX_ON_DUTY_HOURS = 14
const REQUIRED_BREAK_AFTER_HOURS = 8 // 30-min break required after 8 hours
const AVG_SPEED_MPH = 50 // Average highway speed for estimates

interface HOSState {
    drivingHoursUsed: number // Hours driven today
    onDutyHoursUsed: number // Total on-duty hours today
    lastResetTime: Date | null // When was the last 10-hour reset
    isEnabled: boolean
}

interface HOSContextType {
    state: HOSState
    remainingDriving: number
    remainingOnDuty: number
    updateHOS: (updates: Partial<HOSState>) => void
    resetHOS: () => void
    isLoadFeasible: (distanceMiles: number, additionalStopHours?: number) => {
        feasible: boolean
        reason: string
        estimatedDriveTime: number
        needsBreak: boolean
        breakAfterMiles?: number
    }
    isEnabled: boolean
    setEnabled: (enabled: boolean) => void
    showSettings: boolean
    setShowSettings: (show: boolean) => void
}

const HOSContext = createContext<HOSContextType | null>(null)

export function useHOS() {
    const context = useContext(HOSContext)
    if (!context) {
        throw new Error('useHOS must be used within a HOSProvider')
    }
    return context
}

const DEFAULT_STATE: HOSState = {
    drivingHoursUsed: 0,
    onDutyHoursUsed: 0,
    lastResetTime: null,
    isEnabled: false
}

export function HOSProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<HOSState>(DEFAULT_STATE)
    const [showSettings, setShowSettings] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('cloudtrucks_hos')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setState({
                    ...parsed,
                    lastResetTime: parsed.lastResetTime ? new Date(parsed.lastResetTime) : null
                })
            } catch (e) {
                console.error('Failed to parse HOS state:', e)
            }
        }
    }, [])

    // Save to localStorage when state changes
    useEffect(() => {
        localStorage.setItem('cloudtrucks_hos', JSON.stringify(state))
    }, [state])

    const remainingDriving = useMemo(() =>
        Math.max(0, MAX_DRIVING_HOURS - state.drivingHoursUsed),
        [state.drivingHoursUsed]
    )

    const remainingOnDuty = useMemo(() =>
        Math.max(0, MAX_ON_DUTY_HOURS - state.onDutyHoursUsed),
        [state.onDutyHoursUsed]
    )

    const updateHOS = useCallback((updates: Partial<HOSState>) => {
        setState(prev => ({ ...prev, ...updates }))
    }, [])

    const resetHOS = useCallback(() => {
        setState({
            drivingHoursUsed: 0,
            onDutyHoursUsed: 0,
            lastResetTime: new Date(),
            isEnabled: state.isEnabled
        })
    }, [state.isEnabled])

    const setEnabled = useCallback((enabled: boolean) => {
        setState(prev => ({ ...prev, isEnabled: enabled }))
    }, [])

    const isLoadFeasible = useCallback((distanceMiles: number, additionalStopHours: number = 1) => {
        if (!state.isEnabled) {
            return {
                feasible: true,
                reason: 'HOS tracking disabled',
                estimatedDriveTime: distanceMiles / AVG_SPEED_MPH,
                needsBreak: false
            }
        }

        const estimatedDriveTime = distanceMiles / AVG_SPEED_MPH
        const totalTimeNeeded = estimatedDriveTime + additionalStopHours

        // Check driving hours
        if (estimatedDriveTime > remainingDriving) {
            return {
                feasible: false,
                reason: `Need ${estimatedDriveTime.toFixed(1)}h driving, only ${remainingDriving.toFixed(1)}h remaining`,
                estimatedDriveTime,
                needsBreak: true
            }
        }

        // Check on-duty hours
        if (totalTimeNeeded > remainingOnDuty) {
            return {
                feasible: false,
                reason: `Need ${totalTimeNeeded.toFixed(1)}h on-duty, only ${remainingOnDuty.toFixed(1)}h remaining`,
                estimatedDriveTime,
                needsBreak: true
            }
        }

        // Check if 30-min break will be needed
        const hoursUntilBreak = REQUIRED_BREAK_AFTER_HOURS - state.drivingHoursUsed
        const needsBreak = estimatedDriveTime > hoursUntilBreak && hoursUntilBreak > 0
        const breakAfterMiles = needsBreak ? hoursUntilBreak * AVG_SPEED_MPH : undefined

        return {
            feasible: true,
            reason: needsBreak
                ? `OK, but 30-min break required after ${Math.round(breakAfterMiles || 0)} miles`
                : 'Load is feasible within HOS limits',
            estimatedDriveTime,
            needsBreak,
            breakAfterMiles
        }
    }, [state.isEnabled, state.drivingHoursUsed, remainingDriving, remainingOnDuty])

    const value = useMemo(() => ({
        state,
        remainingDriving,
        remainingOnDuty,
        updateHOS,
        resetHOS,
        isLoadFeasible,
        isEnabled: state.isEnabled,
        setEnabled,
        showSettings,
        setShowSettings
    }), [state, remainingDriving, remainingOnDuty, updateHOS, resetHOS, isLoadFeasible, setEnabled, showSettings])

    return (
        <HOSContext.Provider value={value}>
            {children}
            <HOSSettingsDialog />
        </HOSContext.Provider>
    )
}

// Settings Dialog
function HOSSettingsDialog() {
    const { state, updateHOS, resetHOS, remainingDriving, remainingOnDuty, isEnabled, setEnabled, showSettings, setShowSettings } = useHOS()
    const [drivingInput, setDrivingInput] = useState(state.drivingHoursUsed.toString())
    const [onDutyInput, setOnDutyInput] = useState(state.onDutyHoursUsed.toString())

    useEffect(() => {
        setDrivingInput(state.drivingHoursUsed.toString())
        setOnDutyInput(state.onDutyHoursUsed.toString())
    }, [state.drivingHoursUsed, state.onDutyHoursUsed])

    const handleSave = () => {
        const driving = parseFloat(drivingInput) || 0
        const onDuty = parseFloat(onDutyInput) || 0
        updateHOS({
            drivingHoursUsed: Math.min(MAX_DRIVING_HOURS, Math.max(0, driving)),
            onDutyHoursUsed: Math.min(MAX_ON_DUTY_HOURS, Math.max(0, onDuty))
        })
        setShowSettings(false)
    }

    return (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Hours of Service Tracker
                    </DialogTitle>
                    <DialogDescription>
                        Track your driving hours to see which loads are feasible within federal HOS limits.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Enable HOS Tracking</span>
                        <Button
                            variant={isEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEnabled(!isEnabled)}
                        >
                            {isEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                    </div>

                    {isEnabled && (
                        <>
                            {/* Current Status */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <div className="text-xs text-muted-foreground">Driving Remaining</div>
                                    <div className={cn(
                                        "text-2xl font-bold",
                                        remainingDriving <= 2 ? "text-rose-500" : remainingDriving <= 4 ? "text-amber-500" : "text-emerald-500"
                                    )}>
                                        {remainingDriving.toFixed(1)}h
                                    </div>
                                    <div className="text-xs text-muted-foreground">of {MAX_DRIVING_HOURS}h max</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">On-Duty Remaining</div>
                                    <div className={cn(
                                        "text-2xl font-bold",
                                        remainingOnDuty <= 2 ? "text-rose-500" : remainingOnDuty <= 4 ? "text-amber-500" : "text-emerald-500"
                                    )}>
                                        {remainingOnDuty.toFixed(1)}h
                                    </div>
                                    <div className="text-xs text-muted-foreground">of {MAX_ON_DUTY_HOURS}h max</div>
                                </div>
                            </div>

                            {/* Input Fields */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Hours Driven Today</label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max={MAX_DRIVING_HOURS}
                                        value={drivingInput}
                                        onChange={(e) => setDrivingInput(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Total On-Duty Hours Today</label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max={MAX_ON_DUTY_HOURS}
                                        value={onDutyInput}
                                        onChange={(e) => setOnDutyInput(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={resetHOS}>
                                    <Coffee className="h-4 w-4 mr-2" />
                                    10-Hour Reset
                                </Button>
                                <Button className="flex-1" onClick={handleSave}>
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// HOS Badge for LoadCard
interface HOSBadgeProps {
    distanceMiles: number
    size?: 'sm' | 'md'
}

export function HOSBadge({ distanceMiles, size = 'sm' }: HOSBadgeProps) {
    const { isLoadFeasible, isEnabled } = useHOS()

    if (!isEnabled) return null

    const result = isLoadFeasible(distanceMiles)

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 font-mono",
                result.feasible
                    ? result.needsBreak
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : "border-rose-500/30 text-rose-400 bg-rose-500/10",
                size === 'sm' ? "text-[10px]" : "text-xs"
            )}
            title={result.reason}
        >
            {result.feasible ? (
                result.needsBreak ? (
                    <>
                        <Coffee className="h-3 w-3" />
                        Break Req
                    </>
                ) : (
                    <>
                        <Check className="h-3 w-3" />
                        HOS OK
                    </>
                )
            ) : (
                <>
                    <AlertTriangle className="h-3 w-3" />
                    HOS Limit
                </>
            )}
        </Badge>
    )
}

// HOS Button for header/settings
export function HOSSettingsButton() {
    const { setShowSettings, remainingDriving, isEnabled } = useHOS()

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className={cn(
                "gap-2",
                isEnabled && remainingDriving <= 4 && "border-amber-500/30 text-amber-400"
            )}
        >
            <Clock className="h-4 w-4" />
            {isEnabled ? `${remainingDriving.toFixed(1)}h` : 'HOS'}
        </Button>
    )
}
