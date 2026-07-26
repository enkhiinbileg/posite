import { createClient, SupabaseClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://kcdzmijmghjljjbhcefp.supabase.co';
const HARDCODED_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE';

// Create a direct client with the verified working service role key
export function getSupabaseAdmin(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || HARDCODED_SERVICE_ROLE_KEY;

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// Proxy to get a fresh client instance on every operation
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        const client = getSupabaseAdmin();
        const value = client[prop as keyof SupabaseClient];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});
