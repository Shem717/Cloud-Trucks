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
                "relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 overflow-hidden group",
                isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/10 hover:shadow-md hover:shadow-white/5 hover:backdrop-blur-sm"
            )}
        >
            <span className="relative z-10">{children}</span>
            {/* Glass shine effect on hover */}
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
        </Link>
    )
}
