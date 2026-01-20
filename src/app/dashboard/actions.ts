'use server'

import { createClient } from '@/utils/supabase/server'
import { encryptCredentials } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'


export async function saveCredentials(prevState: unknown, formData: FormData) {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    const email = formData.get('email') as string
    const cookie = formData.get('cookie') as string
    const csrf = formData.get('csrf') as string

    if (!email || !cookie || !csrf) {
        return { error: 'Email, Session Cookie, and CSRF Token are required' }
    }

    try {
        // 2. Encrypt sensitive data using AES-256-GCM
        const { encryptedEmail, encryptedPassword: encryptedCookie } = await encryptCredentials(email, cookie)
        // Encrypt CSRF token separately
        const { encryptedPassword: encryptedCsrf } = await encryptCredentials('csrf', csrf)

        // 3. Upsert into database
        const { error } = await supabase
            .from('cloudtrucks_credentials')
            .upsert({
                user_id: user.id,
                encrypted_email: encryptedEmail,
                encrypted_session_cookie: encryptedCookie,
                encrypted_csrf_token: encryptedCsrf,
                last_validated_at: new Date().toISOString(),
                is_valid: true // Assume valid until worker proves otherwise
            })

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true, message: 'Connected successfully to CloudTrucks' }
    } catch (error: unknown) {
        console.error('Failed to save credentials:', error)
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Connection failed: ${message}` }
    }
}


export async function disconnectAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('cloudtrucks_credentials').delete().eq('user_id', user.id)
    revalidatePath('/dashboard')
}
