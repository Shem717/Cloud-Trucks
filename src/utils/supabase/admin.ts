import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Server-only Supabase client using the service role key.
 *
 * Use this only in backend code paths where RLS is intentionally bypassed
 * (e.g. cron jobs, background workers, or server-enforced guest sandbox).
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    return createClient<Database>(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
