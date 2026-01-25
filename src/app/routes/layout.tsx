import AuthedLayout from '@/components/authed-layout'

export default function RoutesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AuthedLayout>{children}</AuthedLayout>
}
