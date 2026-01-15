import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../auth/actions'
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            <header className="border-b bg-white dark:bg-gray-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="font-bold text-xl tracking-tight">CloudTrucks Scout</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
                    <form action={signout}>
                        <Button variant="ghost" size="sm">Sign Out</Button>
                    </form>
                </div>
            </header>
            <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}
