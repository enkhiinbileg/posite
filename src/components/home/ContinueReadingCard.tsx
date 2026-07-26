"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { getCDNUrl } from "@/lib/storage-utils";

interface ContinueReadingCardProps {
    id: number | string;
    title: string;
    image: string;
    lastReadChapterId: number | string;
    lastReadChapterTitle?: string;
    totalChapters: number;
    priority?: boolean;
    isUpdated?: boolean;
}

export function ContinueReadingCard({
    id, title, image, lastReadChapterId, lastReadChapterTitle, totalChapters, priority
}: ContinueReadingCardProps) {
    // Math to get percentage based on actual chapter number
    let chapterNum = 50; 
    if (lastReadChapterTitle) {
        const match = lastReadChapterTitle.match(/\d+/);
        if (match) chapterNum = parseInt(match[0], 10);
    }
    const progress = totalChapters > 0
        ? Math.min((chapterNum / totalChapters) * 100, 100)
        : Math.min(Math.max((chapterNum / (chapterNum + 20)) * 100, 10), 95); // dynamic visual fallback

    // Clean up the label. E.g. "Бүлэг 12" -> "12-Р АНГИ". Or if it already says "12", "12-Р АНГИ".
    let label = lastReadChapterTitle || "1";
    if (/^\d+$/.test(label.trim())) {
        label = `${label.trim()}-Р АНГИ`;
    } else if (label.toLowerCase().includes("бүлэг")) {
        label = label.replace(/бүлэг/i, "").trim() + "-Р АНГИ";
    }

    return (
        <Link href={`/webtoon/${id}/read/${lastReadChapterId}`} className="block relative w-full group rounded-md bg-[#13151a] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5">
            <div className="relative aspect-[3/4] w-full">
                <Image
                    src={getCDNUrl(image, { width: 400, quality: 80 })}
                    alt={title}
                    fill
                    className="object-cover"
                    priority={priority}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-90" />
                
                {/* Top-left Episode Badge like Anime Sites */}
                <div className="absolute top-0 left-0 bg-[#e53e3e] px-2 py-[3px] rounded-br-md z-10 transition-transform origin-top-left group-hover:scale-105">
                    <span className="text-[10px] font-semibold text-white tracking-widest uppercase truncate max-w-[120px] inline-block">{label}</span>
                </div>

                {/* Title overlay exactly at the bottom */}
                <div className="absolute bottom-3 left-0 right-0 px-2 text-center pb-2">
                    <h3 className="font-black text-sm text-white uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide group-hover:text-red-400 transition-colors">
                        {title}
                    </h3>
                </div>
            </div>
            
            {/* Extremely flush progress bar right on the edge */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/20">
                <div 
                    className="h-full bg-[#e53e3e]" 
                    style={{ width: `${progress}%` }} 
                />
            </div>
        </Link>
    );
}
