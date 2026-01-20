import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ConnectForm } from "@/components/connect-form"
import { DashboardWrapper } from "@/components/dashboard-wrapper"

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

    // Fetch stats - REMOVED (Moved to Client Component for Real-time accuracy)

    return (
        <div className="space-y-8">

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
                <DashboardWrapper />
            )}
        </div>
    )
}
