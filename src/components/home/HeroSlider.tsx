"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { getCDNUrl } from "@/lib/storage-utils";

interface HeroSliderProps {
    initialFeatured?: any[];
}

export function HeroSlider({ initialFeatured }: HeroSliderProps) {
    const [index, setIndex] = useState(0);
    const [featured, setFeatured] = useState<any[]>(initialFeatured || []);
    const [loading, setLoading] = useState(!initialFeatured);

    useEffect(() => {
        if (initialFeatured && initialFeatured.length > 0) {
            setLoading(false);
            return;
        }

        async function fetchFeatured() {
            setLoading(true);
            const { data } = await supabase
                .from('banners')
                .select('*, webtoons(*)') // Using * instead of nested chapters(id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (data && data.length > 0) {
                const formatted = data.map(b => {
                    return {
                        ...b.webtoons,
                        id: b.webtoon_id,
                        title: b.title || b.webtoons.title,
                        description: b.description || b.webtoons.description,
                        image: b.image_url || b.webtoons.image,
                        mobileImage: b.image_mobile_url,
                        firstChapterId: null // Handled in the button Link now or if we fetch it separately
                    };
                });
                setFeatured(formatted);
            }
            setLoading(false);
        }
        fetchFeatured();
    }, [initialFeatured]);

    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (featured.length === 0 || isPaused) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % featured.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [featured, isPaused]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                prev();
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 15000); // Resume after 15s
            } else if (e.key === 'ArrowRight') {
                next();
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 15000);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [featured.length]);

    const next = () => {
        setIndex((prev) => (prev + 1) % featured.length);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 15000);
    };

    const prev = () => {
        setIndex((prev) => (prev - 1 + featured.length) % featured.length);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 15000);
    };

    if (loading) {
        return (
            <div className="relative h-[650px] lg:h-[900px] w-full bg-gradient-to-br from-surface/50 via-background to-surface/30 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-end pb-20 lg:pb-32 px-6 lg:px-20 max-w-[1600px] mx-auto w-full">
                    <div className="max-w-3xl space-y-6">
                        <div className="h-12 lg:h-32 w-3/4 bg-white/5 rounded-2xl animate-pulse" />
                        <div className="h-4 lg:h-6 w-1/2 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-16 lg:h-20 w-full bg-white/5 rounded-xl animate-pulse" />
                        <div className="flex gap-4">
                            <div className="h-12 lg:h-16 w-40 bg-white/5 rounded-xl animate-pulse" />
                            <div className="h-12 lg:h-16 w-32 bg-white/5 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (featured.length === 0) return null;

    const current = featured[index];

    return (
        <div className="relative h-[650px] lg:h-[900px] w-full max-w-[100vw] overflow-hidden group">

            {/* Background Image with Parallax-like scale effect */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                >
                    {/* Desktop Image - Rendered first to be at the bottom */}
                    <div className={cn(
                        "relative w-full h-full z-0",
                        current.mobileImage ? "hidden md:block" : "block"
                    )}>
                        <Image
                            src={getCDNUrl(current.image || '/placeholder.jpg', { width: 1920, quality: 90 })}
                            alt={current.title}
                            fill
                            priority
                            className="object-cover object-[center_20%] lg:object-top"
                            sizes="100vw"
                        />
                    </div>

                    {/* Mobile Image */}
                    {current.mobileImage && (
                        <div className="relative w-full h-full md:hidden z-0">
                            <Image
                                src={getCDNUrl(current.mobileImage, { width: 800, quality: 90 })}
                                alt={current.title}
                                fill
                                priority
                                className="object-cover"
                                sizes="100vw"
                            />
                        </div>
                    )}

                    {/* Enhanced Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-[5]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-[5]" />

                </motion.div>
            </AnimatePresence>

            {/* Content Container */}
            <div className="relative z-20 h-full flex flex-col justify-end pb-20 lg:pb-32 px-6 lg:px-20 max-w-[1600px] mx-auto w-full">
                <motion.div
                    key={`content-${index}`}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className="max-w-3xl space-y-4 lg:space-y-6"
                >




                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 lg:gap-4 pt-4">
                        <Link href={current.firstChapterId ? `/webtoon/${current.id}/read/${current.firstChapterId}` : `/webtoon/${current.id}`}>
                            <button className="flex items-center gap-2 lg:gap-3 bg-white text-black px-6 lg:px-12 py-3 lg:py-5 rounded-xl font-black uppercase tracking-widest text-[10px] lg:text-sm transition-all hover:bg-white/90 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)] group/btn overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:animate-shine" />
                                <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
                                Уншиж эхлэх
                            </button>
                        </Link>

                        <Link href={`/webtoon/${current.id}`}>
                            <button className="flex items-center gap-2 lg:gap-3 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white px-6 lg:px-10 py-3 lg:py-5 rounded-xl font-black uppercase tracking-widest text-[10px] lg:text-sm transition-all hover:scale-105 active:scale-95">
                                <Info className="w-4 h-4 lg:w-5 lg:h-5" />
                                Дэлгэрэнгүй
                            </button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Slider Indicators */}
            <div className="absolute bottom-8 right-6 lg:right-20 z-30 flex items-center gap-2 lg:gap-3">
                {featured.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            i === index
                                ? "w-10 lg:w-16 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                : "w-2 lg:w-4 bg-white/20 hover:bg-white/40"
                        )}
                    />
                ))}
            </div>

            {/* Navigation Buttons (Visible on Hover) */}
            <div className="hidden lg:flex absolute inset-y-0 left-0 items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <button
                    onClick={prev}
                    className="p-4 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white border border-white/5 transition-all hover:scale-110 active:scale-90"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
            </div>
            <div className="hidden lg:flex absolute inset-y-0 right-0 items-center pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <button
                    onClick={next}
                    className="p-4 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white border border-white/5 transition-all hover:scale-110 active:scale-90"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
}


