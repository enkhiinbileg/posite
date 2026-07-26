"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Search, Loader2 } from "lucide-react";

export default function DetailLoading() {
    return (
        <div className="min-h-screen bg-[#141414] text-white flex flex-col relative w-full overflow-hidden font-sans">
            {/* Header Shell */}
            <header className="fixed top-0 left-0 lg:left-24 right-0 h-16 z-[100] flex items-center justify-between px-4 lg:px-10 bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4 animate-pulse">
                    <div className="p-2 bg-white/5 rounded-full">
                        <ChevronLeft className="w-8 h-8 text-white/20" />
                    </div>
                </div>
                <div className="flex items-center gap-5 animate-pulse">
                    <Search className="w-6 h-6 text-white/20" />
                    <div className="w-7 h-7 rounded bg-white/10" />
                </div>
            </header>

            {/* Hero Skeleton */}
            <div className="relative h-[65vh] lg:h-[85vh] w-full bg-black/40 overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-[#141414]" />
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-20 space-y-4">
                    <div className="h-12 w-48 bg-white/5 rounded-lg" />
                    <div className="h-4 w-32 bg-white/5 rounded-md" />
                </div>
            </div>

            {/* Content Skeleton */}
            <main className="px-4 lg:px-20 mt-8 space-y-12">
                <div className="w-full h-12 bg-white/5 rounded-md animate-pulse" />
                <div className="flex gap-10 border-b border-white/10 pb-4">
                    <div className="h-4 w-20 bg-white/10 rounded" />
                    <div className="h-4 w-20 bg-white/5 rounded" />
                </div>
                <div className="space-y-6">
                    {[Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4 items-center">
                            <div className="w-48 aspect-video bg-white/5 rounded-md" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-48 bg-white/10 rounded" />
                                <div className="h-3 w-32 bg-white/5 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
