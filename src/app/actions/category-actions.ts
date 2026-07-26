"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
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

export async function getCategoriesWithFirstVideoAction(): Promise<{ success: boolean; data?: CategoryWithStats[]; error?: string }> {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('video_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const allCategories = categories || [];

    const { data: videos } = await supabaseAdmin
      .from('videos')
      .select('id, title, thumbnail_url, views, created_at, is_nsfw, webtoons(id, title, image, genres)');

    const allVideos = videos || [];

    const result: CategoryWithStats[] = allCategories.map((cat: any) => {
      const catVideos = allVideos.filter((v: any) => {
        const webtoonObj = Array.isArray(v.webtoons) ? v.webtoons[0] : v.webtoons;
        const genres = Array.isArray(webtoonObj?.genres) ? webtoonObj.genres : [];
        const isMatch = genres.some((g: string) => 
          g.toLowerCase() === cat.name.toLowerCase() || 
          g.toLowerCase() === cat.slug.toLowerCase()
        );
        return isMatch || cat.name === 'Бүх видео';
      });

      const totalViews = catVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
      const videoCount = catVideos.length;

      const firstVideo = catVideos[0];
      const webtoonObj = Array.isArray(firstVideo?.webtoons) ? firstVideo.webtoons[0] : firstVideo?.webtoons;
      const firstThumbnail = cat.thumbnail_url || 
        firstVideo?.thumbnail_url || 
        webtoonObj?.image || 
        '/logo.png';

      return {
        ...cat,
        video_count: videoCount,
        total_views: totalViews,
        first_video_thumbnail: firstThumbnail
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
    const { data, error } = await supabaseAdmin
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
    const slug = data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const { data: created, error } = await supabaseAdmin
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
    const { data: updated, error } = await supabaseAdmin
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
    const { error } = await supabaseAdmin
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
