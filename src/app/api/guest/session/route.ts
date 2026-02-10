import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const GUEST_SESSION_COOKIE = 'guest_session';
const GUEST_SESSION_TTL_SECONDS = 60 * 60 * 24 * 4; // 4 days

/**
 * GET /api/guest/session - Ensure an anonymous sandbox session cookie exists.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Signed-in users do not need a guest session.
        if (user) {
            return NextResponse.json({ isGuest: false, guestSession: null });
        }

        const existing = request.cookies.get(GUEST_SESSION_COOKIE)?.value ?? null;
        const guestSession = existing ?? crypto.randomUUID();

        const response = NextResponse.json({ isGuest: true, guestSession });

        if (!existing) {
            response.cookies.set(GUEST_SESSION_COOKIE, guestSession, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: GUEST_SESSION_TTL_SECONDS,
            });
        }

        return response;
    } catch {
        return NextResponse.json({ isGuest: true, guestSession: null }, { status: 500 });
    }
}
