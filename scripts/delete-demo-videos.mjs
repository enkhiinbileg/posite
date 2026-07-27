import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanDemoVideos() {
    console.log("Cleaning demo videos from Supabase database...");

    const { data: videos, error: fetchErr } = await supabase
        .from('videos')
        .select('id, title');

    if (fetchErr) {
        console.error("Fetch error:", fetchErr);
        return;
    }

    console.log("Found videos:", videos);

    const demoTitles = [
        "Japanese Beauty POV",
        "Point Of View Ultimate",
        "Hot Anime Style Cosplay",
        "VR 360 Full HD",
        "Asian Model POV"
    ];

    const toDelete = videos.filter(v => 
        demoTitles.some(t => v.title?.includes(t))
    );

    if (toDelete.length > 0) {
        const ids = toDelete.map(v => v.id);
        const { error: delErr } = await supabase
            .from('videos')
            .delete()
            .in('id', ids);

        if (delErr) {
            console.error("Delete error:", delErr);
        } else {
            console.log(`Successfully deleted ${ids.length} demo videos from Supabase DB!`);
        }
    } else {
        console.log("No demo videos found in DB table!");
    }
}

cleanDemoVideos();
