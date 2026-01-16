'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [loads, setLoads] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [criteria, setCriteria] = useState({
        origin_city: 'Chicago',
        origin_state: 'IL',
        pickup_distance: 100,
        dest_city: '',
        destination_state: '',
        pickup_date: new Date().toISOString().split('T')[0],
        equipment_type: 'Dry Van', // Default
    });

    const runTest = async () => {
        setLoading(true);
        setError(null);
        setLogs(['Starting test request...']);
        setLoads([]);

        try {
            const response = await fetch('/api/test/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteria }),
            });

            const data = await response.json();

            if (data.logs) {
                setLogs(data.logs);
            }

            if (data.success) {
                setLoads(data.loads);
                setLogs(prev => [...prev, `Found ${data.loads.length} loads!`]);
            } else {
                setError(data.error);
                setLogs(prev => [...prev, `ERROR: ${data.error}`]);
            }

        } catch (e: any) {
            setError(e.message);
            setLogs(prev => [...prev, `FATAL: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">API Integration Debugger</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Test Search Criteria</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Origin City</Label>
                                <Input
                                    value={criteria.origin_city}
                                    onChange={e => setCriteria({ ...criteria, origin_city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>State</Label>
                                <Input
                                    value={criteria.origin_state}
                                    onChange={e => setCriteria({ ...criteria, origin_state: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Deadhead (miles)</Label>
                            <Input
                                type="number"
                                value={criteria.pickup_distance}
                                onChange={e => setCriteria({ ...criteria, pickup_distance: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Pickup Date</Label>
                            <Input
                                type="date"
                                value={criteria.pickup_date}
                                onChange={e => setCriteria({ ...criteria, pickup_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Equipment Type</Label>
                            <Input
                                value={criteria.equipment_type}
                                onChange={e => setCriteria({ ...criteria, equipment_type: e.target.value })}
                                placeholder="Dry Van, Power Only"
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={runTest}
                            disabled={loading}
                        >
                            {loading ? 'Running Scan...' : 'Run Test Scan'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="h-[500px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Real-time Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto bg-black text-green-400 font-mono text-xs p-4 rounded-b-lg">
                        {error && <div className="text-red-500 font-bold mb-2">Error: {error}</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1">
                                <span className="text-gray-500">[{i}]</span> {log}
                            </div>
                        ))}
                        {logs.length === 0 && <span className="text-gray-600">No logs yet. Run a test to see output.</span>}
                    </CardContent>
                </Card>
            </div>

            {loads.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Discovered Loads ({loads.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Origin</th>
                                        <th className="text-left p-2">Dest</th>
                                        <th className="text-left p-2">Rate</th>
                                        <th className="text-left p-2">Dist</th>
                                        <th className="text-left p-2">Date</th>
                                        <th className="text-left p-2">Equip</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loads.map((load, i) => (
                                        <tr key={load.id || i} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{load.origin_city}, {load.origin_state}</td>
                                            <td className="p-2">{load.dest_city}, {load.dest_state}</td>
                                            <td className="p-2 font-bold text-green-600">${load.trip_rate}</td>
                                            <td className="p-2">{load.trip_distance_mi} mi</td>
                                            <td className="p-2">{load.origin_pickup_date?.split('T')[0]}</td>
                                            <td className="p-2">{Array.isArray(load.equipment) ? load.equipment.join(', ') : load.equipment}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
