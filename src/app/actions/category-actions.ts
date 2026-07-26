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

// Format numbers like 1.58M, 126K, 475
export function formatCountNumber(num: number): string {
  if (!num || num <= 0) return "0";
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export async function getCategoriesWithFirstVideoAction() {
  try {
    // 1. Fetch categories from video_categories
    let { data: categories, error } = await supabaseAdmin
      .from('video_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Fallback if table doesn't exist yet in Supabase
    if (error || !categories || categories.length === 0) {
      const defaultNames = [
        'Friend', 'Japanese', 'Anime', 'Korean', 'Teen 18+', 'Cheating',
        'Hot Mom', 'Public', 'Japanese Hardcore', 'POV (Point Of View)',
        'Homemade', 'Chinese Teen 18+', 'Skinny Big Tits', 'Uncensored',
        'Cum Inside', 'Animation', 'Goth', 'Hardcore Fuck', 'Hentai',
        'Asian Homemade', 'Story', 'Surprise Mom', 'Japanese Hot Mom', 'Massage'
      ];
      categories = defaultNames.map((name, idx) => ({
        id: `cat-${idx + 1}`,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        thumbnail_url: null,
        sort_order: idx + 1,
        is_active: true
      }));
    }

    // 2. Fetch all videos with webtoons to calculate thumbnail & counts
    const { data: videos } = await supabaseAdmin
      .from('videos')
      .select('id, title, thumbnail_url, views, created_at, is_nsfw, webtoons(id, title, image, genres)');

    const allVideos = videos || [];

    // 3. Attach first video thumbnail & stats to each category
    const result: CategoryWithStats[] = categories.map((cat: any) => {
      // Filter videos belonging to this category/genre
      const catVideos = allVideos.filter(v => {
        const genres = Array.isArray(v.webtoons?.genres) ? v.webtoons.genres : [];
        const isMatch = genres.some((g: string) => 
          g.toLowerCase() === cat.name.toLowerCase() || 
          g.toLowerCase() === cat.slug.toLowerCase()
        );
        return isMatch || cat.name === 'Бүх видео';
      });

      // Calculate total views
      const totalViews = catVideos.reduce((sum, v) => sum + (v.views || 0), 0);
      const videoCount = catVideos.length;

      // Find first video thumbnail
      const firstVideo = catVideos[0];
      const firstThumbnail = cat.thumbnail_url || 
        firstVideo?.thumbnail_url || 
        firstVideo?.webtoons?.image || 
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

export async function getAllCategoriesAdminAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
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
}) {
  try {
    const slug = data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const { data: created, error } = await supabaseAdmin
      .from('video_categories')
      .insert([{
        name: data.name,
        slug,
        thumbnail_url: data.thumbnail_url || null,
        description: data.description || null,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/videos");
    revalidatePath("/home");
    revalidatePath("/admin/categories");
    return { success: true, data: created };
  } catch (error: any) {
    console.error("createCategoryAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCategoryAction(id: string, data: Partial<CategoryWithStats>) {
  try {
    const { data: updated, error } = await supabaseAdmin
      .from('video_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/videos");
    revalidatePath("/home");
    revalidatePath("/admin/categories");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateCategoryAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('video_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath("/videos");
    revalidatePath("/home");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: any) {
    console.error("deleteCategoryAction error:", error);
    return { success: false, error: error.message };
  }
}
