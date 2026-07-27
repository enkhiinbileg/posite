import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA6Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

// Verified working key without colon:
const CLEAN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

const supabase = createClient(SUPABASE_URL, CLEAN_KEY);

async function testVipPackage() {
    console.log("Testing VIP package creation with clean key...");
    const { data, error } = await supabase
        .from('pricing_plans')
        .upsert({
            title: "VIP 1 Сар",
            price: 19900,
            duration_value: 1,
            duration_unit: "months",
            features: ["Бүх VIP бичлэгүүд", "HD чанар", "Зар сурталчилгаагүй"],
            is_recommended: true,
            is_nsfw: false,
            icon_name: "Crown",
            color_preset: "from-amber-500 to-yellow-500",
            order_index: 1
        })
        .select();

    if (error) {
        console.error("VIP package upsert error:", error);
    } else {
        console.log("SUCCESS! VIP package created:", data);
    }
}

testVipPackage();
