'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Mic, MicOff, Volume2, HelpCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Voice command types
type VoiceCommand =
    | 'scan_market'
    | 'show_hot_loads'
    | 'show_instant'
    | 'filter_all'
    | 'open_calendar'
    | 'show_settings'
    | 'sort_price_high'
    | 'sort_price_low'
    | 'sort_rpm'
    | 'scroll_down'
    | 'scroll_up'
    | 'help'
    | 'unknown'

interface VoiceCommandResult {
    command: VoiceCommand
    transcript: string
    confidence: number
}

// Parse voice transcript to command
function parseVoiceCommand(transcript: string): VoiceCommandResult {
    const lower = transcript.toLowerCase().trim()

    // Command patterns
    const patterns: Array<{ pattern: RegExp; command: VoiceCommand }> = [
        { pattern: /scan|search|find loads|refresh/i, command: 'scan_market' },
        { pattern: /hot loads?|high value|best loads/i, command: 'show_hot_loads' },
        { pattern: /instant|quick book/i, command: 'show_instant' },
        { pattern: /show all|all loads|clear filter/i, command: 'filter_all' },
        { pattern: /calendar|schedule|dates/i, command: 'open_calendar' },
        { pattern: /settings|config|preferences/i, command: 'show_settings' },
        { pattern: /sort.*price.*high|highest price|best paying/i, command: 'sort_price_high' },
        { pattern: /sort.*price.*low|lowest price|cheapest/i, command: 'sort_price_low' },
        { pattern: /sort.*rpm|rate per mile|best rate/i, command: 'sort_rpm' },
        { pattern: /scroll down|next|more/i, command: 'scroll_down' },
        { pattern: /scroll up|back|previous/i, command: 'scroll_up' },
        { pattern: /help|commands|what can/i, command: 'help' },
    ]

    for (const { pattern, command } of patterns) {
        if (pattern.test(lower)) {
            return { command, transcript, confidence: 0.9 }
        }
    }

    return { command: 'unknown', transcript, confidence: 0 }
}

// Available commands for help display
const availableCommands = [
    { command: '"Scan market"', description: 'Search for new loads' },
    { command: '"Show hot loads"', description: 'Filter to high-value loads' },
    { command: '"Show instant"', description: 'Filter to instant book loads' },
    { command: '"Show all"', description: 'Clear filters' },
    { command: '"Open calendar"', description: 'View load calendar' },
    { command: '"Sort by price"', description: 'Sort loads by rate' },
    { command: '"Sort by RPM"', description: 'Sort by rate per mile' },
    { command: '"Scroll down"', description: 'See more loads' },
    { command: '"Help"', description: 'Show available commands' },
]

interface VoiceCommandsProps {
    onCommand: (command: VoiceCommand) => void
    isEnabled?: boolean
}

export function VoiceCommands({ onCommand, isEnabled = true }: VoiceCommandsProps) {
    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(true)
    const [transcript, setTranscript] = useState('')
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle')
    const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null)
    const [showHelp, setShowHelp] = useState(false)

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

    // Speak confirmation using Web Speech API
    const speakConfirmation = useCallback((command: VoiceCommand) => {
        if (!('speechSynthesis' in window)) return

        const messages: Record<VoiceCommand, string> = {
            scan_market: 'Scanning market for new loads',
            show_hot_loads: 'Showing hot loads',
            show_instant: 'Filtering to instant book loads',
            filter_all: 'Showing all loads',
            open_calendar: 'Opening calendar',
            show_settings: 'Opening settings',
            sort_price_high: 'Sorting by highest price',
            sort_price_low: 'Sorting by lowest price',
            sort_rpm: 'Sorting by rate per mile',
            scroll_down: 'Scrolling down',
            scroll_up: 'Scrolling up',
            help: 'Showing available commands',
            unknown: 'Command not recognized'
        }

        const utterance = new SpeechSynthesisUtterance(messages[command])
        utterance.rate = 1.1
        utterance.pitch = 1
        window.speechSynthesis.speak(utterance)
    }, [])

    // Check for browser support
    useEffect(() => {
        if (typeof window === 'undefined') return

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            setIsSupported(false)
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
            setStatus('listening')
            setTranscript('')
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const current = event.resultIndex
            const result = event.results[current]
            const transcriptText = result[0].transcript

            setTranscript(transcriptText)

            if (result.isFinal) {
                setStatus('processing')
                const commandResult = parseVoiceCommand(transcriptText)
                setLastCommand(commandResult)

                if (commandResult.command !== 'unknown') {
                    setStatus('success')
                    onCommand(commandResult.command)

                    // Speak confirmation
                    speakConfirmation(commandResult.command)
                } else {
                    setStatus('error')
                }

                // Reset after delay
                setTimeout(() => {
                    setStatus('idle')
                    setIsListening(false)
                }, 2000)
            }
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error)
            setStatus('error')
            setIsListening(false)
        }

        recognition.onend = () => {
            if (isListening && status === 'listening') {
                // Restart if still supposed to be listening
                try {
                    recognition.start()
                } catch (e) {
                    // Ignore if already started
                }
            }
        }

        recognitionRef.current = recognition

        return () => {
            recognition.abort()
        }
    }, [isListening, status, onCommand, speakConfirmation])

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return

        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
            setStatus('idle')
        } else {
            try {
                recognitionRef.current.start()
                setIsListening(true)
            } catch (e) {
                console.error('Failed to start recognition:', e)
            }
        }
    }, [isListening])

    if (!isSupported || !isEnabled) {
        return null
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    variant={isListening ? "default" : "outline"}
                    size="sm"
                    onClick={toggleListening}
                    className={cn(
                        "gap-2 transition-all",
                        isListening && "bg-rose-500 hover:bg-rose-600 animate-pulse"
                    )}
                >
                    {isListening ? (
                        <MicOff className="h-4 w-4" />
                    ) : (
                        <Mic className="h-4 w-4" />
                    )}
                    {isListening ? 'Listening...' : 'Voice'}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowHelp(true)}
                >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>

            {/* Listening Overlay */}
            {isListening && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 p-4 bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl min-w-[300px]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                            "p-2 rounded-full",
                            status === 'listening' && "bg-rose-500/20 animate-pulse",
                            status === 'processing' && "bg-amber-500/20",
                            status === 'success' && "bg-emerald-500/20",
                            status === 'error' && "bg-rose-500/20"
                        )}>
                            {status === 'listening' && <Mic className="h-5 w-5 text-rose-500" />}
                            {status === 'processing' && <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />}
                            {status === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                            {status === 'error' && <XCircle className="h-5 w-5 text-rose-500" />}
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium">
                                {status === 'listening' && 'Listening...'}
                                {status === 'processing' && 'Processing...'}
                                {status === 'success' && 'Command recognized!'}
                                {status === 'error' && 'Command not recognized'}
                            </div>
                            {transcript && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    &quot;{transcript}&quot;
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Voice Waveform Visualization */}
                    {status === 'listening' && (
                        <div className="flex items-center justify-center gap-1 h-8">
                            {[10, 20, 15, 25, 12].map((height, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-rose-500 rounded-full animate-pulse"
                                    style={{
                                        height: `${height}px`,
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                        Try saying &quot;Show hot loads&quot; or &quot;Scan market&quot;
                    </p>
                </div>
            )}

            {/* Help Dialog */}
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Volume2 className="h-5 w-5" />
                            Voice Commands
                        </DialogTitle>
                        <DialogDescription>
                            Use voice commands for hands-free control while driving.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-4">
                        {availableCommands.map((cmd, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                            >
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {cmd.command}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {cmd.description}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Tap the microphone button and speak clearly. Commands work best in quiet environments.
                    </p>
                </DialogContent>
            </Dialog>
        </>
    )
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
    resultIndex: number
    results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
    error: string
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
}

interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
    length: number
}

interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

interface SpeechRecognitionInstance {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: (() => void) | null
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
    abort: () => void
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionConstructor
        webkitSpeechRecognition: SpeechRecognitionConstructor
    }
}
