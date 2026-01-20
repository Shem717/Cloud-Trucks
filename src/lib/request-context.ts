import type { NextRequest } from 'next/server';

export type RequestContext = {
    userId: string | null;
    guestSession: string | null;
    isGuest: boolean;
};

// API-enforced auth: treat a missing auth user + present guest cookie as sandbox access.
export async function getRequestContext(
    request: NextRequest,
    supabase: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } }
): Promise<RequestContext> {
    const { data: { user } } = await supabase.auth.getUser();
    const guestSession = request.cookies.get('guest_session')?.value ?? null;

    return {
        userId: user?.id ?? null,
        guestSession,
        isGuest: !user && !!guestSession,
    };
}
