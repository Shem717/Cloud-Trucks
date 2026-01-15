import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ConnectForm } from "@/components/connect-form"
import { ConnectedStatus } from "@/components/connected-status"
import { PlusCircle, Play, Truck, Activity } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch connection status
    const { data: credentials } = await supabase
        .from('cloudtrucks_credentials')
        .select('last_validated_at, is_valid')
        .eq('user_id', user?.id)
        .single()

    const isConnected = !!credentials

    return (
        <div className="space-y-8">

            {/* Stats / Status Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <Activity className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isConnected ? 'Online' : 'Offline'}</div>
                        <p className="text-xs text-muted-foreground">{isConnected ? 'System is ready' : 'Connect account to start'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loads Found</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Waiting for search criteria</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Connection Card */}
                <Card className="col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>CloudTrucks Account</CardTitle>
                        <CardDescription>
                            Manage your integration settings.
                        </CardDescription>
                    </CardHeader>
                    {isConnected ? (
                        <ConnectedStatus lastValidated={credentials.last_validated_at} />
                    ) : (
                        <ConnectForm />
                    )}
                </Card>

                {/* Placeholder for Search Criteria or Activity */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 text-sm text-muted-foreground h-[200px] items-center justify-center border-2 border-dashed rounded-md bg-muted/50">
                            <p>No scans performed yet.</p>
                            {isConnected && (
                                <p className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                    Add Search Criteria to begin
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
