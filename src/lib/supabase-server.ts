import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function getSupabaseUrl() {
    // ON THE SERVER: We hit Supabase directly (https://jtlwllzaxscxqtcoqpll.supabase.co)
    // Vercel/Servers are NOT in Mongolia, so they don't need the proxy.
    // Hitting the proxy from the server is slow and prone to recursion errors.
    return 'https://jtlwllzaxscxqtcoqpll.supabase.co';
}

export function createPublicClient() {
    const url = getSupabaseUrl();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!key && process.env.NODE_ENV === 'development') {
        console.warn('Supabase ANON KEY is missing.');
    }

    return createSupabaseClient(url, key || '')
}

export async function createClient() {
    const cookieStore = await cookies()

    // Hardcoded anon key to ensure it works flawlessly on Cloudflare Workers.
    // OpenNext sometimes fails to resolve process.env dynamically at runtime.
    // This is safe because it's a PUBLIC anon key.
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHdsbHpheHNjeHF0Y29xcGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjMxNzAsImV4cCI6MjA4NDAzOTE3MH0.e31jvTn1pD9bVRrR7q99EUvHiVDXD_xvhDUPKuwWwLo';

    return createServerClient(
        getSupabaseUrl(),
        anonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
