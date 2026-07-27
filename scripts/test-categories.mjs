import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA6Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function testCats() {
    const { data, error } = await supabase.from('video_categories').select('*');
    console.log("video_categories DB data:", error ? error.message : data);
}

testCats();
