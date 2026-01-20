'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2 } from "lucide-react"

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    details?: unknown;
}

export default function DebuggerPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/logs?limit=100')
            const data = await res.json()
            if (data.logs) {
                setLogs(data.logs as LogEntry[])
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const clearLogs = async () => {
        try {
            await fetch('/api/logs', { method: 'DELETE' })
            setLogs([])
        } catch (error) {
            console.error('Failed to clear logs:', error)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    return (
        <div className="space-y-6 container mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
                    <p className="text-muted-foreground">
                        View internal application logs and debugger events
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="destructive" size="sm" onClick={clearLogs}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Logs</CardTitle>
                    <CardDescription>
                        {logs.length} entries found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {logs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No logs found
                                </p>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${log.level === 'ERROR' ? 'bg-red-100 text-red-700' :
                                                log.level === 'WARN' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {log.level}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-mono mt-1 break-all">
                                            {log.message}
                                        </p>
                                        {!!log.details && (
                                            <pre className="text-xs bg-slate-50 p-2 rounded mt-1 overflow-x-auto text-slate-600">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
