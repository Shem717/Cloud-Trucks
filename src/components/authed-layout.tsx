import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { NavLink } from '@/components/nav-link'

export default async function AuthedLayout({
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
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 h-6 w-6 rounded-md flex items-center justify-center">
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h1 className="font-bold text-lg tracking-tight">CloudTrucks Scout</h1>
                        </div>
                        <nav className="hidden md:flex items-center gap-1">
                            <NavLink href="/dashboard">Dashboard</NavLink>
                            <NavLink href="/interested">Interested</NavLink>
                            <NavLink href="/routes">Routes</NavLink>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
                        <form action={signout}>
                            <Button variant="ghost" size="sm">Sign Out</Button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}
