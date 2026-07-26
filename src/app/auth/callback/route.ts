import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/videos';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isDev ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
    const origin = `${protocol}://${host}`;

    if (code) {
        try {
            const supabase = await createClient();
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

    return NextResponse.redirect(`${origin}${next}`);
}
