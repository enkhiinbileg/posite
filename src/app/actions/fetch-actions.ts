"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { sendDiscordNotification } from "@/lib/discord";

export async function fetchWebtoonsAction(params: {
    from: number;
    to: number;
    sort?: string;
    status?: string;
    genre?: string;
    search?: string;
    includeNsfw?: boolean;
}) {
    try {
        let query = supabaseAdmin
            .from('webtoons')
            .select('*', { count: 'exact' });

        if (!params.includeNsfw) {
            query = query.eq('is_nsfw', false);
        }

        // Apply Sorting
        if (params.sort === "newest") query = query.order('created_at', { ascending: false });
        else if (params.sort === "a-z") query = query.order('title', { ascending: true });
        else query = query.order('rating', { ascending: false });

        // Apply Status Filter
        if (params.status) {
            const statusMap: Record<string, string> = {
                ongoing: "Ongoing",
                completed: "Completed",
                hiatus: "Hiatus"
            };
            const dbStatus = statusMap[params.status];
            if (dbStatus) {
                query = query.eq('status', dbStatus);
            }
        }

        // Apply Genre Filter
        if (params.genre && params.genre !== "Бүх") {
            const titleCase = params.genre.charAt(0).toUpperCase() + params.genre.slice(1).toLowerCase();
            const upperCase = params.genre.toUpperCase();
            const lowerCase = params.genre.toLowerCase();
            
            // PostgREST "contains" filter with multiple variants for robustness
            query = query.or(`genres.cs.{"${params.genre}"},genres.cs.{"${titleCase}"},genres.cs.{"${upperCase}"},genres.cs.{"${lowerCase}"}`);
        }

        // Apply Search
        if (params.search) {
            query = query.ilike('title', `%${params.search}%`);
        }

        const { data, error, count } = await query.range(params.from, params.to);

        if (error) throw error;

        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error("fetchWebtoonsAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchLatestUpdatesAction(limit: number = 50, includeNsfw: boolean = false, onlyNsfw: boolean = false) {
    try {
        const now = new Date().toISOString();
        let query = supabaseAdmin
            .from('chapters')
            .select('id, title, created_at, webtoon_id, webtoons!inner(id, title, image, is_nsfw)')
            .eq('is_published', true)
            .or(`published_at.is.null,published_at.lte.${now}`)
            .order('created_at', { ascending: false });
        
        if (onlyNsfw) {
            // Filter ONLY NSFW
            query = query.eq('webtoons.is_nsfw', true);
        } else if (!includeNsfw) {
            // Default: Exclude NSFW
            query = query.eq('webtoons.is_nsfw', false);
        }


        const { data, error } = await query.limit(limit);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("fetchLatestUpdatesAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchUserReadingProgressAction(limit: number = 10, includeNsfw: boolean = false, onlyNsfw: boolean = false) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Not authenticated" };

        let query = supabase
            .from('reading_progress')
            .select('webtoon_id, chapter_id, last_read_at, webtoons!inner(*), chapters(title)')
            .eq('user_id', user.id)
            .order('last_read_at', { ascending: false });

        if (onlyNsfw) {
            query = query.eq('webtoons.is_nsfw', true);
        } else if (!includeNsfw) {
            query = query.eq('webtoons.is_nsfw', false);
        }

        const { data: progress, error } = await query.limit(limit);

        if (error) throw error;
        return { success: true, data: progress || [] };
    } catch (error: any) {
        console.error("fetchUserReadingProgressAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchChapterImagesAction(chapterId: number) {
    try {
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .select('images')
            .eq('id', chapterId)
            .single();

        if (error) throw error;
        return { success: true, data: data?.images || [] };
    } catch (error: any) {
        console.error("fetchChapterImagesAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateReadingProgressAction(params: {
    chapterId: number;
    webtoonId: number;
    isFinished?: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Not authenticated" };

        const upsertData: any = {
            user_id: user.id,
            chapter_id: params.chapterId,
            webtoon_id: params.webtoonId,
            last_read_at: new Date().toISOString()
        };

        if (params.isFinished !== undefined) {
            upsertData.is_finished = params.isFinished;
        }

        const { error } = await supabase
            .from('reading_progress')
            .upsert(upsertData, { onConflict: 'user_id,chapter_id' });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("updateReadingProgressAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getChapterLikesAction(chapterId: number, userId?: string) {
    try {
        const tasks: any[] = [
            supabaseAdmin.from('likes').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId)
        ];

        if (userId) {
            tasks.push(supabaseAdmin.from('likes').select('*').eq('user_id', userId).eq('chapter_id', chapterId).single());
        }

        const [likesCountRes, userLikeRes] = await Promise.all(tasks);

        return {
            success: true,
            count: likesCountRes?.count || 0,
            isLiked: userLikeRes ? !!userLikeRes.data : false
        };
    } catch (error: any) {
        console.error("getChapterLikesAction Error:", error);
        return { success: false, error: error.message, count: 0, isLiked: false };
    }
}

export async function sendDiscordChapterNotificationAction(params: {
    webtoonTitle: string;
    chapterNumber: number;
    chapterTitle?: string;
    imageUrl: string;
    link: string;
    isMilestone?: boolean;
}) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("DISCORD_WEBHOOK_URL is not set");
        return { success: false, error: "Configuration missing" };
    }

    return await sendDiscordNotification({
        webhookUrl,
        ...params
    });
}
