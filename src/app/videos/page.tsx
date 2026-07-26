"use client";

import { useState, useEffect } from "react";
import { getVideosGroupedByWebtoonAction } from "@/app/actions/video-actions";
import { getCategoriesWithFirstVideoAction, CategoryWithStats } from "@/app/actions/category-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { CategoryGrid } from "@/components/category/CategoryGrid";
import { Film, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VideosPage() {
    const [groupedVideos, setGroupedVideos] = useState<any[]>([]);
    const [categories, setCategories] = useState<CategoryWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('Бүх видео');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [vidRes, catRes] = await Promise.all([
                    getVideosGroupedByWebtoonAction(),
                    getCategoriesWithFirstVideoAction()
                ]);

                if (vidRes.success) {
                    setGroupedVideos(vidRes.data || []);
                } else {
                    setError((vidRes as any).error || "Алдаа гарлаа");
                }

                if (catRes.success && catRes.data) {
                    setCategories(catRes.data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const allVideos = groupedVideos.flatMap(webtoon =>
        webtoon.videos.map((video: any) => ({
            ...video,
            uploader_name: webtoon.title,
            uploader_avatar: webtoon.image,
            genres: webtoon.genres
        }))
    );

    const filteredVideos = allVideos.filter(video => {
        if (activeTab === 'Бүх видео' || !activeTab) return true;
        const genres = Array.isArray(video.genres) ? video.genres : [];
        return genres.some((g: string) => g.toLowerCase() === activeTab.toLowerCase());
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ачаалж байна...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center">
                    <h2 className="text-xl font-black text-rose-500 mb-2 uppercase">Алдаа гарлаа</h2>
                    <p className="text-zinc-400 text-sm mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 mx-auto">
                        <RefreshCw className="w-4 h-4" /> Дахин оролдох
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] pt-[72px] pb-20">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* Most Popular Categories Grid (fuq.com style) */}
                <CategoryGrid
                    categories={categories}
                    selectedCategory={activeTab}
                    onSelectCategory={(cat) => {
                        if (activeTab === cat.name) {
                            setActiveTab('Бүх видео');
                        } else {
                            setActiveTab(cat.name);
                        }
                    }}
                    title="Most Popular Categories"
                />

                {/* Filter Header */}
                <div className="flex items-center justify-between mt-10 mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg md:text-xl font-black uppercase text-white tracking-wide">
                            {activeTab === 'Бүх видео' ? 'Бүх бичлэгүүд' : `${activeTab} бичлэгүүд`}
                        </h2>
                        {activeTab !== 'Бүх видео' && (
                            <button
                                onClick={() => setActiveTab('Бүх видео')}
                                className="text-xs text-primary underline font-bold hover:text-white transition-colors"
                            >
                                Цэвэрлэх
                            </button>
                        )}
                    </div>
                    <span className="text-xs font-bold text-zinc-400">
                        {filteredVideos.length} бичлэг олдлоо
                    </span>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 md:gap-x-6 gap-y-10 md:gap-y-12">
                    {filteredVideos.map((video) => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>

                {filteredVideos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 opacity-50 gap-6">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <Film className="w-8 h-8 text-white/30" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-white uppercase tracking-widest">Бичлэг олдсонгүй</h3>
                            <p className="text-xs text-zinc-400 mt-1 uppercase font-bold">Энэ категори дээр одоогоор бичлэг нэмэгдээгүй байна</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
