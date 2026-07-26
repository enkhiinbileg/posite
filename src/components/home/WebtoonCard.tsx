"use client";

import { motion } from "framer-motion";
import { Star, Play, Plus, RotateCcw, CircleDot, CheckCircle2, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { getCDNUrl } from "@/lib/storage-utils";

interface WebtoonCardProps {
    id: number | string;
    title: string;
    chapter: string;
    rating: string;
    image: string;
    isNew?: boolean;
    isUpdated?: boolean;
    aspect?: "portrait" | "landscape";
    href?: string; // Optional custom link
    progressStatus?: "in-progress" | "finished";
    lastReadTime?: string;
    genres?: string[];
    priority?: boolean;
    updateBadge?: string;
    status?: string;
}

export function WebtoonCard({
    id, title, chapter, rating, image, isNew, isUpdated, aspect = "portrait", href,
    progressStatus, lastReadTime, genres, priority, updateBadge, status
}: WebtoonCardProps) {
    return (
        <Link href={href || `/webtoon/${id}`} className="block">
            <motion.div
                whileHover={{
                    scale: 1.03,
                    zIndex: 40
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="group relative flex-shrink-0 w-full"
            >
                <div className={cn(
                    "relative overflow-hidden rounded-xl bg-surface border border-white/5 card-glow transition-all duration-500",
                    aspect === "portrait" ? "aspect-[2/3]" : "aspect-video",
                    progressStatus === "in-progress" ? "ring-2 ring-primary/50 shadow-[0_0_20px_rgba(229,9,20,0.3)]" : ""
                )}>

                    <Image
                        src={getCDNUrl(image, { width: aspect === "portrait" ? 300 : 600, quality: 80 })}
                        alt={title}
                        fill
                        className={cn(
                            "object-cover transition-transform duration-1000 group-hover:scale-110",
                            progressStatus === "finished" ? "grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100" : ""
                        )}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 15vw"
                        priority={priority !== undefined ? priority : aspect === "landscape"} // Explicit priority or fallback for hero cards
                    />

                    {/* Quick View / History Content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-3">

                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 space-y-3">

                            {progressStatus ? (
                                // History Mode UI
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-lg",
                                            progressStatus === "in-progress" ? "bg-primary text-white" : "bg-white/20 text-white"
                                        )}>
                                            {progressStatus === "in-progress" ? "Үргэлжлүүлэх" : "Уншсан"}
                                        </span>
                                        {lastReadTime && (
                                            <span className="text-[9px] text-white/60 font-medium">
                                                {lastReadTime}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-black text-[11px] leading-tight uppercase text-white line-clamp-2">
                                        {title}
                                    </h3>

                                    <div className="flex items-center gap-2 pt-1">
                                        <button className={cn(
                                            "w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                            progressStatus === "in-progress"
                                                ? "bg-white text-black hover:bg-white/90"
                                                : "bg-white/10 text-white hover:bg-white/20"
                                        )}>
                                            {progressStatus === "in-progress" ? (
                                                <>
                                                    <Play className="w-3 h-3 fill-current" />
                                                    Унших
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-3 h-3" />
                                                    Дахин унших
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Default Discovery UI
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {genres?.slice(0, 2).map((genre) => (
                                            <span key={genre} className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                                {genre}
                                            </span>
                                        ))}
                                        {(!genres || genres.length === 0) && (
                                            <span className="text-[9px] bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">WEBTOON</span>
                                        )}
                                    </div>

                                    <h3 className="font-black text-[10px] lg:text-[11px] leading-tight uppercase italic tracking-tighter text-white drop-shadow-lg">
                                        {title}
                                    </h3>

                                    <div className="flex gap-2 pt-2">
                                        <button className="flex-1 bg-white text-black py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95">
                                            УНШИХ
                                        </button>
                                        <button className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all active:scale-95">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Update Badge (New Design) */}
                    {updateBadge && (
                        <div className="absolute top-2 left-2 px-2.5 py-1 bg-primary text-[9px] font-black text-white rounded-md shadow-lg z-10 border border-white/10 uppercase tracking-tighter">
                            {updateBadge}
                        </div>
                    )}

                    {isUpdated && !progressStatus && !updateBadge && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/90 backdrop-blur-sm text-[9px] font-black text-white rounded-md shadow-[0_0_10px_rgba(229,9,20,0.5)] z-10 border border-primary/50 uppercase tracking-widest flex items-center gap-1">
                            <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full" />
                            UP
                        </div>
                    )}



                    {progressStatus === "in-progress" && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-[8px] font-black text-black rounded-full shadow-lg z-10 uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            Reading
                        </div>
                    )}

                    {status && (
                        <div className={cn(
                            "absolute top-2 left-2 px-2 py-0.5 text-[8px] font-black text-white rounded-lg shadow-2xl z-10 border uppercase tracking-widest backdrop-blur-xl flex items-center gap-1 transition-all duration-300",
                            status === "Completed" ? "bg-blue-500/20 border-blue-400/30 shadow-blue-500/20" : 
                            status === "Hiatus" ? "bg-amber-500/20 border-amber-400/30 shadow-amber-500/20" :
                            "bg-emerald-500/20 border-emerald-400/30 shadow-emerald-500/20"
                        )}>
                            {status === "Completed" ? (
                                <>
                                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                                    <span className="drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] text-[7px] md:text-[8px]">Дууссан</span>
                                </>
                            ) : status === "Hiatus" ? (
                                <>
                                    <PauseCircle className="w-2.5 h-2.5 text-amber-400" />
                                    <span className="drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] text-[7px] md:text-[8px]">Завсарлага</span>
                                </>
                            ) : (
                                <>
                                    <CircleDot className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                                    <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] text-[7px] md:text-[8px]">Гарч байгаа</span>
                                </>
                            )}
                        </div>
                    )}

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-1 z-10 border border-white/10 shadow-xl transition-transform hover:scale-110">
                        <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                        <span className="text-[8px] font-black text-white">{rating}</span>
                    </div>

                </div>

                <div className="mt-2 px-1 space-y-0.5">
                    <h3 className={cn(
                        "font-black text-[10px] uppercase italic tracking-tighter line-clamp-1 transition-colors duration-300",
                        progressStatus === "finished" ? "text-muted" : "text-white group-hover:text-primary"
                    )}>
                        {title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            progressStatus === "in-progress" ? "text-primary" : "text-muted"
                        )}>
                            {(!chapter || chapter === 'Бүлэггүй') ? '0 Бүлэг' : chapter}
                        </span>

                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
