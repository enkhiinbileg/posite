import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testInsert() {
    const payload = {
        title: "friend",
        description: "",
        thumbnail_url: "https://pub-dad9aa0d399f4639bd3a5dd6f8310303.r2.dev/thumbnails/test.jpg",
        video_url: "https://pub-dad9aa0d399f4639bd3a5dd6f8310303.r2.dev/videos/test.mp4",
        duration: "0:00",
        price_purchase: 5000,
        price_rental: 1500,
        rental_duration_hours: 24,
        is_free: false,
        is_nsfw: false,
        webtoon_id: null,
        order_index: 0
    };

    console.log("Testing video insert...");
    const { data, error } = await supabase.from('videos').insert(payload).select().single();
    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Insert success! Inserted video ID:", data.id);
    }
}

testInsert();
