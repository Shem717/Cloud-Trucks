'use server'

import { createClient } from '@/utils/supabase/server'
import { encryptCredentials } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function saveCredentials(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    const email = formData.get('email') as string
    const cookie = formData.get('cookie') as string

    if (!email || !cookie) {
        return { error: 'Email and Session Cookie are required' }
    }

    try {
        // 2. Encrypt sensitive data using AES-256-GCM
        // We reuse the encryptCredentials function, passing cookie as the "password"/secret
        const { encryptedEmail, encryptedPassword: encryptedCookie } = await encryptCredentials(email, cookie)

        // 3. Upsert into database
        const { error } = await supabase
            .from('cloudtrucks_credentials')
            .upsert({
                user_id: user.id,
                encrypted_email: encryptedEmail,
                encrypted_session_cookie: encryptedCookie,
                last_validated_at: new Date().toISOString(),
                is_valid: true // Assume valid until worker proves otherwise
            })

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: 'Credentials saved securely.' }

    } catch (error: any) {
        console.error('Credential Save Error:', error)
        return { error: 'Failed to save credentials. Please try again.' }
    }
}

export async function disconnectAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('cloudtrucks_credentials').delete().eq('user_id', user.id)
    revalidatePath('/dashboard')
}
