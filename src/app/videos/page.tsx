"use client";

import { useState, useEffect } from "react";
import { getVideosAction } from "@/app/actions/video-actions";
import { getCategoriesWithFirstVideoAction, CategoryWithStats } from "@/app/actions/category-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, RefreshCw, ChevronDown, X, Tag } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

export default function VideosPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedCategory = searchParams.get("category") || "";

    const [categories, setCategories] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [vidRes, catRes] = await Promise.all([
                    getVideosAction(),
                    getCategoriesWithFirstVideoAction()
                ]);

                if (catRes.success && catRes.data) {
                    setCategories(catRes.data);
                } else {
                    setCategories([]);
                }

                if (vidRes.success && vidRes.data) {
                    setVideos(vidRes.data);
                } else {
                    setVideos([]);
                }
            } catch (err) {
                setCategories([]);
                setVideos([]);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Filter videos by selected category if active
    const filteredVideos = selectedCategory 
        ? videos.filter(v => {
            const catName = v.category || v.genres?.[0] || "";
            return catName.toLowerCase() === selectedCategory.toLowerCase();
          })
        : videos;

    const formatCount = (num: number) => {
        if (!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(0) + "K";
        return num.toString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0610] flex flex-col items-center justify-center gap-4 text-white">
                <Loader2 className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin text-red-600" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ачаалж байна...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0610] text-white pt-[68px] pb-24 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">

                {/* 1. CATEGORIES SECTION */}
                {categories.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                                <Tag className="w-5 h-5 text-red-600" /> Хамгийн их үзэлттэй категориуд
                            </h2>
                            {selectedCategory && (
                                <button 
                                    onClick={() => router.push('/videos')}
                                    className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" /> Шүүлтүүр цэвэрлэх
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {categories.map((cat) => {
                                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                                return (
                                    <Link 
                                        key={cat.id || cat.name} 
                                        href={`/videos?category=${encodeURIComponent(cat.name)}`}
                                        className="group block space-y-1.5 cursor-pointer"
                                    >
                                        <div className={`relative aspect-[16/10] rounded-xl overflow-hidden bg-white/5 shadow-md border ${
                                            isSelected 
                                                ? "border-red-600 ring-2 ring-red-600/50" 
                                                : "border-white/10"
                                        }`}>
                                            <img 
                                                src={cat.first_video_thumbnail || cat.thumbnail_url || "/images/placeholder-video.jpg"} 
                                                alt={cat.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-md text-amber-400 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-amber-500/20 shadow">
                                                {formatCount(cat.video_count || 0)}
                                            </div>
                                        </div>
                                        <h3 className={`text-xs font-bold truncate ${
                                            isSelected ? "text-red-500" : "text-zinc-300"
                                        }`}>
                                            {cat.name}
                                        </h3>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 2. VIDEOS GRID SECTION */}
                <section className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-black tracking-tight text-white uppercase font-sans">
                            {selectedCategory ? `${selectedCategory} Бичлэгүүд` : "Нийт Бичлэгүүд"}
                        </h2>
                        <span className="text-xs font-semibold text-zinc-400 font-sans">
                            ({filteredVideos.length.toLocaleString()})
                        </span>
                    </div>

                    {/* Filter Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { name: 'Огноо', key: 'Date added' },
                                { name: 'Хугацаа', key: 'Duration' },
                                { name: 'Бичлэгийн чанар', key: 'Quality' },
                                { name: 'VR Бичлэг', key: 'VR' },
                                { name: 'Эх сурвалж', key: 'Source' }
                            ].map((filter) => (
                                <button
                                    key={filter.key}
                                    className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                    <span>{filter.name}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                            <span>Эрэмбэлэх:</span>
                            <button className="flex items-center gap-1 font-bold text-white hover:text-red-500 cursor-pointer">
                                <span>Их үзэлттэй</span>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                        </div>
                    </div>

                    {/* Real Video Grid */}
                    {filteredVideos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                            {filteredVideos.map((video) => (
                                <VideoCard key={video.id} video={video} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
                            <Film className="w-12 h-12 text-zinc-500" />
                            <h3 className="text-base font-bold text-white">Одоогоор бичлэг нэмэгдээгүй байна</h3>
                            <p className="text-xs text-zinc-400">Админаас шинэ видео нэмсний дараа энд харагдана.</p>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
