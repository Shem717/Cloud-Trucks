'use client'

import { useState } from 'react'
import { SearchCriteriaForm } from "@/components/search-criteria-form"
import { DashboardFeed } from "@/components/dashboard-feed"

export function DashboardWrapper() {
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleCriteriaAdded = () => {
        // Increment trigger to force re-fetch in feed
        setRefreshTrigger(prev => prev + 1)
    }

    return (
        <>
            {/* Search Bar (Horizontal) */}
            <SearchCriteriaForm onSuccess={handleCriteriaAdded} />

            {/* Application Feed */}
            <DashboardFeed refreshTrigger={refreshTrigger} />
        </>
    )
}
