"use client";

import { motion } from "framer-motion";

export function WebtoonCardSkeleton() {
    return (
        <div className="space-y-3 w-full animate-pulse">
            <div className="relative aspect-[3/4] w-full bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                <div className=" absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-white/5 rounded-md w-3/4" />
                <div className="h-3 bg-white/5 rounded-md w-1/2" />
            </div>
        </div>
    );
}

export function WebtoonSectionSkeleton() {
    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-white/10 rounded-full" />
                    <div className="h-6 bg-white/10 rounded-md w-32" />
                </div>
            </div>
            <div className="flex gap-4 lg:gap-6 overflow-x-auto no-scrollbar pb-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="w-[120px] lg:w-[160px] flex-shrink-0">
                        <WebtoonCardSkeleton />
                    </div>
                ))}
            </div>
        </section>
    );
}
