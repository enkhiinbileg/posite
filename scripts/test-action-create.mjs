import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testActionCreate() {
    const data = {
        title: "friend video test",
        description: "description test",
        thumbnail_url: "https://pub-dad9aa0d399f4639bd3a5dd6f8310303.r2.dev/thumbnails/test.jpg",
        video_url: "https://pub-dad9aa0d399f4639bd3a5dd6f8310303.r2.dev/videos/test.mp4",
        price_purchase: 5000,
        price_rental: 1500,
        rental_duration_hours: 24,
        is_free: false,
        is_nsfw: false
    };

    console.log("Inserting video with exact keys...");
    const { data: created, error } = await supabase
        .from('videos')
        .insert(data)
        .select()
        .single();

    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("SUCCESSFULLY INSERTED VIDEO:", created);
    }
}

testActionCreate();
