"use server";

import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/supabase-admin";

const JSON_FILE_PATH = path.join(process.cwd(), "data", "pricing_plans.json");

function ensureJsonFile() {
    const dir = path.dirname(JSON_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(JSON_FILE_PATH)) {
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify([
            {
                id: "vip-1-month",
                title: "VIP 1 Сар",
                price: 19900,
                duration_value: 1,
                duration_unit: "months",
                features: ["Бүх VIP бичлэгүүдийг үзэх", "HD ба 4K дүрсний чанар", "Зар сурталчилгаагүй"],
                is_recommended: true,
                is_nsfw: false,
                icon_name: "Crown",
                color_preset: "from-amber-500 to-yellow-500",
                order_index: 1,
                updated_at: new Date().toISOString()
            }
        ], null, 2));
    }
}

function readJsonPlans(): any[] {
    try {
        ensureJsonFile();
        const content = fs.readFileSync(JSON_FILE_PATH, "utf-8");
        return JSON.parse(content);
    } catch {
        return [];
    }
}

function writeJsonPlans(plans: any[]) {
    ensureJsonFile();
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(plans, null, 2), "utf-8");
}

export async function getPricingPlansAction(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('pricing_plans')
            .select('*')
            .order('order_index', { ascending: true });

        if (!error && data && data.length > 0) {
            return { success: true, data };
        }
    } catch {
        // Fallback to JSON
    }

    const localPlans = readJsonPlans();
    return { success: true, data: localPlans };
}

export async function upsertPricingPlanAction(plan: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('pricing_plans')
            .upsert({
                id: plan.id || undefined,
                title: plan.title,
                price: Number(plan.price),
                duration_value: Number(plan.duration_value),
                duration_unit: plan.duration_unit || 'months',
                features: plan.features || [],
                is_recommended: !!plan.is_recommended,
                is_nsfw: !!plan.is_nsfw,
                icon_name: plan.icon_name || 'Zap',
                color_preset: plan.color_preset || 'from-pink-500 to-rose-500',
                order_index: Number(plan.order_index || 0),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (!error && data) {
            return { success: true, data };
        }
    } catch {
        // Fallback to local JSON storage
    }

    const plans = readJsonPlans();
    const targetId = plan.id || `vip-${Date.now()}`;
    const newPlan = {
        id: targetId,
        title: plan.title,
        price: Number(plan.price),
        duration_value: Number(plan.duration_value),
        duration_unit: plan.duration_unit || 'months',
        features: plan.features || [],
        is_recommended: !!plan.is_recommended,
        is_nsfw: !!plan.is_nsfw,
        icon_name: plan.icon_name || 'Crown',
        color_preset: plan.color_preset || 'from-amber-500 to-yellow-500',
        order_index: Number(plan.order_index || 0),
        updated_at: new Date().toISOString()
    };

    const existingIndex = plans.findIndex(p => p.id === targetId);
    if (existingIndex >= 0) {
        plans[existingIndex] = newPlan;
    } else {
        plans.push(newPlan);
    }

    writeJsonPlans(plans);
    return { success: true, data: newPlan };
}

export async function deletePricingPlanAction(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await supabaseAdmin
            .from('pricing_plans')
            .delete()
            .eq('id', id);
    } catch {
        // Ignore DB error
    }

    const plans = readJsonPlans();
    const filtered = plans.filter(p => p.id !== id);
    writeJsonPlans(filtered);
    return { success: true };
}
