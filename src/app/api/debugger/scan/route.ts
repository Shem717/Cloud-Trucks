import { NextRequest, NextResponse } from 'next/server';
import { fetchLoadsViaApi, SearchCriteria } from '@/workers/cloudtrucks-api-client';
import { decryptCredentials } from '@/lib/crypto';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    const logs: string[] = [];
    const log = (msg: string) => {
        logs.push(msg);
        console.log(msg); // Also log to server console
    };

    try {
        const body = await req.json();
        const criteria: SearchCriteria = body.criteria;

        if (!criteria.origin_city) {
            return NextResponse.json({ success: false, error: 'Origin city required', logs }, { status: 400 });
        }

        // Get credentials
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized', logs }, { status: 401 });
        }

        const { data: creds, error: credError } = await supabase
            .from('cloudtrucks_credentials')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (credError || !creds) {
            return NextResponse.json({ success: false, error: 'No credentials found', logs }, { status: 404 });
        }

        // Decrypt credentials
        let sessionCookie = '';
        let csrfToken = '';

        try {
            const { decrypt } = await import('@/lib/crypto');

            log(`Encrypted session cookie format: ${creds.encrypted_session_cookie?.substring(0, 50)}...`);
            log(`Encrypted CSRF token format: ${creds.encrypted_csrf_token?.substring(0, 50)}...`);

            sessionCookie = decrypt(creds.encrypted_session_cookie);
            log(`Session cookie decrypted: ${sessionCookie.substring(0, 10)}...`);

            if (creds.encrypted_csrf_token) {
                csrfToken = decrypt(creds.encrypted_csrf_token);
                log(`CSRF token decrypted: ${csrfToken.substring(0, 10)}...`);
            } else {
                log('WARNING: No CSRF token found in database.');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            log(`Decryption error: ${message}`);
            if (e instanceof Error && e.stack) {
                log(`Stack: ${e.stack}`);
            }
            return NextResponse.json({ success: false, error: 'Failed to decrypt credentials', logs }, { status: 500 });
        }

        log(`Starting test scan for ${criteria.origin_city} -> ${criteria.dest_city || 'Anywhere'}`);
        log(`Using Session Cookie: ${sessionCookie.substring(0, 10)}...`);
        log(`Using CSRF Token: ${csrfToken ? csrfToken.substring(0, 10) + '...' : 'NONE'}`);

        // Call API
        const loads = await fetchLoadsViaApi(sessionCookie, csrfToken, criteria, 15000, log);

        return NextResponse.json({
            success: true,
            loads,
            logs
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log(`FATAL ERROR: ${message}`);
        return NextResponse.json({
            success: false,
            error: message,
            logs
        }, { status: 500 });
    }
}
