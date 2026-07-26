"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { WebtoonCard } from "@/components/home/WebtoonCard";
import { Loader2, History, Bookmark, Heart, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function LibraryContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") as "history" | "bookmarks" | "likes" | null;
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<"history" | "bookmarks" | "likes">(tabParam || "history");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user) {
            // Instant Render: Try to load from Cache first
            const cacheKey = `lib_cache_${user.id}_${activeTab}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setItems(parsed);
                    setLoading(false); // Already have data, don't show global loader
                } catch (e) {
                    console.error("Cache Parse Error:", e);
                }
            }
            
            fetchData();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading, activeTab]);

    async function fetchData() {
        // Only set loading to true if we don't have items (to avoid flickers)
        if (items.length === 0) setLoading(true);

        try {
            let data: any[] = [];
            if (activeTab === "history") {
                const result = await supabase
                    .from('reading_progress')
                    .select(`
                        last_read_at, chapter_id, is_finished,
                        webtoons (id, title, image, rating, author),
                        chapters (id, title)
                    `)
                    .eq('user_id', user?.id)
                    .order('last_read_at', { ascending: false });

                if (result.data) {
                    const uniqueWebtoons = new Map();
                    result.data.forEach((item: any) => {
                        if (item.webtoons && !uniqueWebtoons.has(item.webtoons.id)) {
                            uniqueWebtoons.set(item.webtoons.id, item);
                        }
                    });

                    data = Array.from(uniqueWebtoons.values()).map((item: any) => ({
                        id: item.webtoons.id,
                        title: item.webtoons.title,
                        image: item.webtoons.image,
                        rating: item.webtoons.rating,
                        chapter: item.chapters?.title || "Бүлэг ???",
                        timestamp: item.last_read_at,
                        href: `/webtoon/${item.webtoons.id}/read/${item.chapter_id}`,
                        is_finished: item.is_finished
                    }));
                }
            } else if (activeTab === "bookmarks") {
                const result = await supabase
                    .from('bookmarks')
                    .select('created_at, webtoons (id, title, image, rating)')
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false });

                if (result.data) {
                    data = result.data.filter((i: any) => i.webtoons).map((item: any) => ({
                        id: item.webtoons.id,
                        title: item.webtoons.title,
                        image: item.webtoons.image,
                        rating: item.webtoons.rating,
                        chapter: "Хадгалсан",
                        timestamp: item.created_at
                    }));
                }
            } else if (activeTab === "likes") {
                const result = await supabase
                    .from('likes')
                    .select('created_at, chapters (id, title, webtoons (id, title, image, rating))')
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false });

                if (result.data) {
                    data = result.data.filter((i: any) => i.chapters?.webtoons).map((item: any) => ({
                        id: item.chapters.webtoons.id,
                        title: item.chapters.webtoons.title,
                        image: item.chapters.webtoons.image,
                        rating: item.chapters.webtoons.rating,
                        chapter: `Таалагдсан: ${item.chapters.title}`,
                        timestamp: item.created_at,
                        href: `/webtoon/${item.chapters.webtoons.id}/read/${item.chapters.id}`
                    }));
                }
            }
            
            setItems(data);
            // Update Cache
            if (user) {
                const cacheKey = `lib_cache_${user.id}_${activeTab}`;
                localStorage.setItem(cacheKey, JSON.stringify(data));
            }
        } catch (error) {
            console.error("Error fetching library data:", error);
        } finally {
            setLoading(false);
        }
    }

    function getRelativeTime(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} өдрийн өмнө`;
        if (hours > 0) return `${hours} цагийн өмнө`;
        if (minutes > 0) return `${minutes} минутын өмнө`;
        return "Дөнгөж сая";
    }

    if (!user && !loading && !authLoading) {
        return (
            <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-center p-4">
                <div className="w-24 h-24 rounded-full bg-surface border border-white/5 flex items-center justify-center mb-6">
                    <UserX className="w-10 h-10 text-muted" />
                </div>
                <h2 className="text-2xl font-black mb-2">Нэвтрэх шаардлагатай</h2>
                <p className="text-muted mb-8 max-w-md">Та "Миний Сан" хэсгийг ашиглахын тулд системд нэвтэрнэ үү.</p>
                <p className="text-sm text-primary font-bold">Дэлгэцийн баруун дээд буланд байрлах Нэвтрэх товчийг дарна уу.</p>
            </div>
        );
    }

    const tabs = [
        { id: "history", label: "ТҮҮХ", icon: History },
        { id: "bookmarks", label: "ХАДГАЛСАН", icon: Bookmark },
        { id: "likes", label: "ТААЛАГДСАН", icon: Heart },
    ];

    return (
        <main className="min-h-screen w-full pt-32 lg:pt-48 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter mb-4 text-white">Миний Сан</h1>
                <p className="text-muted text-sm md:text-base font-bold">Таны уншсан түүх болон хадгалсан цуглуулгууд</p>
            </header>

            <div className="flex items-center gap-3 mb-16 overflow-x-auto pb-6 pt-2 px-2 -mx-2 scrollbar-none relative">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-3xl text-[11px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-red-600 text-white shadow-2xl shadow-red-600/20 scale-105"
                                : "bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
                        >
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="space-y-3 animate-pulse">
                                    <div className="aspect-[2/3] bg-white/5 rounded-2xl w-full" />
                                    <div className="h-4 bg-white/5 rounded-full w-3/4" />
                                    <div className="h-3 bg-white/5 rounded-full w-1/2" />
                                </div>
                            ))}
                        </motion.div>
                    ) : items.length > 0 ? (
                        <motion.div 
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
                        >
                            {items.map((item, index) => (
                                <WebtoonCard
                                    key={`${item.id}-${index}`}
                                    id={item.id}
                                    title={item.title}
                                    image={item.image}
                                    rating={item.rating || "5.0"}
                                    chapter={item.chapter}
                                    isNew={false}
                                    href={item.href}
                                    progressStatus={activeTab === "history" ? (item.is_finished ? "finished" : "in-progress") : undefined}
                                    lastReadTime={activeTab === "history" ? getRelativeTime(item.timestamp) : undefined}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/5 rounded-3xl bg-surface/30 px-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                {activeTab === "history" && <History className="w-6 h-6 text-muted" />}
                                {activeTab === "bookmarks" && <Bookmark className="w-6 h-6 text-muted" />}
                                {activeTab === "likes" && <Heart className="w-6 h-6 text-muted" />}
                            </div>
                            <h3 className="font-bold text-lg mb-1 text-white">Мэдээлэл олдсонгүй</h3>
                            <p className="text-muted text-sm max-w-xs">Таны энэ хэсэгт одоогоор ямар нэгэн түүх байхгүй байна.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

export default function LibraryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <LibraryContent />
        </Suspense>
    );
}
