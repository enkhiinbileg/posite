import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdminInstance) {
        return supabaseAdminInstance;
    }

    const supabaseUrl = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase Service Role Key. This is required for Server Actions on Vercel. Please add SUPABASE_SERVICE_ROLE_KEY to your Vercel Project Settings.");
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
