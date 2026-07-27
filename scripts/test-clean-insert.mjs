import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function testCleanInsert() {
    const rawData = {
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

    const allowedKeys = [
        'title', 'description', 'thumbnail_url', 'video_url', 
        'price_purchase', 'price_rental', 'rental_duration_hours', 
        'is_free', 'is_nsfw'
    ];

    const cleanPayload = Object.keys(rawData)
        .filter(key => allowedKeys.includes(key))
        .reduce((obj, key) => {
            obj[key] = rawData[key];
            return obj;
        }, {});

    console.log("Clean payload:", cleanPayload);
    const { data, error } = await supabase.from('videos').insert(cleanPayload).select().single();
    if (error) {
        console.error("Clean insert error:", error);
    } else {
        console.log("🎉 CLEAN INSERT SUCCESS! Video ID:", data.id);
    }
}

testCleanInsert();
