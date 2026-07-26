
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Note: Ideally need SERVICE_ROLE_KEY to bypass RLS if user isn't logged in, or use ANON and rely on policy. 
// Since we are running locally, we might not have service role. Let's try ANON.
// BUT `translator_stats` RLS says "Translators can view their own stats". We might be blocked writing to it if not authed.
// Actually, I can use the same pattern as user's client code but I'm not logged in as the user.
// I'll try to use the SERVICE_ROLE_KEY if available in env, otherwise warn.

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStats() {
    console.log("Starting stats backfill...");

    // 1. Get all chapters with translator_id
    const { data: chapters, error: chapError } = await supabase
        .from('chapters')
        .select('translator_id');

    if (chapError) {
        console.error("Error fetching chapters:", chapError);
        return;
    }

    if (!chapters || chapters.length === 0) {
        console.log("No chapters found.");
        return;
    }

    // 2. Aggregate counts
    const counts: Record<string, number> = {};
    chapters.forEach((c: any) => {
        if (c.translator_id) {
            counts[c.translator_id] = (counts[c.translator_id] || 0) + 1;
        }
    });

    console.log("Found counts:", counts);

    // 3. Update translator_stats
    for (const [translatorId, count] of Object.entries(counts)) {
        console.log(`Updating ${translatorId}: ${count} chapters`);

        const { error: upsertError } = await supabase
            .from('translator_stats')
            .upsert({
                translator_id: translatorId,
                total_chapters_translated: count,
                updated_at: new Date().toISOString()
            }, { onConflict: 'translator_id' });

        if (upsertError) {
            console.error(`Failed to update ${translatorId}:`, upsertError);
        } else {
            console.log(`Success for ${translatorId}`);
        }
    }
    console.log("Done.");
}

fixStats();
