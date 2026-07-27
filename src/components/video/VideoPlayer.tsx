"use client";

import { useState } from "react";
import { Lock, Play, Gem, Ticket, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VideoPlayerProps {
    videoUrl: string;
    hasAccess: boolean;
    onPurchaseClick: (type: 'purchase' | 'rental') => void;
    thumbnail: string;
    loading?: boolean;
}

export function VideoPlayer({ videoUrl, hasAccess, onPurchaseClick, thumbnail, loading }: VideoPlayerProps) {
    const [isStarted, setIsStarted] = useState(false);

    if (loading) {
        return (
            <div className="aspect-video w-full rounded-3xl bg-zinc-900 flex flex-col items-center justify-center gap-4 border border-white/5">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-xs font-black text-muted uppercase tracking-widest">Бичлэгийг бэлдэж байна...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover blur-md opacity-40" alt="Locked" />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-10 text-center">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 md:mb-8 relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-all" />
                        <Lock className="w-8 h-8 md:w-12 md:h-12 text-primary relative z-10" />
                    </div>
                    <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter mb-3 md:mb-4 leading-tight">
                        Энэхүү бичлэг түгжигдсэн байна
                    </h3>
                    <p className="text-[10px] md:text-sm text-zinc-500 max-w-sm mb-6 md:mb-8 font-medium uppercase tracking-[0.1em] leading-relaxed">
                        Бичлэгийг үзэхийн тулд түрээслэх шаардлагатай.
                    </p>
                    
                    <div className="flex justify-center w-full max-w-xs">
                        <button 
                            onClick={() => onPurchaseClick('rental')}
                            className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] transition-all shadow-[0_0_40px_rgba(225,29,72,0.4)] flex items-center justify-center gap-3 hover:scale-105 hover:bg-rose-600 active:scale-95"
                        >
                            <Ticket className="w-5 h-5" />
                            Одоо үзэх
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const isCloudflareStream = (url: string) => {
        // Cloudflare Stream UIDs are exactly 32 hex characters
        return /^[a-f0-9]{32}$/i.test(url);
    };

    const youtubeId = getYoutubeId(videoUrl);
    const cfStreamId = isCloudflareStream(videoUrl) ? videoUrl : null;

    return (
        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black group shadow-2xl border border-white/5">
            {!isStarted ? (
                <div 
                    className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
                    onClick={() => setIsStarted(true)}
                >
                    <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover" alt="Start" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-24 h-24 rounded-full bg-primary/20 border border-primary/50 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.6)]"
                    >
                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                    </motion.div>
                </div>
            ) : (
                youtubeId ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : cfStreamId ? (
                    <iframe
                        src={`https://iframe.videodelivery.net/${cfStreamId}?autoplay=true&poster=${encodeURIComponent(thumbnail)}`}
                        className="w-full h-full border-none"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen
                    />
                ) : (
                    <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        className="w-full h-full"
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                    />
                )
            )}
        </div>
    );
}
