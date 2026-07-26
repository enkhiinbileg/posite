"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getSiteSettings() {
    try {
        const { data, error } = await supabaseAdmin
            .from('site_settings')
            .select('*');

        if (error) throw error;

        // Convert array to key-value map
        const settings: Record<string, any> = {};
        data.forEach(s => {
            settings[s.key] = s.value;
        });

        return { success: true, settings };
    } catch (error: any) {
        console.error("Error fetching site settings:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSiteSetting(key: string, value: any) {
    try {
        const { error } = await supabaseAdmin
            .from('site_settings')
            .upsert({ 
                key, 
                value, 
                updated_at: new Date().toISOString() 
            });

        if (error) throw error;

        revalidatePath("/");
        revalidatePath("/admin");
        revalidatePath("/webtoon");

        return { success: true };
    } catch (error: any) {
        console.error(`Error updating site setting ${key}:`, error);
        return { success: false, error: error.message };
    }
}
