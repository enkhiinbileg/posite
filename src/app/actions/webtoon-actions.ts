"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath, revalidateTag } from "next/cache";
import {
    isFuturePublishDate,
    publishDueChapterById,
    publishDueScheduledChapters,
    revalidateChapterSurfaces,
    sendChapterReleaseSideEffects,
    updateWebtoonChapterCountForPublished,
} from "@/lib/chapter-publishing";

interface WebtoonData {
    id?: number;
    title: string;
    author: string;
    description: string;
    image: string;
    rating: number;
    genres: string[];
    is_new: boolean;
    is_nsfw?: boolean;
    free_chapters: number;
    hero_position: number;
    chapter_count_label?: string;
    status?: string;
}

export async function createWebtoonAction(data: WebtoonData) {
    try {
        const { data: createdData, error } = await supabaseAdmin
            .from('webtoons')
            .insert({
                title: data.title,
                author: data.author,
                description: data.description,
                rating: data.rating,
                image: data.image,
                genres: data.genres,
                is_new: data.is_new,
                is_nsfw: data.is_nsfw || false,
                free_chapters: data.free_chapters,
                hero_position: data.hero_position,
                chapter_count_label: data.chapter_count_label || "0 Бүлэг",
                status: data.status || "Ongoing"
            })
            .select()
            .single();

        if (error) throw error;

        // @ts-ignore
        revalidateTag("webtoons");
        // @ts-ignore
        revalidatePath("/admin/webtoons");
        // @ts-ignore
        revalidatePath("/");

        return { success: true, data: createdData };
    } catch (error: any) {
        console.error("createWebtoonAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateWebtoonAction(data: WebtoonData) {
    if (!data.id) return { success: false, error: "ID is required for update" };

    try {
        const { data: updatedData, error } = await supabaseAdmin
            .from('webtoons')
            .update({
                title: data.title,
                author: data.author,
                description: data.description,
                rating: data.rating,
                image: data.image,
                genres: data.genres,
                is_new: data.is_new,
                is_nsfw: data.is_nsfw || false,
                free_chapters: data.free_chapters,
                hero_position: data.hero_position,
                status: data.status
            })
            .eq('id', data.id)
            .select()
            .single();

        if (error) throw error;

        // @ts-ignore
        revalidateTag("webtoons");
        // @ts-ignore
        revalidateTag("chapters"); // Crucial for reader logic
        // @ts-ignore
        revalidatePath("/admin/webtoons");
        // @ts-ignore
        revalidatePath(`/admin/webtoons/${data.id}`);
        // @ts-ignore
        revalidatePath("/");
        // @ts-ignore
        revalidatePath(`/webtoon/${data.id}`, "layout"); // Revalidate the whole webtoon section

        return { success: true, data: updatedData };
    } catch (error: any) {
        console.error("updateWebtoonAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function publishChapterAction(data: {
    webtoon_id: number;
    chapter_number: number;
    title: string;
    images: string[];
    edit_state: any;
    is_published: boolean;
    translator_id: string | null;
    scheduled_at?: string | null;
    publish_mode?: "now" | "schedule" | "draft";
}) {
    try {
        const scheduledAt = data.scheduled_at || null;
        const shouldSchedule = data.publish_mode === "schedule" || isFuturePublishDate(scheduledAt);
        const shouldPublishNow = data.publish_mode !== "draft" && data.is_published && !shouldSchedule;

        const { data: existingChapter } = await supabaseAdmin
            .from('chapters')
            .select('id, is_published')
            .eq('webtoon_id', data.webtoon_id)
            .eq('chapter_number', data.chapter_number)
            .maybeSingle();

        const { data: createdChapter, error } = await supabaseAdmin
            .from('chapters')
            .upsert({
                webtoon_id: data.webtoon_id,
                chapter_number: data.chapter_number,
                title: data.title,
                images: data.images,
                edit_state: data.edit_state,
                is_published: shouldPublishNow,
                translator_id: data.translator_id,
                created_by: data.translator_id, // Ensure created_by is also set
                order_index: data.chapter_number, // Default order index matches chapter number
                published_at: shouldSchedule ? scheduledAt : (shouldPublishNow ? new Date().toISOString() : null)
            }, { 
                onConflict: 'webtoon_id, chapter_number'
            })
            .select()
            .single();

        if (error) throw error;

        // Update the chapter count label automatically
        await updateWebtoonChapterCount(data.webtoon_id);

        await revalidateChapterSurfaces(data.webtoon_id);
        
        // --- SOCIAL NOTIFICATIONS ---
        if (shouldPublishNow && !existingChapter?.is_published) {
            await sendChapterReleaseSideEffects(createdChapter);
        }
        // ---------------------------

        return {
            success: true,
            data: createdChapter,
            status: shouldSchedule ? "scheduled" : (shouldPublishNow ? "published" : "draft")
        };
    } catch (error: any) {
        console.error("publishChapterAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getWebtoonsAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('webtoons')
            .select('id, title, is_nsfw, image')
            .order('title');

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("getWebtoonsAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getAdminWebtoonsAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('webtoons')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("getAdminWebtoonsAction Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getAdminChaptersAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .select('id, title, chapter_number, created_at, created_by, is_published, published_at, webtoon_id, webtoons(title, image, author)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("getAdminChaptersAction Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getChapterScheduleAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .select('id, webtoon_id, chapter_number, title, images, is_published, published_at, created_at, created_by, translator_id, webtoons(id, title, image, author)')
            .order('published_at', { ascending: false, nullsFirst: true })
            .limit(250);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("getChapterScheduleAction Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function updateChapterScheduleAction(chapterId: number, scheduledAt: string) {
    try {
        const scheduledDate = new Date(scheduledAt);
        if (!Number.isFinite(scheduledDate.getTime())) {
            throw new Error("Invalid schedule date");
        }

        const { data, error } = await supabaseAdmin
            .from('chapters')
            .update({
                is_published: false,
                published_at: scheduledDate.toISOString()
            })
            .eq('id', chapterId)
            .select('id, webtoon_id')
            .single();

        if (error) throw error;
        await updateWebtoonChapterCount(data.webtoon_id);
        await revalidateChapterSurfaces(data.webtoon_id);
        return { success: true, data };
    } catch (error: any) {
        console.error("updateChapterScheduleAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function cancelChapterScheduleAction(chapterId: number) {
    try {
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .update({
                is_published: false,
                published_at: null
            })
            .eq('id', chapterId)
            .select('id, webtoon_id')
            .single();

        if (error) throw error;
        await updateWebtoonChapterCount(data.webtoon_id);
        await revalidateChapterSurfaces(data.webtoon_id);
        return { success: true, data };
    } catch (error: any) {
        console.error("cancelChapterScheduleAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function publishChapterNowAction(chapterId: number) {
    try {
        return await publishDueChapterById(chapterId, true);
    } catch (error: any) {
        console.error("publishChapterNowAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function publishDueScheduledChaptersAction(limit = 25) {
    try {
        const result = await publishDueScheduledChapters(limit);
        return { success: true, ...result };
    } catch (error: any) {
        console.error("publishDueScheduledChaptersAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getAdminBannersAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('banners')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("getAdminBannersAction Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}


export async function reorderChaptersAction(chapterUpdates: { id: number, order_index: number }[]) {
    try {
        console.log(`[REORDER] Updating ${chapterUpdates.length} chapters...`);
        
        // Use a loop for now, or an RPC for better performance
        for (const update of chapterUpdates) {
            await supabaseAdmin
                .from('chapters')
                .update({ order_index: update.order_index })
                .eq('id', update.id);
        }

        // @ts-ignore
        revalidateTag("chapters");
        
        return { success: true };
    } catch (error: any) {
        console.error("reorderChaptersAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateWebtoonChapterCount(webtoonId: number) {
    try {
        const result = await updateWebtoonChapterCountForPublished(webtoonId);
        return { success: true, ...result };
    } catch (error: any) {
        console.error("updateWebtoonChapterCount Error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteChapterAction(chapterId: number, webtoonId: number) {
    try {
        const { error } = await supabaseAdmin
            .from('chapters')
            .delete()
            .eq('id', chapterId);

        if (error) throw error;

        // Update the chapter count label automatically
        await updateWebtoonChapterCount(webtoonId);

        // @ts-ignore
        revalidateTag("chapters");
        // @ts-ignore
        revalidateTag("webtoons");
        // @ts-ignore
        revalidatePath(`/webtoon/${webtoonId}`);
        // @ts-ignore
        revalidatePath("/admin/webtoons");
        // @ts-ignore
        revalidatePath(`/admin/webtoons/${webtoonId}`);
        // @ts-ignore
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        console.error("deleteChapterAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function syncAllWebtoonChapterCounts() {
    try {
        const { data: webtoons, error } = await supabaseAdmin
            .from('webtoons')
            .select('id, title');

        if (error) throw error;

        console.log(`🔄 Syncing chapter counts for ${webtoons.length} webtoons...`);

        const results = await Promise.all(
            webtoons.map(async (w) => {
                const res = await updateWebtoonChapterCount(w.id);
                return { id: w.id, title: w.title, ...res };
            })
        );

        // @ts-ignore
        revalidatePath("/");
        // @ts-ignore
        revalidatePath("/admin/webtoons");

        // Additionally clear all tags for safety
        await clearCacheAction();

        return { success: true, results };
    } catch (error: any) {
        console.error("syncAllWebtoonChapterCounts Error:", error);
        return { success: false, error: error.message };
    }
}

export async function clearCacheAction() {
    try {
        // @ts-ignore
        revalidateTag('webtoons');
        // @ts-ignore
        revalidateTag('chapters');
        // @ts-ignore
        revalidatePath('/', 'layout');
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function syncToNeonAction() {
    try {
        console.log("🚀 Starting manual Sync: Supabase → Neon");
        const { neonFetchWebtoons } = await import('@/lib/neon');
        const neonSql = (await import('@/lib/neon')).default;

        // 1. Fetch from Supabase
        const [{ data: webtoons }, { data: chapters }] = await Promise.all([
            supabaseAdmin.from('webtoons').select('*'),
            supabaseAdmin.from('chapters').select('id, webtoon_id, title, chapter_number, order_index, images, views, is_published, created_at, published_at')
        ]);

        if (!webtoons || !chapters) throw new Error("Failed to fetch data from Supabase");

        // 2. Sync Webtoons
        let wCount = 0;
        for (const w of webtoons) {
            try {
                // @ts-ignore
                await neonSql`
                    INSERT INTO webtoons (id, title, description, image, genres, status, rating, is_new, is_nsfw, created_at)
                    VALUES (${w.id}, ${w.title}, ${w.description}, ${w.image}, ${w.genres}, ${w.status}, ${w.rating}, ${w.is_new}, ${w.is_nsfw || false}, ${w.created_at})
                    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, image=EXCLUDED.image, status=EXCLUDED.status, rating=EXCLUDED.rating, is_nsfw=EXCLUDED.is_nsfw
                `;
                wCount++;
            } catch (e) {
                console.error(`Error syncing webtoon ${w.id}:`, e);
            }
        }

        // 3. Sync Chapters
        let cCount = 0;
        for (const c of chapters) {
            try {
                // @ts-ignore
                await neonSql`
                    INSERT INTO chapters (id, webtoon_id, title, order_index, images, view_count, is_published, created_at, updated_at)
                    VALUES (${c.id}, ${c.webtoon_id}, ${c.title}, ${c.order_index || c.chapter_number || 0}, ${JSON.stringify(c.images || [])}, ${c.views || 0}, ${c.is_published}, ${c.created_at}, ${c.published_at || c.created_at})
                    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, images=EXCLUDED.images, order_index=EXCLUDED.order_index, is_published=EXCLUDED.is_published
                `;
                cCount++;
            } catch (e) {
                console.error(`Error syncing chapter ${c.id}:`, e);
            }
        }

        console.log(`✅ Sync Completed: ${wCount} webtoons, ${cCount} chapters`);
        return { success: true, webtoons: wCount, chapters: cCount };
    } catch (error: any) {
        console.error("syncToNeonAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteWebtoonAction(id: number) {
    try {
        const { error } = await supabaseAdmin
            .from('webtoons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // @ts-ignore
        revalidateTag("webtoons");
        // @ts-ignore
        revalidateTag("nsfw");
        // @ts-ignore
        revalidatePath("/admin/webtoons");
        // @ts-ignore
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        console.error("deleteWebtoonAction Error:", error);
        return { success: false, error: error.message };
    }
}
