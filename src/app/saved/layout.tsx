import AuthedLayout from '@/components/authed-layout'
import { RouteBuilderProvider, RouteBuilderToggle } from '@/components/route-builder'

export default function InterestedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthedLayout>
            <RouteBuilderProvider>
                {children}
                <RouteBuilderToggle />
            </RouteBuilderProvider>
        </AuthedLayout>
    )
}
