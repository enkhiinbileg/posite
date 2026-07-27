import fetch from "node-fetch";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

async function createTableViaSQL() {
    console.log("Sending SQL create table query to Supabase...");
    const sql = `
        CREATE TABLE IF NOT EXISTS public.pricing_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            price NUMERIC NOT NULL DEFAULT 0,
            duration_value INTEGER NOT NULL DEFAULT 1,
            duration_unit TEXT NOT NULL DEFAULT 'months',
            features JSONB DEFAULT '[]'::jsonb,
            is_recommended BOOLEAN DEFAULT false,
            is_nsfw BOOLEAN DEFAULT false,
            icon_name TEXT DEFAULT 'Crown',
            color_preset TEXT DEFAULT 'from-amber-500 to-yellow-500',
            order_index INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;

    // Try SQL query endpoint
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ query: sql })
        });
        const resText = await response.text();
        console.log("Query response:", response.status, resText);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

createTableViaSQL();
