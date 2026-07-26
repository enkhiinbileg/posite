import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/videos';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isDev ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
    const origin = `${protocol}://${host}`;

    let response = NextResponse.redirect(`${origin}${next}`);
    const cookieStore = await cookies();

    if (code) {
        try {
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kcdzmijmghjljjbhcefp.supabase.co',
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc5OTEsImV4cCI6MjEwMDY0Mzk5MX0.x2dDcwsSUxENIrQbBvjgE6BUFwbk8ySGP3vo_husY1E',
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll();
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                                response.cookies.set(name, value, options);
                            });
                        },
                    },
                }
            );

            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
                console.error("Auth callback exchange error:", error.message);
                return NextResponse.redirect(`${origin}/videos?auth_error=${encodeURIComponent(error.message)}`);
            }
        } catch (err: any) {
            console.error("Auth callback exception:", err);
            return NextResponse.redirect(`${origin}/videos?auth_error=${encodeURIComponent(err.message || 'Auth Failed')}`);
        }
    }

    return response;
}
