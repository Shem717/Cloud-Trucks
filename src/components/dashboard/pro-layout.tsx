"use client"

import React from 'react'
import { cn } from "@/lib/utils"

export function ProLayout({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex h-[calc(100vh-60px)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background", className)}>
            {children}
        </div>
    )
}

export function ProSidebar({
    defaultSize = 20,
    minSize = 15,
    maxSize = 30,
    children,
    className
}: {
    defaultSize?: number
    minSize?: number
    maxSize?: number
    children: React.ReactNode
    className?: string
}) {
    // Static width approx 260px (20% of 1300px)
    // Hidden on mobile, valid on desktop
    return (
        <aside className={cn("hidden md:flex w-[240px] flex-shrink-0 border-r border-white/5 h-full flex-col bg-background/50 backdrop-blur-md", className)}>
            {children}
        </aside>
    )
}

export function ProMain({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <main className={cn("flex-1 h-full overflow-hidden flex flex-col relative", className)}>
            {children}
        </main>
    )
}

export function ProDetailPanel({
    defaultSize = 25,
    minSize = 20,
    maxSize = 40,
    children,
    className
}: {
    defaultSize?: number
    minSize?: number
    maxSize?: number
    children: React.ReactNode
    className?: string
}) {
    // Static width approx 350px
    // Hidden on mobile, valid on desktop
    return (
        <aside className={cn("hidden lg:flex w-[320px] flex-shrink-0 border-l border-white/5 h-full flex-col bg-background/50 backdrop-blur-md", className)}>
            {children}
        </aside>
    )
}
