"use client";

import { useState, useEffect } from "react";
import { getVideosAction } from "@/app/actions/video-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import Link from "next/link";

const MOST_POPULAR_CATEGORIES = [
    { name: "Friend", count: "1.55M", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop" },
    { name: "Japanese", count: "6.01M", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
    { name: "Anime", count: "1.31M", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" },
    { name: "Teen 18+", count: "1.31M", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
    { name: "Korean", count: "127K", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop" },
    { name: "Cheating", count: "1.21M", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
    { name: "Hot Mom", count: "1.55M", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop" },
    { name: "Public", count: "4.01M", image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop" },
    { name: "Japanese Hardcore", count: "2.00M", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400&auto=format&fit=crop" },
    { name: "Homemade", count: "624K", image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400&auto=format&fit=crop" },
    { name: "POV (Point Of View)", count: "828K", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop" },
    { name: "Chinese Teen 18+", count: "471K", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop" },
    { name: "Cum Inside", count: "6.55M", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" },
    { name: "Animation", count: "1.41M", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop" },
    { name: "Skinny Big Tits", count: "467K", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
    { name: "Uncensored", count: "1.75M", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop" },
    { name: "Goth", count: "184K", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
    { name: "Hentai", count: "103K", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" }
];

const DEMO_VIDEOS = [
    {
        id: "demo-1",
        title: "Japanese Beauty POV Pure Experience HD",
        thumbnail_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        duration: "18:42",
        rating: 94,
        uploader_name: "FUQ Exclusive",
        is_free: true
    },
    {
        id: "demo-2",
        title: "Point Of View Ultimate 4K Romance Scene",
        thumbnail_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        duration: "24:15",
        rating: 88,
        uploader_name: "MyToon Studio",
        is_free: false
    },
    {
        id: "demo-3",
        title: "Hot Anime Style Cosplay Special",
        thumbnail_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        duration: "12:08",
        rating: 91,
        uploader_name: "Anime Tube",
        is_free: true
    },
    {
        id: "demo-4",
        title: "VR 360 Full HD Premium Experience",
        thumbnail_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyceries.mp4",
        duration: "32:50",
        rating: 96,
        uploader_name: "Posite VR",
        is_free: false
    },
    {
        id: "demo-5",
        title: "Asian Model POV Full Video 1080p",
        thumbnail_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        duration: "15:20",
        rating: 85,
        uploader_name: "Tokyo Tube",
        is_free: true
    }
];

export default function VideosPage() {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const vidRes = await getVideosAction();
                if (vidRes.success && vidRes.data && vidRes.data.length > 0) {
                    setVideos(vidRes.data);
                } else {
                    setVideos(DEMO_VIDEOS);
                }
            } catch (err) {
                setVideos(DEMO_VIDEOS);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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

                {/* 1. MOST POPULAR CATEGORIES SECTION (Dark Mode 6-Column Grid) */}
                <section className="space-y-4">
                    <h2 className="text-xl font-black tracking-tight text-white uppercase">
                        Most Popular Categories
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {MOST_POPULAR_CATEGORIES.map((cat) => (
                            <Link 
                                key={cat.name} 
                                href={`/videos?category=${encodeURIComponent(cat.name)}`}
                                className="group block space-y-1.5 cursor-pointer"
                            >
                                <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-white/5 shadow-md border border-white/10 group-hover:border-red-600/50 transition-all">
                                    <img 
                                        src={cat.image} 
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                    />
                                    {/* Bottom-left View Count Badge */}
                                    <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-md text-amber-400 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-amber-500/20 shadow">
                                        {cat.count}
                                    </div>
                                </div>
                                <h3 className="text-xs font-bold text-zinc-300 group-hover:text-red-500 truncate transition-colors">
                                    {cat.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* 2. POV VIDEOS SECTION (Dark Mode 5-Column Video Grid) */}
                <section className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-black tracking-tight text-white uppercase font-sans">
                            POV (Point Of View) Videos
                        </h2>
                        <span className="text-xs font-semibold text-zinc-400 font-sans">
                            (9,384,381)
                        </span>
                    </div>

                    {/* FUQ Style Dropdown Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {['Date added', 'Duration', 'Quality', 'VR', 'Source'].map((filterName) => (
                                <button
                                    key={filterName}
                                    className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                    <span>{filterName}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                            <span>Sort by :</span>
                            <button className="flex items-center gap-1 font-bold text-white hover:text-red-500 cursor-pointer">
                                <span>Popularity</span>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                        </div>
                    </div>

                    {/* 5-Column Video Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
