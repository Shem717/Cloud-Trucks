'use client'

import { useEffect, useState } from 'react'
import { SearchCriteriaForm } from "@/components/search-criteria-form"
import { DashboardFeed } from "@/components/dashboard-feed"

interface DashboardWrapperProps {
    isPublic?: boolean;
}

export function DashboardWrapper({ isPublic = false }: DashboardWrapperProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [guestReady, setGuestReady] = useState(!isPublic)

    const handleCriteriaAdded = () => {
        // Increment trigger to force re-fetch in feed
        setRefreshTrigger(prev => prev + 1)
    }

    useEffect(() => {
        if (!isPublic) return;

        let isCancelled = false;

        const bootstrapGuestSession = async () => {
            try {
                await fetch('/api/guest/session', { cache: 'no-store' });
            } finally {
                if (!isCancelled) {
                    setGuestReady(true);
                }
            }
        };

        bootstrapGuestSession();

        return () => {
            isCancelled = true;
        };
    }, [isPublic]);

    if (!guestReady) {
        return (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                Preparing guest sandbox session...
            </div>
        );
    }

    return (
        <>
            {/* Search Bar (Horizontal) */}
            <SearchCriteriaForm onSuccess={handleCriteriaAdded} />

            {/* Application Feed */}
            <DashboardFeed refreshTrigger={refreshTrigger} isPublic={isPublic} />
        </>
    )
}
