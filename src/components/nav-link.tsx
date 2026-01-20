'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
    href: string
    children: React.ReactNode
}

export function NavLink({ href, children }: NavLinkProps) {
    const pathname = usePathname()

    // Exact match for /dashboard, startsWith for sub-routes
    const isActive = href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            {children}
        </Link>
    )
}
