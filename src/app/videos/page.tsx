"use client";

import { useState, useEffect } from "react";
import { getVideosAction } from "@/app/actions/video-actions";
import { getCategoriesWithFirstVideoAction, CategoryWithStats } from "@/app/actions/category-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, RefreshCw, ChevronDown, X, Tag } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const DEFAULT_DEMO_CATEGORIES = [
    { id: "c1", name: "Friend", video_count: 1550000, first_video_thumbnail: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop" },
    { id: "c2", name: "Japanese", video_count: 6010000, first_video_thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
    { id: "c3", name: "Anime", video_count: 1310000, first_video_thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" },
    { id: "c4", name: "Teen 18+", video_count: 1310000, first_video_thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
    { id: "c5", name: "Korean", video_count: 127000, first_video_thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop" },
    { id: "c6", name: "Cheating", video_count: 1210000, first_video_thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
    { id: "c7", name: "Hot Mom", video_count: 1550000, first_video_thumbnail: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop" },
    { id: "c8", name: "Public", video_count: 4010000, first_video_thumbnail: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop" },
    { id: "c9", name: "Japanese Hardcore", video_count: 2000000, first_video_thumbnail: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400&auto=format&fit=crop" },
    { id: "c10", name: "Homemade", video_count: 624000, first_video_thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400&auto=format&fit=crop" },
    { id: "c11", name: "POV (Point Of View)", video_count: 828000, first_video_thumbnail: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop" },
    { id: "c12", name: "Chinese Teen 18+", video_count: 471000, first_video_thumbnail: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop" }
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
        is_free: true,
        category: "Japanese"
    },
    {
        id: "demo-2",
        title: "Point Of View Ultimate 4K Romance Scene",
        thumbnail_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        duration: "24:15",
        rating: 88,
        uploader_name: "MyToon Studio",
        is_free: false,
        category: "POV (Point Of View)"
    },
    {
        id: "demo-3",
        title: "Hot Anime Style Cosplay Special",
        thumbnail_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        duration: "12:08",
        rating: 91,
        uploader_name: "Anime Tube",
        is_free: true,
        category: "Anime"
    },
    {
        id: "demo-4",
        title: "VR 360 Full HD Premium Experience",
        thumbnail_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyceries.mp4",
        duration: "32:50",
        rating: 96,
        uploader_name: "Posite VR",
        is_free: false,
        category: "Teen 18+"
    },
    {
        id: "demo-5",
        title: "Asian Model POV Full Video 1080p",
        thumbnail_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop",
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        duration: "15:20",
        rating: 85,
        uploader_name: "Tokyo Tube",
        is_free: true,
        category: "Japanese"
    }
];

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

                if (catRes.success && catRes.data && catRes.data.length > 0) {
                    setCategories(catRes.data);
                } else {
                    setCategories(DEFAULT_DEMO_CATEGORIES);
                }

                if (vidRes.success && vidRes.data && vidRes.data.length > 0) {
                    setVideos(vidRes.data);
                } else {
                    setVideos(DEMO_VIDEOS);
                }
            } catch (err) {
                setCategories(DEFAULT_DEMO_CATEGORIES);
                setVideos(DEMO_VIDEOS);
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
        if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
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

                {/* 1. MOST POPULAR CATEGORIES SECTION (Dynamic thumbnails derived from newest uploaded video!) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                            <Tag className="w-5 h-5 text-red-600" /> Most Popular Categories
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
                                    <div className={`relative aspect-[16/10] rounded-xl overflow-hidden bg-white/5 shadow-md border transition-all ${
                                        isSelected 
                                            ? "border-red-600 ring-2 ring-red-600/50" 
                                            : "border-white/10 group-hover:border-red-600/50"
                                    }`}>
                                        {/* Dynamic Latest Video Thumbnail */}
                                        <img 
                                            src={cat.first_video_thumbnail || cat.thumbnail_url || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop"} 
                                            alt={cat.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                        />
                                        {/* Bottom-left View / Video Count Badge */}
                                        <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-md text-amber-400 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-amber-500/20 shadow">
                                            {formatCount(cat.video_count || 1550000)}
                                        </div>
                                    </div>
                                    <h3 className={`text-xs font-bold truncate transition-colors ${
                                        isSelected ? "text-red-500" : "text-zinc-300 group-hover:text-red-500"
                                    }`}>
                                        {cat.name}
                                    </h3>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* 2. VIDEOS GRID SECTION (Filtered by selected category!) */}
                <section className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-black tracking-tight text-white uppercase font-sans">
                            {selectedCategory ? `${selectedCategory} Videos` : "POV (Point Of View) Videos"}
                        </h2>
                        <span className="text-xs font-semibold text-zinc-400 font-sans">
                            ({(filteredVideos.length * 12480 || 9384381).toLocaleString()})
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
                        {(filteredVideos.length > 0 ? filteredVideos : videos).map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
