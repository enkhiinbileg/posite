"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface CategoryWithStats {
  id: string;
  name: string;
  slug: string;
  thumbnail_url?: string | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  video_count: number;
  total_views: number;
  first_video_thumbnail?: string | null;
}

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getCategoriesWithFirstVideoAction(): Promise<{ success: boolean; data?: CategoryWithStats[]; error?: string }> {
  try {
    const adminDb = getAdminClient();
    const { data: categories, error } = await adminDb
      .from('video_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("getCategoriesWithFirstVideoAction DB error:", error);
      return { success: false, error: error.message };
    }

    const allCategories = categories || [];

    const { data: videos } = await adminDb
      .from('videos')
      .select('id, title, description, thumbnail_url, views, created_at, is_nsfw')
      .order('created_at', { ascending: false });

    const allVideos = videos || [];

    const result: CategoryWithStats[] = allCategories.map((cat: any) => {
      const catNameLower = cat.name.toLowerCase();

      const catVideos = allVideos.filter((v: any) => {
        const vDesc = (v.description || "").toLowerCase();
        const vTitle = (v.title || "").toLowerCase();
        return vDesc.includes(catNameLower) || vTitle.includes(catNameLower) || catNameLower === 'бүх видео';
      });

      const totalViews = catVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
      const videoCount = catVideos.length;

      const latestVideo = catVideos[0];
      const latestThumbnail = latestVideo?.thumbnail_url || cat.thumbnail_url || '/logo.png';

      return {
        ...cat,
        video_count: videoCount,
        total_views: totalViews,
        first_video_thumbnail: latestThumbnail
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("getCategoriesWithFirstVideoAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllCategoriesAdminAction(): Promise<{ success: boolean; data?: CategoryWithStats[]; error?: string }> {
  try {
    const adminDb = getAdminClient();
    const { data, error } = await adminDb
      .from('video_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("getAllCategoriesAdminAction DB error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("getAllCategoriesAdminAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function createCategoryAction(data: {
  name: string;
  slug?: string;
  thumbnail_url?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const adminDb = getAdminClient();
    const slug = data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const { data: created, error } = await adminDb
      .from('video_categories')
      .upsert({
        name: data.name,
        slug,
        thumbnail_url: data.thumbnail_url || null,
        description: data.description || null,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true
      }, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error("createCategoryAction error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/admin/categories");
    return { success: true, data: created?.[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCategoryAction(id: string, data: Partial<CategoryWithStats>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const adminDb = getAdminClient();
    const { data: updated, error } = await adminDb
      .from('video_categories')
      .update(data)
      .eq('id', id)
      .select();

    if (error) {
      console.error("updateCategoryAction error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/admin/categories");
    return { success: true, data: updated?.[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminClient();
    const { error } = await adminDb
      .from('video_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("deleteCategoryAction error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
