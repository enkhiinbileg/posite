"use client";

import { motion } from "framer-motion";
import { ChevronLeft, List, Settings, Home, Share2, Loader2 } from "lucide-react";

export default function ReaderLoading() {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative w-full overflow-hidden font-sans">
            {/* Header Shell */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 lg:h-20 flex items-center">
                <div className="h-full max-w-[1400px] mx-auto px-4 lg:px-8 w-full flex items-center justify-between">
                    <div className="flex items-center gap-4 lg:gap-6 animate-pulse">
                        <div className="p-2 bg-white/5 rounded-full">
                            <ChevronLeft className="w-6 h-6 text-white/20" />
                        </div>
                        <div className="hidden sm:block space-y-2">
                            <div className="h-3 w-32 bg-white/5 rounded-md" />
                            <div className="h-4 w-48 bg-white/10 rounded-md" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4 animate-pulse">
                        <div className="w-10 h-10 bg-white/5 rounded-xl" />
                        <div className="w-px h-6 bg-white/10 hidden sm:block mx-1" />
                        <div className="w-10 h-10 bg-white/10 rounded-xl" />
                        <div className="w-10 h-10 bg-white/10 rounded-xl" />
                    </div>
                </div>
            </header>

            {/* Main Content Area - Just a dark screen with a small loader */}
            <main className="max-w-[800px] mx-auto w-full pt-20 sm:pt-24 pb-32 flex flex-col items-center">
                <div className="w-full aspect-[1/1.5] bg-white/[0.02] border-x sm:border border-white/5 animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white/5 animate-spin" />
                </div>
                <div className="w-full aspect-[1/1.5] bg-white/[0.015] border-x sm:border border-white/5 mt-4 opacity-50" />
            </main>
        </div>
    );
}
