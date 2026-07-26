"use client";

import { motion } from "framer-motion";
import { Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { getCDNUrl } from "@/lib/storage-utils";

interface MatureWebtoonCardProps {
    item: any;
    hasAccess: boolean;
}

export function MatureWebtoonCard({ item, hasAccess }: MatureWebtoonCardProps) {
    return (
        <div className="relative group">
            <Link href={`/webtoon/${item.id}`}>
                <motion.div
                    whileHover={{ y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative"
                >
                    {/* Image Container */}
                    <div className="relative aspect-[3/4] overflow-hidden rounded-[2.5rem] shadow-2xl transition-all duration-500 border border-white/5 bg-[#0a0a0a]">
                        <Image
                            src={getCDNUrl(item.image, { width: 400, quality: 90 })}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        />

                        {/* Rating */}
                        <div className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-[10px] font-black text-white">{item.rating || "0.0"}</span>
                        </div>
                        
                        {/* Hover Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                    </div>

                    {/* Metadata (Crimson Shadow Style) */}
                    <div className="mt-6 px-4 space-y-1.5">
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-tight line-clamp-1 group-hover:text-red-600 transition-colors">
                            {item.title}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600/80">
                                {item.genres?.[0] || "Насанд хүрэгчид"}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 truncate">
                                {item.genres?.[1] || "Эротик"}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </Link>
        </div>
    );
}
