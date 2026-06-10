/**
 * proxy.ts — Next.js 16 Edge Proxy (replaces middleware.ts)
 *
 * Responsibilities:
 *  1. Refresh the Supabase session on every request (SSR cookie hygiene).
 *  2. Redirect unauthenticated users to /login with a ?next= return URL.
 *  3. Redirect authenticated users away from auth pages.
 *  4. Attach security headers to every response.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require a valid session
const PROTECTED_PREFIXES = [
  '/home', '/calendar', '/data', '/error-log',
  '/settings', '/info', '/tutorial', '/inventory',
]

// Routes only accessible when NOT logged in
const AUTH_ROUTES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Supabase session refresh ───────────────────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── 2. Route guards ───────────────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthPage  = AUTH_ROUTES.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && user) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/home'
    homeUrl.searchParams.delete('next')
    return NextResponse.redirect(homeUrl)
  }

  // ── 3. Security headers ───────────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options',         'DENY')
  response.headers.set('X-XSS-Protection',        '1; mode=block')
  response.headers.set('Referrer-Policy',         'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy',      'camera=(), microphone=(), geolocation=()')

  return response
}

/**
 * Matcher note: the previous single negative-lookahead regex
 *   /((?!_next/static|_next/image|favicon.ico|api/|.*\.ext$).*)
 * is not extractable by Turbopack's static analyser, so the
 * middleware-manifest ends up empty and the proxy never runs.
 *
 * The explicit list below covers every route that needs session
 * refresh or auth guards while skipping _next internals, the API
 * routes (which use the service-role client directly), and static
 * assets. Turbopack handles simple path patterns without issues.
 */
export const config = {
  matcher: [
    '/',
    '/home/:path*',
    '/calendar/:path*',
    '/data/:path*',
    '/error-log/:path*',
    '/settings/:path*',
    '/info/:path*',
    '/tutorial/:path*',
    '/inventory/:path*',
    '/onboarding/:path*',
    '/login',
    '/signup',
  ],
}
