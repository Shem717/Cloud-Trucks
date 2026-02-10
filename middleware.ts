import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Security headers configuration
const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
    // Content Security Policy
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com",
        "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://api.mapbox.com https://api.open-meteo.com https://api.bigdatacloud.net wss://*.supabase.co wss://ws-us3.pusher.com",
        "worker-src 'self' blob:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; '),
};

function applySecurityHeaders(response: NextResponse) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Refresh auth session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // --- GUEST SESSION LOGIC ---
    if (request.nextUrl.pathname.startsWith('/public')) {
        // If visiting /public routes, ensure they have a guest_session cookie
        const guestSession = request.cookies.get('guest_session')

        if (!guestSession) {
            const guestId = crypto.randomUUID()
            response.cookies.set('guest_session', guestId, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 4 // 4 days
            })
        }
        return applySecurityHeaders(response)
    }

    // Protect /dashboard routes (Admin Only)
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
        return applySecurityHeaders(redirectResponse)
    }

    // Redirect authenticated users away from /login
    if (request.nextUrl.pathname.startsWith('/login') && user) {
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        return applySecurityHeaders(redirectResponse)
    }

    return applySecurityHeaders(response)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
