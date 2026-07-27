"use client";

import { useState, useEffect } from "react";
import { getVideosGroupedByWebtoonAction, getVideosAction } from "@/app/actions/video-actions";
import { VideoCard } from "@/components/video/VideoCard";
import { Film, Loader2, RefreshCw, ChevronDown } from "lucide-react";

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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const vidRes = await getVideosAction();
                if (vidRes.success && vidRes.data && vidRes.data.length > 0) {
                    setVideos(vidRes.data);
                } else {
                    // Fallback to DEMO_VIDEOS if DB is empty so page looks amazing!
                    setVideos(DEMO_VIDEOS);
                }
            } catch (err: any) {
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
        <div className="min-h-screen bg-[#0a0610] text-white pt-[68px] pb-24">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* FUQ Style Page Title Row */}
                <div className="flex items-baseline gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white font-sans">
                        POV (Point Of View) Videos
                    </h1>
                    <span className="text-sm font-semibold text-zinc-400 font-sans">
                        (9,384,381)
                    </span>
                </div>

                {/* FUQ Style Dropdown Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
                    {/* Left Dropdown Filters */}
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

                    {/* Right Sort By Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                        <span>Sort by :</span>
                        <button className="flex items-center gap-1 font-bold text-white hover:text-red-500 cursor-pointer">
                            <span>Popularity</span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* 100% FUQ Exact 5-Column Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {videos.map((video) => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>
            </div>
        </div>
    );
}
