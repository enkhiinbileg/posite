import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdminInstance) {
        return supabaseAdminInstance;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kcdzmijmghjljjbhcefp.supabase.co';
    const HARDCODED_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc5OTEsImV4cCI6MjEwMDY0Mzk5MX0.x2dDcwsSUxENIrQbBvjgE6BUFwbk8ySGP3vo_husY1E';
    const supabaseServiceKey = HARDCODED_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase Service Role Key.");
    }

    console.log("🛠️ Initializing Supabase Admin client...");
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: (...args) => {
                const [url, config] = args;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.error(`⏱️ Supabase Admin Timeout: ${url}`);
                    controller.abort();
                }, 10000); // 10s timeout

                return fetch(url, {
                    ...config,
                    signal: controller.signal,
                }).finally(() => clearTimeout(timeoutId));
            }
        }
    });
    console.log("✅ Supabase Admin client initialized.");

    return supabaseAdminInstance;
}

// Export as getter to prevent build-time initialization
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return getSupabaseAdmin()[prop as keyof SupabaseClient];
    }
});
