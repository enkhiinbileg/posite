import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function updateFriendVideo() {
    console.log("Updating friend video category tag in DB...");
    const { data: videos } = await supabase.from('videos').select('*');
    if (!videos || videos.length === 0) {
        console.log("No videos found.");
        return;
    }

    for (const v of videos) {
        if (v.title.toLowerCase().includes('friend') || v.id === '5bcf1c2d-6bf0-4acc-b53b-ef70adb1ebdb') {
            const newDesc = v.description ? `${v.description} [Category: Friend]` : `[Category: Friend]`;
            const { error } = await supabase.from('videos').update({ description: newDesc }).eq('id', v.id);
            if (error) console.error("Update error for video:", v.id, error.message);
            else console.log("🎉 Successfully updated video:", v.title, "with description:", newDesc);
        }
    }
}

updateFriendVideo();
