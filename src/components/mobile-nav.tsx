'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Star, Map, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileNavProps {
    userEmail?: string
    signOutAction: () => Promise<void>
}

export function MobileNav({ userEmail, signOutAction }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/interested', label: 'Saved Loads', icon: Star },
        { href: '/routes', label: 'Route Planning', icon: Map },
    ]

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard' || pathname === '/'
        }
        return pathname.startsWith(href)
    }

    return (
        <div className="md:hidden">
            {/* Hamburger Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative z-50"
                aria-label="Toggle menu"
            >
                {isOpen ? (
                    <X className="h-5 w-5" />
                ) : (
                    <Menu className="h-5 w-5" />
                )}
            </Button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Menu Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 z-40 h-full w-72 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full pt-20 pb-6 px-4">
                    {/* User Info */}
                    {userEmail && (
                        <div className="px-3 py-4 mb-4 border-b border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Signed in as</p>
                            <p className="text-sm font-medium truncate mt-1">{userEmail}</p>
                        </div>
                    )}

                    {/* Navigation Links */}
                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Sign Out */}
                    <form action={signOutAction} className="mt-auto">
                        <Button
                            type="submit"
                            variant="ghost"
                            className="w-full justify-start gap-3 px-4 py-3 h-auto text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-5 w-5" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
