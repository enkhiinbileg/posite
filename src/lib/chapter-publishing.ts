import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDiscordNotification } from "@/lib/discord";

type ChapterRecord = {
    id: number;
    webtoon_id: number;
    chapter_number?: number | null;
    title?: string | null;
    images?: string[] | null;
    published_at?: string | null;
};

export function isFuturePublishDate(value?: string | null) {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time > Date.now();
}

export function isVisiblePublishedChapter(chapter: { is_published?: boolean | null; published_at?: string | null }) {
    if (!chapter.is_published) return false;
    if (!chapter.published_at) return true;
    return new Date(chapter.published_at).getTime() <= Date.now();
}

export async function revalidateChapterSurfaces(webtoonId: number) {
    revalidateTag("chapters", "max");
    revalidateTag("webtoons", "max");
    revalidateTag(`chapters-${webtoonId}`, "max");
    revalidatePath("/", "layout");
    revalidatePath("/admin/imagetrans", "page");
    revalidatePath("/admin/schedule", "page");
    revalidatePath("/admin/chapters", "page");
    revalidatePath(`/webtoon/${webtoonId}`, "page");
    revalidatePath(`/webtoon/${webtoonId}`, "layout");
}

export async function updateWebtoonChapterCountForPublished(webtoonId: number) {
    const now = new Date().toISOString();
    const { count, error: countError } = await supabaseAdmin
        .from("chapters")
        .select("*", { count: "exact", head: true })
        .eq("webtoon_id", webtoonId)
        .eq("is_published", true)
        .or(`published_at.is.null,published_at.lte.${now}`);

    if (countError) throw countError;

    const label = `${count || 0} Бүлэг`;
    const { error: updateError } = await supabaseAdmin
        .from("webtoons")
        .update({ chapter_count_label: label })
        .eq("id", webtoonId);

    if (updateError) throw updateError;
    return { count: count || 0, label };
}

export async function sendChapterReleaseSideEffects(chapter: ChapterRecord) {
    try {
        const { data: webtoonData } = await supabaseAdmin
            .from("webtoons")
            .select("title, image")
            .eq("id", chapter.webtoon_id)
            .single();

        const readUrl = `https://mytoon.site/webtoon/${chapter.webtoon_id}/read/${chapter.id}`;
        const imageUrl = webtoonData?.image || chapter.images?.[0] || "";
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (webhookUrl) {
            await sendDiscordNotification({
                webhookUrl,
                webtoonTitle: webtoonData?.title || "Webtoon",
                chapterNumber: Number(chapter.chapter_number || 0),
                chapterTitle: chapter.title || undefined,
                imageUrl,
                link: readUrl,
                isMilestone: false,
            });
        }

        const now = new Date().toISOString();
        const { count: publishedCount } = await supabaseAdmin
            .from("chapters")
            .select("*", { count: "exact", head: true })
            .eq("webtoon_id", chapter.webtoon_id)
            .eq("is_published", true)
            .or(`published_at.is.null,published_at.lte.${now}`);

        if (webhookUrl && publishedCount && publishedCount % 10 === 0) {
            const endRange = publishedCount;
            const startRange = Math.max(1, endRange - 9);
            await sendDiscordNotification({
                webhookUrl,
                webtoonTitle: webtoonData?.title || "Webtoon",
                chapterNumber: Number(chapter.chapter_number || 0),
                chapterTitle: `ШИНЭ: ${startRange}-${endRange} дугаар бүлэг орлоо!`,
                imageUrl,
                link: readUrl,
                isMilestone: true,
            });
        }
    } catch (error) {
        console.error("Chapter release side effects failed:", error);
    }
}

export async function publishDueChapterById(chapterId: number, force = false) {
    const now = new Date().toISOString();

    let query = supabaseAdmin
        .from("chapters")
        .update({ is_published: true })
        .eq("id", chapterId)
        .eq("is_published", false);

    if (!force) {
        query = query.lte("published_at", now);
    }

    const { data, error } = await query
        .select("id, webtoon_id, chapter_number, title, images, published_at")
        .maybeSingle();

    if (error) throw error;
    if (!data) return { success: true, published: false, skipped: true };

    await updateWebtoonChapterCountForPublished(data.webtoon_id);
    await revalidateChapterSurfaces(data.webtoon_id);
    await sendChapterReleaseSideEffects(data);

    return { success: true, published: true, data };
}

export async function publishDueScheduledChapters(limit = 25) {
    const now = new Date().toISOString();
    const { data: dueChapters, error } = await supabaseAdmin
        .from("chapters")
        .select("id")
        .eq("is_published", false)
        .not("published_at", "is", null)
        .lte("published_at", now)
        .order("published_at", { ascending: true })
        .limit(limit);

    if (error) throw error;

    const results = [];
    for (const chapter of dueChapters || []) {
        try {
            results.push(await publishDueChapterById(chapter.id));
        } catch (publishError: unknown) {
            const message = publishError instanceof Error ? publishError.message : String(publishError);
            console.error(`Scheduled publish failed for chapter ${chapter.id}:`, publishError);
            results.push({ success: false, chapterId: chapter.id, error: message });
        }
    }

    return {
        checked: dueChapters?.length || 0,
        published: results.filter((item) => "published" in item && item.published).length,
        results,
    };
}
