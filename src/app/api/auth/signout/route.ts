import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    
    // Sign out from Supabase (clears server-side session)
    await supabase.auth.signOut()
    
    // Forcibly clear all auth-related cookies to be absolutely sure
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const host = request.headers.get('host') || '';
    const cookieDomain = host.includes('pom.site') ? '.pom.site' : undefined;
    
    allCookies.forEach(cookie => {
        if (cookie.name.includes('supabase-auth-token') || cookie.name.includes('sb-')) {
            cookieStore.delete({
                name: cookie.name,
                path: '/',
                ...(cookieDomain ? { domain: cookieDomain } : {})
            })
            cookieStore.delete({
                name: cookie.name,
                path: '/'
            })
        }
    })

    // Redirect to home page with no-cache headers
    const url = new URL('/', request.url)
    const response = NextResponse.redirect(url, { status: 302 })
    
    // Ensure the browser doesn't cache the logged-in state of the root page
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    
    return response
}
