import AuthedLayout from '@/components/authed-layout'
import { RouteBuilderProvider, RouteBuilderToggle } from '@/components/route-builder'
import { HOSProvider } from '@/components/hos-tracker'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthedLayout>
            <HOSProvider>
                <RouteBuilderProvider>
                    {children}
                    <RouteBuilderToggle />
                </RouteBuilderProvider>
            </HOSProvider>
        </AuthedLayout>
    )
}
