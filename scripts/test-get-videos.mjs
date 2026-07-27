import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA6Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function testGetVideos() {
    console.log("Testing getVideosAction query...");
    const { data, error } = await supabase
        .from('videos')
        .select('*, webtoons(title, image)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("getVideos query error:", error);
    } else {
        console.log("getVideos query success:", data);
    }

    console.log("Testing clean getVideos query...");
    const cleanRes = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

    if (cleanRes.error) {
        console.error("Clean query error:", cleanRes.error);
    } else {
        console.log("Clean query success! Total videos:", cleanRes.data.length);
    }
}

testGetVideos();
