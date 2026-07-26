import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function getSupabaseUrl() {
    return 'https://kcdzmijmghjljjbhcefp.supabase.co';
}

const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc5OTEsImV4cCI6MjEwMDY0Mzk5MX0.x2dDcwsSUxENIrQbBvjgE6BUFwbk8ySGP3vo_husY1E';

export function createPublicClient() {
    const url = getSupabaseUrl();
    return createSupabaseClient(url, HARDCODED_ANON_KEY)
}

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        getSupabaseUrl(),
        HARDCODED_ANON_KEY,
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
