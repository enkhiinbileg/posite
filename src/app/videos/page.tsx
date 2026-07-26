"use client";

import { useState, useEffect } from "react";
import { getVideosGroupedByWebtoonAction } from "@/app/actions/video-actions";
import { getCategoriesWithFirstVideoAction, CategoryWithStats } from "@/app/actions/category-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { CategoryGrid } from "@/components/category/CategoryGrid";
import { Film, Loader2, RefreshCw, Sparkles, Flame, TrendingUp } from "lucide-react";
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
            <div className="min-h-screen bg-[#0a0610] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin text-red-600" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ачаалж байна...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0610] flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-red-600/10 border border-red-600/20 p-8 rounded-3xl text-center">
                    <h2 className="text-xl font-black text-red-500 mb-2 uppercase">Алдаа гарлаа</h2>
                    <p className="text-zinc-400 text-sm mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer">
                        <RefreshCw className="w-4 h-4" /> Дахин оролдох
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0610] text-white pt-[72px] pb-24">
            <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

                {/* FUQ Style Quick Category Pills Header Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('Бүх видео')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                            activeTab === 'Бүх видео'
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                                : "bg-white/5 text-zinc-400 hover:bg-white/15 hover:text-white border border-white/10"
                        )}
                    >
                        <Flame className="w-3.5 h-3.5" /> Бүх бичлэгүүд
                    </button>

                    {categories.map((cat) => {
                        const isActive = activeTab === cat.name;
                        return (
                            <button
                                key={cat.id || cat.slug}
                                onClick={() => setActiveTab(isActive ? 'Бүх видео' : cat.name)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                                        : "bg-white/5 text-zinc-300 hover:bg-white/15 hover:text-white border border-white/10"
                                )}
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                </div>
                
                {/* Most Popular Categories Cards */}
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

                {/* Section Header */}
                <div className="flex items-center justify-between pt-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg md:text-xl font-extrabold uppercase text-white tracking-wide">
                            {activeTab === 'Бүх видео' ? 'Сүүлд нэмэгдсэн бичлэгүүд' : `${activeTab} бичлэгүүд`}
                        </h2>
                        {activeTab !== 'Бүх видео' && (
                            <button
                                onClick={() => setActiveTab('Бүх видео')}
                                className="text-xs text-red-500 underline font-bold hover:text-white transition-colors cursor-pointer"
                            >
                                Цэвэрлэх
                            </button>
                        )}
                    </div>
                    <span className="text-xs font-bold text-zinc-400">
                        {filteredVideos.length} бичлэг
                    </span>
                </div>

                {/* FUQ Responsive Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 md:gap-x-5 gap-y-8">
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
