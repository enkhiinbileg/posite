import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
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
            return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error?.message || 'Google Auth Failed')}`);
        }

        return NextResponse.redirect(data.url, { status: 303 });
    } catch (err: any) {
        return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(err?.message || 'Google Auth Exception')}`);
    }
}
