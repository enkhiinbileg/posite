const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PLANS = [
    {
        id: 'monthly',
        title: "1 Сар",
        price: 5000,
        duration_value: 1,
        duration_unit: "months",
        features: ["Бүх VIP бүлгүүдийг унших", "Гайхалтай дүрсний чанар", "Зар сурталчилгаагүй", "Тогтмол шинэчлэлт"],
        icon_name: "Zap",
        color_preset: "from-blue-500 to-cyan-500",
        order_index: 1,
        is_nsfw: false
    },
    {
        id: 'quarterly',
        title: "3 Сар",
        price: 13500,
        duration_value: 3,
        duration_unit: "months",
        features: ["10% хэмнэлт", "Бүх VIP бүлгүүдийг унших", "Тэргүүн ээлжинд унших", "Баджийн тэмдэг", "Дэмжлэг үзүүлэх"],
        is_recommended: true,
        icon_name: "Crown",
        color_preset: "from-pink-500 to-rose-500",
        order_index: 2,
        is_nsfw: false
    },
    {
        id: 'annually',
        title: "1 Жил",
        price: 50000,
        duration_value: 1,
        duration_unit: "years",
        features: ["20% их хэмнэлт", "Бүх давуу талууд", "Тусгай бэлэг", "Нэвтрүүлэгчээр ажиллах эрх (заавартай)", "Нэмэлт бонус"],
        icon_name: "Star",
        color_preset: "from-yellow-500 to-amber-500",
        order_index: 3,
        is_nsfw: false
    },
    {
        id: 'nsfw_monthly',
        title: "18+ VIP (1 САР)",
        price: 10000,
        duration_value: 1,
        duration_unit: "months",
        features: ["Бүх +18 контентыг унших", "Тусгай нууц хэсэгт нэвтрэх", "Зөвхөн насанд хүрэгчдэд"],
        icon_name: "Sparkles",
        color_preset: "from-purple-600 to-red-600",
        order_index: 4,
        is_nsfw: true
    }
];

async function syncPlans() {
    console.log("Checking for existing plans...");
    const { data: existingPlans } = await supabase.from('pricing_plans').select('id');
    const existingIds = (existingPlans || []).map(p => p.id);

    for (const plan of DEFAULT_PLANS) {
        if (existingIds.includes(plan.id)) {
            console.log(`Updating plan: ${plan.id}`);
            await supabase.from('pricing_plans').update(plan).eq('id', plan.id);
        } else {
            console.log(`Inserting plan: ${plan.id}`);
            await supabase.from('pricing_plans').insert([plan]);
        }
    }
    console.log("Sync complete.");
}

syncPlans();
