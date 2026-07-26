import { createBrowserClient } from '@supabase/ssr'

const getSupabaseUrl = () => {
    return 'https://kcdzmijmghjljjbhcefp.supabase.co';
};

const supabaseUrl = getSupabaseUrl();
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc5OTEsImV4cCI6MjEwMDY0Mzk5MX0.x2dDcwsSUxENIrQbBvjgE6BUFwbk8ySGP3vo_husY1E';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && typeof window !== 'undefined') {
    console.warn('Supabase ANON KEY is missing from env, using default key.');
}

// Global Circuit Breaker to prevent infinite request loops
let requestCount = 0;
let lastReset = Date.now();
const MAX_REQUESTS_PER_MINUTE = 1000;
const COOLDOWN_MS = 60000;
let isThrottled = false;

// Browser-side client with cookie support
export const supabase = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey || '',
    {
        auth: {
            detectSessionInUrl: true,
            flowType: 'pkce',
            persistSession: true,
            autoRefreshToken: true,
        },
        global: {
            fetch: async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
                const now = Date.now();
                if (now - lastReset > COOLDOWN_MS) {
                    requestCount = 0;
                    lastReset = now;
                    isThrottled = false;
                }

                if (isThrottled) {
                    const error = new Error("Throttled by Circuit Breaker");
                    console.error("Supabase Circuit Breaker:", error.message);
                    throw error;
                }

                requestCount++;
                const timestamp = new Date().toLocaleTimeString();

                if (requestCount > MAX_REQUESTS_PER_MINUTE) {
                    isThrottled = true;
                    const error = new Error("Throttled by Circuit Breaker");
                    console.error("Supabase Circuit Breaker: LIMIT EXCEEDED.", error.message);
                    throw error;
                }

                try {
                    return await fetch(url, options);
                } catch (err: any) {
                    if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort')) {
                        return new Response(JSON.stringify({ error: 'Aborted' }), { status: 499 });
                    }
                    console.warn(`[Supabase Trace ${timestamp}] Network error for ${url}:`, err);
                    throw err;
                }
            }
        },
    }
);

