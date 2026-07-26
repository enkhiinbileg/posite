import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { WebtoonDetailClient } from './WebtoonDetailClient';
import { Search } from 'lucide-react';
import { getCDNUrl } from '@/lib/storage-utils';
import { getWebtoonCached, getChaptersCached } from '@/lib/queries';

export const revalidate = 3600; // Cache for 1 hour, but we will invalidate with tags

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const { data: webtoon } = await getWebtoonCached(Number(id));

    if (!webtoon) {
        return {
            title: 'WEBTOON - Олдсонгүй',
        };
    }

    return {
        title: `${webtoon.title} - WEBTOON`,
        description: webtoon.description,
        openGraph: {
            title: webtoon.title,
            description: webtoon.description,
            images: [getCDNUrl(webtoon.image)],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: webtoon.title,
            description: webtoon.description,
            images: [getCDNUrl(webtoon.image)],
        },
    };
}

export default async function WebtoonDetailPage({ params }: Props) {
    const { id } = await params;
    const webtoonId = Number(id);

    // Parallel server-side fetch using cached queries (now with internal Neon fallback)
    const [webtoonRes, chaptersRes] = await Promise.all([
        getWebtoonCached(webtoonId),
        getChaptersCached(webtoonId)
    ]);

    const webtoon = webtoonRes?.data;
    const chapters = (chaptersRes?.data || []) as any[];

    if (!webtoon) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white bg-background">
                <Search className="w-16 h-16 text-muted/20 mb-6" />
                <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">Вэбтүүн олдсонгүй</h1>
                <p className="text-muted mb-8 font-medium">Уучлаарай, таны хайсан вэбтүүн манай санд байхгүй байна эсвэл түр зуурын саатал гарлаа.</p>
                <a
                    href="/"
                    className="px-8 py-3 bg-primary text-white rounded-2xl font-black tracking-widest uppercase text-sm hover:scale-105 active:scale-95 transition-all"
                >
                    НҮҮР ХУУДАС РУУ БУЦАХ
                </a>
            </div>
        );
    }

    return (
        <WebtoonDetailClient
            id={webtoonId}
            initialWebtoon={webtoon as any}
            initialChapters={chapters}
        />
    );
}
