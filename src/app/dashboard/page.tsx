import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Play, Settings } from 'lucide-react'

export default function DashboardPage() {
    return (
        <div className="space-y-8">

            {/* Stats / Status Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Scanners</CardTitle>
                        <Play className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Monitoring 0 routes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loads Found</CardTitle>
                        <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">+0 in last hour</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 ">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>CloudTrucks Credentials</CardTitle>
                        <CardDescription>
                            Connect your CloudTrucks account to start scanning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center p-6 border-2 border-dashed rounded-lg">
                            <Button>Connect CloudTrucks Account</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No recent activity.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
