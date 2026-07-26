"use client";

import { motion } from "framer-motion";
import { Clock, ChevronRight, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCDNUrl } from "@/lib/storage-utils";

interface LatestUpdateCardProps {
    id: number | string; // Webtoon ID
    title: string;
    image: string;
    chapters: {
        id: number | string;
        title: string;
        createdAt: string;
    }[];
    className?: string;
    priority?: boolean;
}

export function LatestUpdateCard({
    id, title, image, chapters, className, priority
}: LatestUpdateCardProps) {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    // Take top 3 chapters
    const displayChapters = chapters.slice(0, 3);
    const hiddenCount = Math.max(0, chapters.length - 3);

    return (
        <div className={cn("group w-full", className)}>
            {/* Main Card */}
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 hover:bg-zinc-800/80 transition-all duration-500 relative overflow-hidden group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(229,9,20,0.15)]">

                {/* Top Section */}
                <div className="flex gap-4 mb-4">
                    {/* Thumbnail */}
                    <Link href={`/webtoon/${id}`} className="relative w-20 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors block active:scale-95 duration-200">
                        <Image
                            src={getCDNUrl(image, { width: 150, quality: 80 })}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="120px"
                            priority={priority}
                        />
                        {/* UP Badge */}
                        <div className="absolute top-0 left-0 bg-primary/90 text-white text-[10px] font-black px-2 py-0.5 rounded-br-xl backdrop-blur-md shadow-[0_0_10px_rgba(229,9,20,0.5)] z-10 animate-pulse border-r border-b border-primary/50">
                            UP
                        </div>
                        {/* Batch Indicator if many */}
                        {chapters.length > 1 && (
                            <div className="absolute top-0 right-0 bg-primary/90 text-black text-[10px] font-black px-2 py-0.5 rounded-bl-xl border-l border-b border-black/10">
                                +{chapters.length}
                            </div>
                        )}
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-primary/90 text-black flex items-center justify-center translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <ChevronRight className="w-5 h-5 ml-0.5" />
                            </div>
                        </div>
                    </Link>

                    {/* Title & Meta */}
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                        <Link href={`/webtoon/${id}`} className="block group/title">
                            <h3 className="font-bold text-[15px] text-zinc-100 truncate group-hover/title:text-primary transition-colors leading-tight mb-1.5">
                                {title}
                            </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                <Layers className="w-3 h-3 text-primary" />
                                <span className="font-medium text-zinc-300">{chapters.length} шинэ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chapter List */}
                <div className="space-y-1.5">
                    {displayChapters.map((chapter) => (
                        <Link
                            key={chapter.id}
                            href={`/webtoon/${id}/read/${chapter.id}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 hover:bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-200 group/chapter active:scale-[0.98] active:bg-white/10"
                        >
                            <span className="text-[12px] font-semibold text-zinc-300 group-hover/chapter:text-white truncate max-w-[170px] lg:max-w-[200px]">
                                {chapter.title}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-medium text-zinc-500 group-hover/chapter:text-primary/80 whitespace-nowrap">
                                    {formatTime(chapter.createdAt)}
                                </span>
                                <ChevronRight className="w-3 h-3 text-zinc-600 group-hover/chapter:text-primary transition-transform group-hover/chapter:translate-x-0.5" />
                            </div>
                        </Link>
                    ))}

                    {/* View All Button */}
                    {hiddenCount > 0 && (
                        <Link href={`/webtoon/${id}`} className="flex items-center justify-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-primary transition-colors py-2 border-t border-white/5 mt-2 active:scale-95">
                            <span>+{hiddenCount} удаагийн бүлэг үзэх</span>
                            <ChevronRight className="w-3 h-3" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
