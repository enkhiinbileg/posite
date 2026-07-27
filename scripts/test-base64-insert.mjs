import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function testBase64() {
    const dummyBase64 = "data:image/png;base64," + "A".repeat(50000);

    const payload = {
        title: "base64 test",
        description: "",
        thumbnail_url: dummyBase64,
        video_url: "blob:http://localhost:3000/8e6b",
        price_purchase: 5000,
        price_rental: 1500,
        rental_duration_hours: 24,
        is_free: false,
        is_nsfw: false
    };

    console.log("Inserting base64 payload...");
    const { data, error } = await supabase.from('videos').insert(payload).select().single();
    if (error) {
        console.error("Base64 insert error:", error);
    } else {
        console.log("Base64 insert SUCCESS! Video ID:", data.id);
        await supabase.from('videos').delete().eq('id', data.id);
    }
}

testBase64();
