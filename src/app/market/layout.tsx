import AuthedLayout from '@/components/authed-layout'

export default function MarketLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthedLayout>
            {children}
        </AuthedLayout>
    )
}
