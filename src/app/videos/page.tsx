"use client";

import { useState, useEffect } from "react";
import { getVideosGroupedByWebtoonAction } from "@/app/actions/video-actions";
import { getCategoriesWithFirstVideoAction, CategoryWithStats } from "@/app/actions/category-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, RefreshCw, ChevronDown, Filter } from "lucide-react";

export default function VideosPage() {
    const [groupedVideos, setGroupedVideos] = useState<any[]>([]);
    const [categories, setCategories] = useState<CategoryWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('Бүх бичлэгүүд');

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
        if (activeTab === 'Бүх бичлэгүүд' || !activeTab) return true;
        const genres = Array.isArray(video.genres) ? video.genres : [];
        return genres.some((g: string) => g.toLowerCase() === activeTab.toLowerCase());
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin text-amber-500" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ачаалж байна...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-red-50 border border-red-200 p-8 rounded-2xl text-center shadow">
                    <h2 className="text-xl font-black text-red-600 mb-2 uppercase">Алдаа гарлаа</h2>
                    <p className="text-zinc-600 text-sm mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer">
                        <RefreshCw className="w-4 h-4" /> Дахин оролдох
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-zinc-900 pt-[68px] pb-24">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* FUQ Style Page Title Row */}
                <div className="flex items-baseline gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-zinc-900 font-sans">
                        {activeTab === 'Бүх бичлэгүүд' ? 'POV (Point Of View) Videos' : `${activeTab} Videos`}
                    </h1>
                    <span className="text-sm font-semibold text-zinc-400 font-sans">
                        ({(filteredVideos.length * 124800 || 9384381).toLocaleString()})
                    </span>
                </div>

                {/* FUQ Style Dropdown Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
                    {/* Left Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {['Date added', 'Duration', 'Quality', 'VR', 'Source'].map((filterName) => (
                            <button
                                key={filterName}
                                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                                <span>{filterName}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                        ))}
                    </div>

                    {/* Right Sort By Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                        <span>Sort by :</span>
                        <button className="flex items-center gap-1 font-bold text-zinc-900 hover:text-red-600 cursor-pointer">
                            <span>Popularity</span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* 100% FUQ Exact 5-Column Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {filteredVideos.map((video) => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>

                {filteredVideos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 opacity-60 gap-4">
                        <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center border border-zinc-300">
                            <Film className="w-7 h-7 text-zinc-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-zinc-800 uppercase tracking-wide">Бичлэг олдсонгүй</h3>
                            <p className="text-xs text-zinc-500 font-semibold">Энэ категори дээр одоогоор бичлэг нэмэгдээгүй байна</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
