import { DashboardWrapper } from "@/components/dashboard-wrapper"
import { HOSProvider } from "@/components/hos-tracker"
import { RouteBuilderProvider, RouteBuilderToggle } from "@/components/route-builder"

export default function PublicDashboardPage() {
    return (
        <div className="space-y-8 container mx-auto py-8">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-blue-500 mb-6 flex items-center gap-2">
                <span className="font-bold">Guest Sandbox Mode:</span>
                <span>You are exploring a public sandbox. Any searches or data you create are isolated to your temporary session and will expire.</span>
            </div>

            <HOSProvider>
                <RouteBuilderProvider>
                    <DashboardWrapper isPublic={true} />
                    <RouteBuilderToggle />
                </RouteBuilderProvider>
            </HOSProvider>
        </div>
    )
}
