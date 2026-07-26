import { notFound } from 'next/navigation';
import { ReaderClient } from './ReaderClient';
import { getWebtoonCached, getChapterCached, getAllChaptersCached } from '@/lib/queries';
import { getCDNUrl } from '@/lib/storage-utils';
import { getSiteSettings } from '@/app/actions/settings-actions';

interface Props {
    id: string;
    chapterId: string;
}

export async function ReaderContent({ id, chapterId }: Props) {
    // Parallel fetch ALL critical and non-critical metadata at once
    const [chapterRes, webtoonRes, allChaptersRes, settingsRes] = await Promise.all([
        getChapterCached(Number(chapterId)),
        getWebtoonCached(Number(id)),
        getAllChaptersCached(Number(id)),
        getSiteSettings()
    ]);

    const chapter = chapterRes?.data;
    const webtoon = webtoonRes?.data;
    const allChapters = allChaptersRes?.data || [];
    const settings = settingsRes?.settings || {};
    const isNsfwFree = settings.is_nsfw_free_period === true;

    if (!webtoon || !chapter) {
        notFound();
    }

    // NSFW Access Control
    const { getUserCached, getProfileCached } = await import('@/lib/queries');
    const { data: { user } } = await getUserCached();
    const { data: profile } = user ? await getProfileCached(user.id) : { data: null };

    const isNsfw = (webtoon as any).is_nsfw;
    const isNsfwVip = profile?.nsfw_vip_expiration 
        ? new Date(profile.nsfw_vip_expiration) > new Date() 
        : false;
    const hasBypass = profile?.is_admin || profile?.is_moderator;
    
    // Calculate index to check if it's within free chapters range
    const currentIndex = allChapters.findIndex(c => String(c.id) === String(chapterId));
    const freeChaptersCount = (webtoon as any).free_chapters ?? 1;
    const isFreeChapter = currentIndex !== -1 && currentIndex < freeChaptersCount;

    console.log(`[ACCESS_DEBUG] Webtoon: ${webtoon.title}, Chapter: ${chapter.title}`);
    console.log(`[ACCESS_DEBUG] isNsfw: ${isNsfw}, isNsfwVip: ${isNsfwVip}, hasBypass: ${hasBypass}, isNsfwFree: ${isNsfwFree}`);
    console.log(`[ACCESS_DEBUG] currentIndex: ${currentIndex}, freeChaptersCount: ${freeChaptersCount}, isFreeChapter: ${isFreeChapter}`);

    if (isNsfw && !isNsfwVip && !hasBypass && !isNsfwFree && !isFreeChapter) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-8 p-10 rounded-[3rem] bg-surface border border-white/5 shadow-2xl">
                    <div className="inline-flex p-6 bg-primary/10 rounded-full">
                        <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black uppercase italic text-white tracking-widest">+18 VIP Шаардлагатай</h2>
                        <p className="text-muted font-medium">Энэ вэбтүүнийг уншихын тулд +18 VIP эрх сунгах шаардлагатай. Таны одоогийн VIP эрх үүнд хамаарахгүй болохыг анхаарна уу.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <a href="/vip" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all">Эрх сунгах</a>
                        <a href="/" className="text-muted text-xs font-bold hover:text-white transition-colors">Нүүр хуудас руу буцах</a>
                    </div>
                </div>
            </div>
        );
    }

    // Construct ultra-fast preload URLs for the first 2 images using AVIF for maximum compression
    const preloadImages = (chapter.images || []).slice(0, 2).map((url: string) => 
        getCDNUrl(url, { width: 800, quality: 75, format: 'avif' })
    );

    return (
        <>
            {/* Server-Side Preload Hints for the browser's preload scanner */}
            {preloadImages.map((src: string) => (
                <link key={src} rel="preload" as="image" href={src} fetchPriority="high" />
            ))}
            
            <ReaderClient
                key={chapterId}
                id={id}
                chapterId={chapterId}
                initialChapter={chapter}
                initialWebtoon={webtoon as any}
                initialAllChapters={allChapters as any[]}
                isNsfwFreeOverride={isNsfwFree}
            />
        </>
    );
}
