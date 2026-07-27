import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Redirect /library to /videos
  if (request.nextUrl.pathname === '/library') {
      return NextResponse.redirect(new URL('/videos', request.url), 308)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Prevent mobile browsers from caching HTML pages with stale auth bundles
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  const supabaseUrl = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
  const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHdsbHpheHNjeHF0Y29xcGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjMxNzAsImV4cCI6MjA4NDAzOTE3MH0.e31jvTn1pD9bVRrR7q99EUvHiVDXD_xvhDUPKuwWwLo';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_ANON_KEY;

  // IMPORTANT: This middleware is critical for Supabase SSR to sync cookies between server and client.
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if needed for server components
  try {
    await supabase.auth.getUser()
  } catch (e) {
    // Ignore errors to prevent crashing
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/supabase (proxy exclusion)
     * - api/proxy-upload (upload proxy exclusion to bypass 10MB limit)
     * - auth/callback (OAuth callback handler)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/supabase|api/proxy-upload|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
