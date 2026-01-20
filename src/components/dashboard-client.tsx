'use client'

import type { ReactNode } from 'react'
import { SearchCriteriaForm } from './search-criteria-form'
import { DashboardFeed } from './dashboard-feed'
import { SearchCriteria } from '@/workers/cloudtrucks-api-client'

interface DashboardClientProps {
    onCriteriaAdded?: (criteria: SearchCriteria) => void
}

export function DashboardClient() {
    return (
        <>
            {/* Search Bar (Horizontal) */}
            <SearchCriteriaForm onSuccess={(criteria) => {
                // The form will trigger a success callback with the new criteria
                // DashboardFeed will handle this via its own useEffect watching the criteria API
                // For now, we'll just let the natural refetch handle it
                // Future: Can add optimistic update here
            }} />

            {/* Dashboard Feed */}
            <DashboardFeed />
        </>
    )
}

