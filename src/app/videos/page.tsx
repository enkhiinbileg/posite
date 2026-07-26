"use client";


import { useState, useEffect } from "react";
import { getVideosAction, getVideosGroupedByWebtoonAction } from "@/app/actions/video-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, Sparkles, History, Heart, Bookmark, ChevronLeft, Play, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";

const CATEGORIES = [
    { name: "Бүх видео", icon: <Film className="w-3.5 h-3.5" /> },
    { name: "Action" },
    { name: "Romance" },
    { name: "Fantasy" },
    { name: "Drama" },
    { name: "Comedy" },
    { name: "Thriller" },
    { name: "Horror" }
];

export default function VideosPage() {
    const [groupedVideos, setGroupedVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('Бүх видео');
    const [selectedWebtoon, setSelectedWebtoon] = useState<any | null>(null);

    useEffect(() => {
        async function fetchVideos() {
            const res = await getVideosGroupedByWebtoonAction();
            if (res.success) {
                setGroupedVideos(res.data || []);
            } else {
                setError(res.error);
                console.error("Fetch Error:", res.error);
            }
            setLoading(false);
        }
        fetchVideos();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center">
                    <h2 className="text-xl font-black text-rose-500 mb-2 uppercase">Алдаа гарлаа</h2>
                    <p className="text-zinc-400 text-sm mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold uppercase text-xs">Дахин оролдох</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] pt-[72px] pb-20">
            {/* Category Chips Bar */}
            {!selectedWebtoon && (
                <div className="sticky top-[72px] z-40 bg-[#0f0f0f]/95 backdrop-blur-md py-3 px-4 sm:px-6 lg:px-8 border-b border-white/5 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2.5 w-max">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={typeof cat === 'string' ? cat : cat.name}
                                onClick={() => setActiveTab(typeof cat === 'string' ? cat : cat.name)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 border",
                                    activeTab === (typeof cat === 'string' ? cat : cat.name)
                                        ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(225,29,72,0.1)]" 
                                        : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {typeof cat !== 'string' && cat.icon}
                                {typeof cat === 'string' ? cat : cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 md:gap-x-6 gap-y-10 md:gap-y-12">
                    {loading ? (
                        Array(10).fill(0).map((_, i) => (
                            <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
                        ))
                    ) : (
                        groupedVideos.flatMap(webtoon => 
                            webtoon.videos.map((video: any) => ({
                                ...video,
                                uploader_name: webtoon.title,
                                uploader_avatar: webtoon.image,
                                genres: webtoon.genres
                            }))
                        )
                        .filter(video => {
                            if (activeTab === 'Бүх видео') return true;
                            const genres = Array.isArray(video.genres) ? video.genres : [];
                            return genres.some((g: string) => g === activeTab);
                        })
                        .map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))
                    )}
                </div>
                {!loading && groupedVideos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 opacity-50 grayscale gap-6">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                            <Film className="w-10 h-10 text-white/20" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Бичлэг олдсонгүй</h3>
                            <p className="text-xs text-muted mt-2 uppercase font-bold">Тун удахгүй шинэ бичлэгүүд нэмэгдэх болно</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
