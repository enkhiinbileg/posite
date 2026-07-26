"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Ticket, Gem, MoreVertical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";

interface VideoCardProps {
    video: any;
}

export function VideoCard({ video }: VideoCardProps) {
    const isFree = video.is_free || (video.price_purchase === 0 && video.price_rental === 0);

    return (
        <Link href={`/videos/${video.id}`} className="group flex flex-col gap-3">
            {/* Thumbnail Container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_rgba(225,29,72,0.15)]">
                <Image
                    src={video.thumbnail_url || "/images/placeholder-video.jpg"}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Play Icon on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                </div>
            </div>

            {/* Info Container */}
            <div className="flex gap-3 px-1">
                {/* Channel Avatar (Small and clean) */}
                <div className="flex-shrink-0 mt-1">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 overflow-hidden border border-white/10 relative">
                        <Image 
                            src={video.uploader_avatar || "/logo.png"} 
                            alt="Channel" 
                            fill 
                            className="object-cover"
                        />
                    </div>
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0 relative">
                    <h3 className="text-[14px] font-bold text-white leading-tight line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-300">
                        {video.title}
                    </h3>
                    
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="text-[12px] font-bold text-zinc-400">
                                {video.uploader_name || "MyToon Studio"}
                            </span>
                            <CheckCircle2 className="w-3 h-3 text-primary fill-primary/20" />
                        </div>
                        
                        <div className="flex items-center text-[12px] font-bold text-zinc-500 uppercase tracking-tighter">
                            <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: mn })}</span>
                        </div>
                    </div>

                    {/* More Menu */}
                    <button className="absolute -right-2 -top-1 p-2 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </Link>
    );
}

