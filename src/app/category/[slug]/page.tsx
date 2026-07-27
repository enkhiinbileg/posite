"use client";

import { useState, useEffect, use } from "react";
import { getVideosAction } from "@/app/actions/video-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, ChevronDown, Filter } from "lucide-react";
import Link from "next/link";

export default function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = use(params);
    const categorySlug = resolvedParams?.slug || "";
    const categoryName = decodeURIComponent(categorySlug);
    const formattedTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadVideos() {
            setLoading(true);
            try {
                const res = await getVideosAction();
                if (res.success && res.data) {
                    setVideos(res.data);
                } else {
                    setVideos([]);
                }
            } catch (err) {
                setVideos([]);
            } finally {
                setLoading(false);
            }
        }
        loadVideos();
    }, []);

    // Filter videos belonging to this category
    const catLower = categoryName.toLowerCase();
    const filteredVideos = videos.filter(v => {
        const vCat = (v.category || "").toLowerCase();
        const vDesc = (v.description || "").toLowerCase();
        const vTitle = (v.title || "").toLowerCase();
        return vCat.includes(catLower) || vDesc.includes(catLower) || vTitle.includes(catLower);
    });

    const formatCount = (num: number) => {
        if (!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(0) + "K";
        return num.toLocaleString();
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
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* CATEGORY HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/10 pb-4">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
                            {formattedTitle} Porn
                        </h1>
                        <span className="text-xs font-semibold text-zinc-400 font-mono">
                            ({filteredVideos.length > 0 ? formatCount(filteredVideos.length * 1583) : "1,583,334"})
                        </span>
                    </div>

                    <Link 
                        href="/videos"
                        className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                    >
                        ← Бүх Категориуд руу буцах
                    </Link>
                </div>

                {/* FILTER BAR (FUQ STYLE) */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { name: 'Date added', key: 'Date added' },
                            { name: 'Duration', key: 'Duration' },
                            { name: 'Quality', key: 'Quality' },
                            { name: 'VR', key: 'VR' },
                            { name: 'Source', key: 'Source' }
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
                        <span>Sort by:</span>
                        <button className="flex items-center gap-1 font-bold text-white hover:text-red-500 cursor-pointer">
                            <span>Popularity</span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* VIDEO GRID */}
                {filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                        {filteredVideos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/5 border border-white/10 rounded-3xl text-center space-y-4">
                        <Film className="w-12 h-12 text-zinc-500" />
                        <h3 className="text-lg font-bold text-white uppercase">{formattedTitle} ангилалд видео одоогоор нэмэгдээгүй байна</h3>
                        <p className="text-xs text-zinc-400 max-w-md">Админаас "Шинэ видео нэмэх" хэсэгт {formattedTitle} категоритой видео хадгалснаар энд харагдана.</p>
                        <Link 
                            href="/videos"
                            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-500 transition-colors"
                        >
                            Бусад видеонуудыг үзэх
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
