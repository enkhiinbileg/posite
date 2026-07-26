"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ReaderMenuProps {
    webtoonId: string;
    currentChapterId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ReaderMenu({ webtoonId, currentChapterId, isOpen, onClose }: ReaderMenuProps) {
    const router = useRouter();
    const [chapters, setChapters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        async function fetchChapters() {
            if (!isOpen) return;
            // Only fetch if chapters are empty to avoid refetching every time
            if (chapters.length > 0) return;

            setLoading(true);
            const now = new Date().toISOString();
            const { data } = await supabase
                .from('chapters')
                .select('id, title, chapter_number, created_at')
                .eq('webtoon_id', Number(webtoonId))
                .eq('is_published', true)
                .or(`published_at.is.null,published_at.lte.${now}`)
                .order('chapter_number', { ascending: true });

            setChapters(data || []);
            setLoading(false);
        }
        fetchChapters();
    }, [webtoonId, isOpen, chapters.length]);

    // Auto-scroll to active chapter
    useEffect(() => {
        if (isOpen && activeRef.current) {
            setTimeout(() => {
                activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 300);
        }
    }, [isOpen, chapters, currentChapterId]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                    />

                    {/* Menu Content */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-[380px] bg-background border-l border-white/5 z-[101] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter">Бүлгийн жагсаалт</h2>
                                <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Нийт {chapters.length} бүлэг</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                            {loading ? (
                                <div className="flex flex-col gap-4">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                chapters.map((ch) => {
                                    const isActive = String(ch.id) === currentChapterId;
                                    return (
                                        <button
                                            key={ch.id}
                                            ref={isActive ? activeRef : null}
                                            onClick={() => {
                                                router.push(`/webtoon/${webtoonId}/read/${ch.id}`);
                                                onClose();
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden",
                                                isActive
                                                    ? "bg-primary/20 border border-primary/20"
                                                    : "bg-surface border border-white/5 hover:bg-white/5 active:scale-[0.98]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors",
                                                isActive
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "bg-background text-muted group-hover:text-white"
                                            )}>
                                                {ch.chapter_number}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className={cn(
                                                    "text-sm font-bold truncate transition-colors",
                                                    isActive ? "text-primary" : "text-white"
                                                )}>
                                                    {ch.title}
                                                </p>
                                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1" suppressHydrationWarning>
                                                    {new Date(ch.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {isActive ? (
                                                <Play className="w-4 h-4 text-primary fill-current" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-muted group-hover:text-white transition-transform group-hover:translate-x-1" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5">
                            <button
                                onClick={() => router.push(`/webtoon/${webtoonId}`)}
                                className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                Дэлгэрэнгүй хуудас
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
