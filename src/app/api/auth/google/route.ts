import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isDev ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
    const origin = `${protocol}://${host}`;

    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback`,
                queryParams: {
                    prompt: 'select_account'
                }
            }
        });

        if (error || !data?.url) {
            console.error("Google OAuth server error:", error);
            return NextResponse.redirect(`${origin}/videos?auth_error=${encodeURIComponent(error?.message || 'Google Auth Failed')}`);
        }

        return NextResponse.redirect(data.url, { status: 303 });
    } catch (err: any) {
        console.error("Google OAuth server exception:", err);
        return NextResponse.redirect(`${origin}/videos?auth_error=${encodeURIComponent(err?.message || 'Google Auth Exception')}`);
    }
}
