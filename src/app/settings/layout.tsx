import AuthedLayout from '@/components/authed-layout'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AuthedLayout>{children}</AuthedLayout>
}
