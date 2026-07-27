import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA6Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function inspectSchema() {
    console.log("Inspecting videos table schema...");
    const { data, error } = await supabase.from('videos').select('*').limit(1);
    if (error) {
        console.error("Select error:", error);
    } else if (data && data.length > 0) {
        console.log("Videos table keys:", Object.keys(data[0]));
    } else {
        console.log("Videos table is empty. Testing minimal insert...");
        const testRes = await supabase.from('videos').insert({
            title: "Test Schema",
            video_url: "https://example.com/test.mp4"
        }).select().single();
        if (testRes.data) {
            console.log("Minimal insert keys:", Object.keys(testRes.data));
            await supabase.from('videos').delete().eq('id', testRes.data.id);
        } else {
            console.error("Minimal insert error:", testRes.error);
        }
    }
}

inspectSchema();
