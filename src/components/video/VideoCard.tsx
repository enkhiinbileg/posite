"use client";

import Image from "next/image";
import Link from "next/link";
import { ThumbsUp, MoreVertical, CheckCircle2, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";

interface VideoCardProps {
    video: any;
}

export function VideoCard({ video }: VideoCardProps) {
    const isFree = video.is_free || false;
    const duration = video.duration || "12:45";
    const ratingPercent = video.rating || (Math.abs(video.id?.charCodeAt(0) || 75) % 30) + 70;
    const is4K = (video.id?.charCodeAt(0) || 0) % 2 === 0;
    const qualityTag = is4K ? "4K" : "HD";
    const sourceName = video.uploader_name || "FUQ.com";

    return (
        <div className="group flex flex-col gap-1.5 cursor-pointer select-none">
            {/* 16:9 Thumbnail Container */}
            <Link href={`/videos/${video.id}`} className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-sm group-hover:shadow-md transition-shadow">
                <Image
                    src={video.thumbnail_url || "/images/placeholder-video.jpg"}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    unoptimized
                />

                {/* Top-Right VIP or FREE Badge */}
                <div className="absolute top-1.5 right-1.5 z-10">
                    {!isFree ? (
                        <div className="px-1.5 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] uppercase tracking-tight flex items-center gap-1 shadow-md">
                            <Crown className="w-3 h-3 fill-black" /> VIP
                        </div>
                    ) : (
                        <div className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-tight shadow-md">
                            ҮНЭГҮЙ
                        </div>
                    )}
                </div>

                {/* Bottom-Left Green Like % Badge */}
                <div className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-[#e2f0d9]/95 text-[#276a3c] font-black text-[11px] flex items-center gap-1 shadow-sm border border-emerald-300/40">
                    <ThumbsUp className="w-3 h-3 fill-[#276a3c]" />
                    <span>{ratingPercent}%</span>
                </div>

                {/* Bottom-Right Duration & Quality Overlay */}
                <div className="absolute bottom-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[11px] font-bold flex items-center gap-1">
                    <span className="text-zinc-300 font-sans text-[10px] font-black">{qualityTag}</span>
                    <span>{duration}</span>
                </div>
            </Link>

            {/* Info Below Thumbnail */}
            <div className="flex flex-col gap-0.5 px-0.5">
                {/* Title + 3-dots Menu */}
                <div className="flex items-start justify-between gap-1">
                    <Link href={`/videos/${video.id}`} className="font-bold text-[13px] text-white hover:text-red-500 transition-colors line-clamp-1 leading-snug">
                        {video.title}
                    </Link>
                    <button className="text-zinc-400 hover:text-zinc-200 p-0.5 flex-shrink-0 cursor-pointer">
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Meta Line: Source site + Checkmark + Upload time */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <div className="flex items-center gap-1 truncate max-w-[130px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 fill-zinc-700 flex-shrink-0" />
                        <span className="truncate hover:underline cursor-pointer">{sourceName}</span>
                    </div>
                    <span className="flex-shrink-0 text-zinc-400">
                        {video.created_at ? formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: mn }) : '1 долоо хоногийн өмнө'}
                    </span>
                </div>
            </div>
        </div>
    );
}
