import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ConnectForm } from "@/components/connect-form"
import { SearchCriteriaForm } from "@/components/search-criteria-form"
import { DashboardFeed } from "@/components/dashboard-feed"

import { PlusCircle, Play, Truck, Activity, Search } from 'lucide-react'

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

    // Fetch stats
    const { count: criteriaCount } = await supabase
        .from('search_criteria')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('active', true)

    const { count: loadsCount } = await supabase
        .from('found_loads')
        .select(`
            *,
            search_criteria!inner(user_id)
        `, { count: 'exact', head: true })
        .eq('search_criteria.user_id', user?.id)

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
                        <CardTitle className="text-sm font-medium">Active Searches</CardTitle>
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{criteriaCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Automated scan criteria</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loads Found</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadsCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Matching your criteria</p>
                    </CardContent>
                </Card>
            </div>

            {/* Connection Card */}
            {!isConnected && (
                <Card>
                    <CardHeader>
                        <CardTitle>CloudTrucks Account</CardTitle>
                        <CardDescription>
                            Connect your CloudTrucks account to begin automated load scanning.
                        </CardDescription>
                    </CardHeader>
                    <ConnectForm />
                </Card>
            )}

            {isConnected && (
                <>
                    {/* Search Bar (Horizontal) */}
                    <SearchCriteriaForm />

                    {/* NEW: Legendary Dashboard Feed (Replaces CriteriaList + LoadsList) */}
                    <DashboardFeed />
                </>
            )}
        </div>
    )
}
