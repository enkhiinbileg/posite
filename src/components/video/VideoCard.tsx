"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Eye, Crown, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";

interface VideoCardProps {
    video: any;
}

export function VideoCard({ video }: VideoCardProps) {
    const isFree = video.is_free || (video.price_purchase === 0 && video.price_rental === 0);
    const duration = video.duration || "12:45";
    const views = video.views ? (video.views > 1000 ? `${(video.views / 1000).toFixed(1)}k` : video.views) : "14.2k";

    return (
        <Link href={`/videos/${video.id}`} className="group flex flex-col gap-2.5 cursor-pointer select-none">
            {/* FUQ Style Thumbnail Container */}
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#161220] border border-white/10 shadow-lg transition-all duration-300 group-hover:border-red-600/50 group-hover:shadow-[0_0_25px_rgba(229,9,20,0.25)]">
                <Image
                    src={video.thumbnail_url || "/images/placeholder-video.jpg"}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Top-Left HD Badge */}
                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                    HD
                </div>

                {/* Top-Right Free / VIP Badge */}
                <div className="absolute top-2 right-2 z-10">
                    {isFree ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white font-bold text-[10px] uppercase shadow">
                            ҮНЭГҮЙ
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] uppercase shadow flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-black" /> VIP
                        </span>
                    )}
                </div>

                {/* Bottom-Right Duration Badge */}
                <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold text-white tracking-tight">
                    {duration}
                </div>

                {/* Play Button Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/35 backdrop-blur-[1px]">
                    <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/50 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                </div>
            </div>

            {/* Video Details */}
            <div className="flex flex-col gap-1 px-0.5">
                {/* Title */}
                <h3 className="text-sm font-bold text-zinc-100 group-hover:text-red-500 transition-colors line-clamp-2 leading-snug tracking-tight">
                    {video.title}
                </h3>

                {/* Metadata Line */}
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{views} үзсэн</span>
                    </div>
                    <span>
                        {video.created_at ? formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: mn }) : 'Саяхан'}
                    </span>
                </div>
            </div>
        </Link>
    );
}
