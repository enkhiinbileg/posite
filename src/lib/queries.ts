import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient, createPublicClient } from './supabase-server';
import { supabaseAdmin } from './supabase-admin';

export const getWebtoonCached = (id: number) => unstable_cache(
    async () => {
        try {
            console.log(`🔍 [${new Date().toISOString()}] Fetching webtoon ${id} from Supabase...`);
            const res = await supabaseAdmin
                .from('webtoons')
                .select('id, title, author, description, rating, image, genres, is_new, free_chapters, hero_position, is_nsfw')
                .eq('id', id)
                .single();
            
            if (res.data) return res;
            
            // If Supabase said not found (PGRST116) or return nothing, try Neon
            const isNotFound = res.error?.code === 'PGRST116';
            console.log(`⚠️ Supabase result for webtoon ${id}: ${isNotFound ? 'NOT_FOUND' : 'ERROR/EMPTY'}`);

            const { neonFetchWebtoonById } = await import('./neon');
            const neonRes = await neonFetchWebtoonById(id);
            
            if (neonRes.success && neonRes.webtoon) {
                console.log(`✅ Neon Fallback: Found webtoon ${id}`);
                return { data: neonRes.webtoon, error: null };
            }

            // CRITICAL: If Neon also doesn't find it BUT it was successful, we can return null (it truly doesn't exist)
            if (neonRes.success && !neonRes.webtoon) {
                console.warn(`🛑 Webtoon ${id} truly NOT FOUND in both databases.`);
                return res; // Original null from Supabase
            }

            // If we got here, it means Neon failed OR something else went wrong.
            // DO NOT return null, Throwing here prevents unstable_cache from caching the failure.
            throw new Error(`Webtoon ${id} fetch failed in both Supabase and Neon fallback.`);
        } catch (e: any) {
            console.error(`❌ [${new Date().toISOString()}] getWebtoonCached FATAL:`, e.message);
            // Re-throw so unstable_cache doesn't cache a 'null'
            throw e; 
        }
    },
    ['webtoons', String(id)],
    { tags: ['webtoons', `webtoon-${id}`], revalidate: 3600 }
)();

export const getChaptersCached = (webtoonId: number) => unstable_cache(
    async () => {
        try {
            const now = new Date().toISOString();
            console.log(`🔍 [${new Date().toISOString()}] Fetching chapters for webtoon ${webtoonId} from Supabase...`);
            const res = await supabaseAdmin
                .from('chapters')
                .select('id, title, published_at, created_at, date, images, order_index, chapter_number')
                .eq('webtoon_id', webtoonId)
                .eq('is_published', true)
                .or(`published_at.is.null,published_at.lte.${now}`)
                .order('order_index', { ascending: false });
            
            if (res.data && res.data.length > 0) return res;

            console.log(`⚠️ Supabase returned 0 chapters for webtoon ${webtoonId}, trying Neon fallback...`);
            const { neonFetchWebtoonById } = await import('./neon');
            const neonRes = await neonFetchWebtoonById(webtoonId);
            
            if (neonRes.success && neonRes.chapters && neonRes.chapters.length > 0) {
                const mapped = neonRes.chapters.map(c => ({
                    id: c.id,
                    title: c.title,
                    published_at: c.updated_at,
                    created_at: c.created_at,
                    date: c.updated_at,
                    images: c.images
                }));
                console.log(`✅ Neon Fallback: Found ${mapped.length} chapters for webtoon ${webtoonId}`);
                return { data: mapped, error: null };
            }
            
            if (neonRes.success) {
                console.warn(`🛑 Chapters for webtoon ${webtoonId} truly NOT FOUND (0 chapters).`);
                return res; 
            }

            throw new Error(`Chapters fetch for webtoon ${webtoonId} failed in both.`);
        } catch (e: any) {
            console.error(`❌ getChaptersCached Error:`, e.message);
            throw e;
        }
    },
    ['chapters', String(webtoonId)],
    { tags: ['chapters', `chapters-${webtoonId}`], revalidate: 3600 }
)();

export const getChapterCached = (chapterId: number) => unstable_cache(
    async () => {
        try {
            const now = new Date().toISOString();
            console.log(`🔍 [${new Date().toISOString()}] Fetching chapter ${chapterId} from Supabase...`);
            const res = await supabaseAdmin
                .from('chapters')
                .select('id, webtoon_id, chapter_number, title, images, published_at, translator_id, webtoons!chapters_webtoon_id_fkey(is_nsfw)')
                .eq('id', chapterId)
                .eq('is_published', true)
                .or(`published_at.is.null,published_at.lte.${now}`)
                .single();
            
            if (res.data) return res;

            const isNotFound = res.error?.code === 'PGRST116';
            console.log(`⚠️ Supabase chapter ${chapterId} result: ${isNotFound ? 'NOT_FOUND' : 'ERROR'}`);

            const { neonFetchChapterById } = await import('./neon');
            const neonRes = await neonFetchChapterById(chapterId);
            
            if (neonRes.success && neonRes.data) {
                console.log(`✅ Neon Fallback: Found chapter ${chapterId}`);
                return { data: neonRes.data, error: null };
            }

            if (neonRes.success && !neonRes.data) {
                console.warn(`🛑 Chapter ${chapterId} truly NOT FOUND.`);
                return res; 
            }

            throw new Error(`Chapter ${chapterId} fetch failed in both.`);
        } catch (e: any) {
            console.error(`❌ getChapterCached Error:`, e.message);
            throw e;
        }
    },
    ['chapter', String(chapterId)],
    { tags: ['chapters', `chapter-${chapterId}`], revalidate: 3600 }
)();

export const getAllChaptersCached = (webtoonId: number) => unstable_cache(
    async () => {
        try {
            const now = new Date().toISOString();
            const res = await supabaseAdmin
                .from('chapters')
                .select('id, title, published_at, order_index, chapter_number')
                .eq('webtoon_id', webtoonId)
                .eq('is_published', true)
                .or(`published_at.is.null,published_at.lte.${now}`)
                .order('order_index', { ascending: true });
            
            if (res.data && res.data.length > 0) return res;

            const { neonFetchWebtoonById } = await import('./neon');
            const neonRes = await neonFetchWebtoonById(webtoonId);
            
            if (neonRes.success && neonRes.chapters) {
                const mapped = (neonRes.chapters || []).map(c => ({
                    id: c.id,
                    title: c.title,
                    published_at: c.updated_at
                }));
                return { data: mapped, error: null };
            }
            
            if (neonRes.success) return res;

            throw new Error(`AllChapters fetch failed for ${webtoonId}`);
        } catch (e: any) {
            console.error(`❌ getAllChaptersCached Error:`, e.message);
            throw e;
        }
    },
    ['all-chapters', String(webtoonId)],
    { tags: ['chapters', `all-chapters-${webtoonId}`], revalidate: 3600 }
)();

export const getNsfwWebtoonsCached = () => unstable_cache(
    async () => {
        try {
            console.log(`🔍 [${new Date().toISOString()}] Fetching NSFW webtoons from Supabase...`);
            const res = await supabaseAdmin
                .from('webtoons')
                .select('*')
                .eq('is_nsfw', true)
                .order('rating', { ascending: false });
            
            if (res.data && res.data.length > 0) return res;

            // Fallback to Neon if needed (but primarily Supabase)
            const { neonFetchNsfwWebtoons } = await import('./neon');
            const neonRes = await neonFetchNsfwWebtoons();
            if (neonRes.success) return { data: neonRes.data, error: null };

            throw new Error(`NSFW webtoons fetch failed.`);
        } catch (e: any) {
            console.error(`❌ getNsfwWebtoonsCached Error:`, e.message);
            throw e;
        }
    },
    ['nsfw-webtoons-v2'],
    { tags: ['webtoons', 'nsfw'], revalidate: 3600 }
)();


export const getUserCached = cache(async () => {
    const supabase = await createClient();
    return supabase.auth.getUser();
});

export const getProfileCached = cache(async (userId: string) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('is_vip, vip_expiration, nsfw_vip_expiration, show_nsfw, is_admin, is_moderator, is_youtuber, is_translator')
        .eq('id', userId)
        .single();

    if (error || !data) return { data, error };

    // Set virtual boolean flags for frontend compatibility
    const enhancedData = {
        ...data,
        is_admin: data.is_admin || false,
        is_moderator: data.is_moderator || data.is_admin || false,
        is_vip: data.is_vip || false,
        vip_expiration: data.vip_expiration || null
    };

    return { data: enhancedData, error: null };
});
