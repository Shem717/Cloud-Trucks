import AuthedLayout from '@/components/authed-layout'

export default function InterestedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AuthedLayout>{children}</AuthedLayout>
}
