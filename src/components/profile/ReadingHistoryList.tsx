"use client";

import { motion } from "framer-motion";
import { Clock, ChevronRight, Play } from "lucide-react";

interface HistoryItem {
    id: number;
    webtoon: {
        id: number;
        title: string;
        image: string;
    };
    chapter_id: number;
    chapter: {
        title: string;
    };
    last_read_at: string;
}

interface ReadingHistoryListProps {
    items: HistoryItem[];
}

export function ReadingHistoryList({ items }: ReadingHistoryListProps) {
    if (items.length === 0) {
        return (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8">
                <Clock className="w-12 h-12 text-muted opacity-50" />
                <div>
                    <h3 className="text-white font-bold">Түүх хоосон байна</h3>
                    <p className="text-muted text-sm">Та одоогоор ямар нэгэн зохиол уншаагүй байна!</p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:scale-105 transition-transform"
                >
                    Зохиол хайх
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative rounded-2xl bg-surface border border-white/5 p-4 hover:border-primary/50 transition-all overflow-hidden"
                >
                    <div className="flex items-center gap-4">
                        {/* Image */}
                        <div className="w-20 h-28 md:w-24 md:h-32 rounded-xl overflow-hidden bg-black shadow-lg shrink-0 relative">
                            <img
                                src={item.webtoon.image}
                                alt={item.webtoon.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            {/* Read Status Icon on Image */}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 py-1">
                            <div className="flex flex-col gap-1 mb-2">
                                <h4 className="text-white text-base md:text-lg font-bold truncate pr-4 leading-tight">{item.webtoon.title}</h4>
                                <p className="text-xs md:text-sm text-primary font-bold">{item.chapter.title}</p>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] uppercase font-bold text-muted bg-white/5 px-2 py-0.5 rounded-full">
                                    {new Date(item.last_read_at).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Mock Progress Bar */}
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[150px] md:max-w-[200px]">
                                <div className="h-full bg-primary w-[85%] shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
                            </div>
                        </div>

                        {/* Action */}
                        <a
                            href={`/webtoon/${item.webtoon.id}/read/${item.chapter_id}`}
                            className="hidden md:flex w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white group-hover:bg-primary group-hover:border-primary group-hover:scale-110 transition-all shrink-0"
                        >
                            <Play className="w-4 h-4 ml-0.5" />
                        </a>
                    </div>

                    {/* Mobile Full Click Tap Area */}
                    <a href={`/webtoon/${item.webtoon.id}/read/${item.chapter_id}`} className="absolute inset-0 md:hidden" />
                </motion.div>
            ))}
        </div>
    );
}
