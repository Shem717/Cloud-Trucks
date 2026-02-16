'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const routeLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    interested: 'Saved Loads',
    market: 'Market',
    routes: 'Route Planning',
    calendar: 'Calendar',
    settings: 'Settings',
    debugger: 'Debugger',
}

export function Breadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname()

    // Don't show breadcrumbs on dashboard root
    if (pathname === '/dashboard' || pathname === '/') {
        return null
    }

    const segments = pathname.split('/').filter(Boolean)

    // Build breadcrumb items
    const items: { label: string; href: string; isLast: boolean }[] = []

    // Always start with Dashboard
    items.push({
        label: 'Dashboard',
        href: '/dashboard',
        isLast: false
    })

    // Add remaining segments
    let currentPath = ''
    segments.forEach((segment, index) => {
        currentPath += `/${segment}`

        // Skip 'dashboard' since we already added it
        if (segment === 'dashboard') return

        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        items.push({
            label,
            href: currentPath,
            isLast
        })
    })

    // If we only have Dashboard, don't show breadcrumbs
    if (items.length <= 1) {
        return null
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn(
                "flex items-center gap-1.5 text-sm text-muted-foreground mb-4",
                className
            )}
        >
            <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>

            {items.slice(1).map((item, index) => (
                <span key={item.href} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    {item.isLast ? (
                        <span className="font-medium text-foreground">
                            {item.label}
                        </span>
                    ) : (
                        <Link
                            href={item.href}
                            className="hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    )
}
