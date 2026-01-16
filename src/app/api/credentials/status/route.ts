import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decrypt } from '@/lib/crypto';
import { testApiConnection } from '@/workers/cloudtrucks-api-client';

/**
 * GET /api/credentials/status - Check if user's CloudTrucks credentials are valid
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's credentials
        const { data: creds, error: credError } = await supabase
            .from('cloudtrucks_credentials')
            .select('is_valid, last_validated_at, encrypted_session_cookie, encrypted_csrf_token')
            .eq('user_id', user.id)
            .single();

        if (credError || !creds) {
            return NextResponse.json({
                hasCredentials: false,
                isValid: false,
                message: 'No CloudTrucks credentials found. Please connect your account.',
            });
        }

        // If already marked invalid, return that
        if (creds.is_valid === false) {
            return NextResponse.json({
                hasCredentials: true,
                isValid: false,
                lastChecked: creds.last_validated_at,
                message: 'Your CloudTrucks session has expired. Please reconnect.',
            });
        }

        // Optionally verify with live API call (can be slow, so make it opt-in)
        const verifyLive = request.nextUrl.searchParams.get('verify') === 'true';

        if (verifyLive) {
            try {
                const sessionCookie = decrypt(creds.encrypted_session_cookie);
                const csrfToken = decrypt(creds.encrypted_csrf_token);

                const result = await testApiConnection(sessionCookie, csrfToken);

                // Update validity in database
                await supabase
                    .from('cloudtrucks_credentials')
                    .update({
                        is_valid: result.success,
                        last_validated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);

                return NextResponse.json({
                    hasCredentials: true,
                    isValid: result.success,
                    lastChecked: new Date().toISOString(),
                    message: result.success
                        ? 'Credentials are valid.'
                        : 'Your CloudTrucks session has expired. Please reconnect.',
                });
            } catch (decryptError) {
                return NextResponse.json({
                    hasCredentials: true,
                    isValid: false,
                    message: 'Failed to verify credentials.',
                });
            }
        }

        // Return cached validity
        return NextResponse.json({
            hasCredentials: true,
            isValid: creds.is_valid !== false,
            lastChecked: creds.last_validated_at,
        });

    } catch (error: any) {
        console.error('[API] Credential status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
