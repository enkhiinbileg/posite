
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectchapters() {
    console.log("Inspecting chapters for missing translator_ids...");

    // Get total count
    const { count, error: countError } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true });

    console.log("Total chapters in DB:", count);

    // Get sample chapters
    const { data: chapters, error } = await supabase
        .from('chapters')
        .select('id, title, chapter_number, translator_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Recent Chapters Sample:");
        console.table(chapters);

        const nullTranslatorcheck = chapters?.filter(c => c.translator_id === null);
        if (nullTranslatorcheck && nullTranslatorcheck.length > 0) {
            console.warn("WARNING: Found chapters with NULL translator_id!");
        }
    }
}

inspectchapters();
