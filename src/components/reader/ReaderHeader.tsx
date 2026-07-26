"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { ChevronLeft, List, Settings, Share2, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReaderHeaderProps {
    webtoonTitle: string;
    chapterTitle: string;
    webtoonId: string | number;
    onToggleMenu: () => void;
    onToggleSettings: () => void;
    isVisible?: boolean;
}

export function ReaderHeader({ webtoonTitle, chapterTitle, webtoonId, onToggleMenu, onToggleSettings, isVisible = true }: ReaderHeaderProps) {
    const router = useRouter();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.header
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : -100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 lg:h-20"
        >
            <div className="h-full max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4 lg:gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <div className="hidden sm:block">
                        <Link href={`/webtoon/${webtoonId}`} className="hover:text-primary transition-colors">
                            <h2 className="text-xs uppercase font-black tracking-widest text-muted line-clamp-1">
                                {webtoonTitle}
                            </h2>
                        </Link>
                        <h1 className="text-sm lg:text-base font-bold text-white line-clamp-1">
                            {chapterTitle}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-4">
                    <Link
                        href="/"
                        className="p-2 lg:p-3 hover:bg-white/5 rounded-xl text-muted hover:text-white transition-all"
                    >
                        <Home className="w-5 h-5" />
                    </Link>
                    <div className="w-px h-6 bg-white/10 hidden sm:block" />
                    <button
                        onClick={onToggleMenu}
                        className="p-2 lg:p-3 hover:bg-white/5 rounded-xl text-muted hover:text-white transition-all"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onToggleSettings}
                        className="p-2 lg:p-3 hover:bg-white/5 rounded-xl text-muted hover:text-white transition-all"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />
                    {/* Replaced meaningless message icon with Share if needed, or keep hidden */}
                    <button className="p-2 lg:p-3 hover:bg-white/5 rounded-xl text-muted hover:text-white transition-all">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

        </motion.header>
    );
}
