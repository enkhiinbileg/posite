"use server";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kcdzmijmghjljjbhcefp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

function getAdminClient() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
}

export async function getPricingPlansAction() {
    try {
        const client = getAdminClient();
        const { data, error } = await client
            .from('pricing_plans')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function upsertPricingPlanAction(plan: any) {
    try {
        const client = getAdminClient();
        const { data, error } = await client
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

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deletePricingPlanAction(id: string) {
    try {
        const client = getAdminClient();
        const { error } = await client
            .from('pricing_plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
