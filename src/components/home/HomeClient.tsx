"use client";
import Link from "next/link";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { LatestUpdateCard } from "@/components/home/LatestUpdateCard";
import { WebtoonCard } from "@/components/home/WebtoonCard";


import { AdvancedFilter } from "@/components/home/AdvancedFilter";
import { Search, Loader2, ChevronRight, MonitorPlay } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { WebtoonCardSkeleton } from "@/components/home/WebtoonCardSkeleton";
import { HomepageSections } from "@/components/home/HomepageSections";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { fetchWebtoonsAction, fetchLatestUpdatesAction, fetchUserReadingProgressAction } from "@/app/actions/fetch-actions";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

interface HomeClientProps {
    initialWebtoons: any[];
    initialUpdates: any[];
    initialSections: any[];
    recentUpdateIds?: any[];
}

export function HomeClient({ initialWebtoons, initialUpdates, initialSections, recentUpdateIds = [] }: HomeClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const searchParams = useSearchParams();

    // Active Filters
    const activeSection = searchParams.get("section");
    const activeGenre = searchParams.get("genre") || "Бүх";
    const activeSort = searchParams.get("sort") || "popular";
    const activeStatus = searchParams.get("status") || "all";

    // State
    const [webtoons, setWebtoons] = useState<any[]>(initialWebtoons);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [continueReading, setContinueReading] = useState<any[]>([]);
    const [latestUpdates, setLatestUpdates] = useState<any[]>(initialUpdates);

    const [retryCount, setRetryCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialWebtoons.length >= 20);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const ITEMS_PER_PAGE = 20;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { ref, inView } = useInView({ threshold: 0 });

    // Handle Infinite Scroll & Filtering
    async function fetchWebtoons(reset = false, signal?: AbortSignal) {
        if (loadingMore || (!hasMore && !reset)) return;

        // Prevent infinite retry loop on persistent errors
        if (!reset && retryCount > 3) {
            console.warn("Retries exhausted for infinite scroll. Please refresh.");
            return;
        }

        if (reset) {
            setLoading(true);
            setPage(0);
            setHasMore(true);
            setRetryCount(0); // Reset on filter change
        } else {
            setLoadingMore(true);
        }

        const currentPage = reset ? 0 : page;
        const from = currentPage * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            const result = await fetchWebtoonsAction({
                from,
                to,
                sort: activeSort,
                status: activeStatus,
                genre: activeGenre,
                search: debouncedSearch
            });

            if (signal?.aborted) return;

            if (!result.success) throw new Error(result.error);

            if (result.data) {
                const formattedData = result.data.map((w: any) => ({
                    ...w,
                    chapter_count_label: w.chapter_count_label || '0 Бүлэг'
                }));

                if (reset) setWebtoons(formattedData);
                else setWebtoons(prev => [...prev, ...formattedData]);

                setHasMore((reset ? 0 : webtoons.length) + formattedData.length < (result.count || 0));
                setPage(currentPage + 1);
                setRetryCount(0); // Reset on success
            }
        } catch (err: any) {
            console.error("Fetch error:", err);
            if (!reset) setRetryCount(prev => prev + 1);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    // Effect for Filters & Recovery
    useEffect(() => {
        // Recovery: If initial data is empty (server fetch failed), trigger client-side fetch
        const isInitialEmpty = webtoons.length === 0;
        const hasFilters = activeGenre !== "Бүх" || activeSort !== "popular" || activeStatus !== "all" || debouncedSearch;

        if (hasFilters || isInitialEmpty) {
            const controller = new AbortController();
            fetchWebtoons(true, controller.signal);
            return () => controller.abort();
        }
    }, [activeGenre, activeSort, activeStatus, debouncedSearch]);

    // Independent check for updates recovery
    useEffect(() => {
        if (latestUpdates.length === 0) {
            async function fetchInitialUpdates() {
                const result = await fetchLatestUpdatesAction(50);
                const updates = result.data;

                if (updates) {
                    const formattedUpdates = updates.map((c: any) => ({
                        id: c.webtoons?.id,
                        title: c.webtoons?.title,
                        image: c.webtoons?.image,
                        chapter_title: c.title,
                        chapter_id: c.id,
                        created_at: c.created_at,
                        rating: c.webtoons?.rating,
                        genres: c.webtoons?.genres
                    }));
                    setLatestUpdates(formattedUpdates.slice(0, 30));
                }
            }
            fetchInitialUpdates();
        }
    }, [latestUpdates.length]);

    // Infinite Scroll
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore && !activeSection && retryCount <= 3) {
            fetchWebtoons();
        }
    }, [inView, hasMore, loading, loadingMore, activeSection, retryCount]);

    // User-specific data (Continue Reading) - Always client side
    useEffect(() => {
        async function fetchUserSpecificData() {
            if (!user) {
                setContinueReading([]);
                setRecommendations([]);
                return;
            }

            try {
                // Continue Reading
                const result = await fetchUserReadingProgressAction(10);
                const progress = result.data;

                if (progress && progress.length > 0) {
                    // Show full history without deduplication per user request
                    setContinueReading(progress.map((p: any, index: number) => ({
                        ...p.webtoons,
                        unique_history_id: `${p.webtoon_id}_${p.chapter_id}_${index}`,
                        last_read_chapter_id: p.chapter_id,
                        last_read_chapter_title: p.chapters?.title || "1",
                        chapter_count_label: p.webtoons?.chapter_count_label || '...'
                    })));
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        }
        fetchUserSpecificData();
    }, [user]);

    const filteredItems = useMemo(() => {
        if (activeSection === "continueReading") return continueReading;
        if (activeSection === "newUpdates") return latestUpdates;
        return webtoons;
    }, [activeSection, webtoons, continueReading, latestUpdates]);

    const updateParams = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all" || value === "popular" || value === "Бүх") params.delete(key);
        else params.set(key, value);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-background">

            <div className={cn("max-w-[1600px] mx-auto pb-20", activeSection ? "pt-[80px]" : "pt-2")}>
                <section className="sticky top-[72px] z-30 bg-background/80 backdrop-blur-xl py-3 md:py-4 px-4 lg:px-10 border-b border-white/5 overflow-hidden">
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth items-center">
                        <button 
                            onClick={() => updateParams("genre", "Бүх")}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-[12px] font-semibold tracking-wide whitespace-nowrap transition-colors",
                                activeGenre === "Бүх" ? "bg-[#f43f5e]/15 border border-[#f43f5e]/20 text-[#f43f5e]" : "bg-[#181a20] border border-transparent text-[#a0a0a0] hover:text-white"
                            )}
                        >
                            <MonitorPlay className={cn("w-4 h-4", activeGenre === "Бүх" ? "text-[#f43f5e]" : "text-[#a0a0a0]")} />
                            Бүх вэбтүүн
                        </button>
                        {[
                            "Action", "Romance", "Fantasy", "Drama", "Comedy", "Thriller", "Horror"
                        ].map((g) => (
                            <button
                                key={g}
                                onClick={() => updateParams("genre", g)}
                                className={cn(
                                    "px-4 py-1.5 rounded-[4px] text-[12px] font-semibold tracking-wide whitespace-nowrap transition-colors",
                                    activeGenre === g ? "bg-[#f43f5e]/15 border border-[#f43f5e]/20 text-[#f43f5e]" : "bg-[#181a20] border border-[#22242a] text-white/80 hover:text-white"
                                )}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="sticky top-[144px] md:top-[152px] z-30 bg-background/80 backdrop-blur-xl py-2 md:py-3 px-4 lg:px-10 mb-6 md:mb-8 border-b border-white/5 overflow-hidden">
                    {/* Background glow for the bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-30 pointer-events-none" />
                    
                    <div className="relative flex gap-2 md:gap-3 overflow-x-auto no-scrollbar scroll-smooth items-center">
                        <button 
                            onClick={() => updateParams("status", "all")}
                            className={cn(
                                "relative px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] whitespace-nowrap transition-all duration-500 group",
                                activeStatus === "all" 
                                    ? "text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                                    : "text-muted/60 hover:text-white"
                            )}
                        >
                            {activeStatus === "all" && (
                                <motion.div 
                                    layoutId="status-bg"
                                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl"
                                />
                            )}
                            <span className="relative z-10">Бүх статус</span>
                        </button>
                        
                        {[
                            { id: "ongoing", label: "Гарч байгаа", color: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
                            { id: "completed", label: "Дууссан", color: "from-blue-500/20 to-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
                            { id: "hiatus", label: "Завсарлага", color: "from-amber-500/20 to-amber-400/10", border: "border-amber-500/30", text: "text-amber-400" }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => updateParams("status", s.id)}
                                className={cn(
                                    "relative px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] whitespace-nowrap transition-all duration-500 group",
                                    activeStatus === s.id ? s.text : "text-muted/60 hover:text-white"
                                )}
                            >
                                {activeStatus === s.id && (
                                    <motion.div 
                                        layoutId="status-bg"
                                        className={cn("absolute inset-0 bg-gradient-to-r border rounded-xl shadow-lg", s.color, s.border)}
                                    />
                                )}
                                <span className="relative z-10">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="px-4 lg:px-10">
                    {activeGenre === "Бүх" && activeStatus === "all" && !activeSection && !debouncedSearch ? (
                        <div className="space-y-[10px]">
                            <HomepageSections
                                webtoons={webtoons}
                                recommendations={recommendations}
                                continueReading={continueReading}
                                latestUpdates={latestUpdates}
                                router={router}
                                initialSections={initialSections}
                                recentUpdateIds={recentUpdateIds}
                            />
                        </div>
                    ) : (
                        <div className="mt-8 space-y-12">
                            {/* Genre Discovery View - Premium Layout */}
                            {activeGenre !== "Бүх" && !debouncedSearch && !activeSection ? (
                                <div className="space-y-12">
                                    {webtoons.length > 0 ? (
                                        <>
                                            {/* Row 1: Featured for this Genre (Top Rated) */}
                                            <DiscoveryRow 
                                                title={`Шилдэг ${activeGenre}`} 
                                                items={webtoons.slice(0, 10)} 
                                                recentUpdateIds={recentUpdateIds}
                                                type="premium"
                                            />

                                            {/* Row 2: Most View / Recent for this Genre (if enough items) */}
                                            {webtoons.length > 10 && (
                                                <DiscoveryRow 
                                                    title={`Шинэ & Тренд ${activeGenre}`} 
                                                    items={webtoons.slice(10, 20)} 
                                                    recentUpdateIds={recentUpdateIds}
                                                    type="standard"
                                                />
                                            )}

                                            {/* Remaining Grid (if even more items) */}
                                            {webtoons.length > 20 && (
                                                <div className="pt-8">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(255,59,48,0.5)]" />
                                                        <h2 className="text-xl font-black uppercase tracking-tighter text-white/95">Бусад {activeGenre}</h2>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                                                        {webtoons.slice(20).map((item) => (
                                                            <WebtoonCard
                                                                key={item.id}
                                                                id={item.id}
                                                                title={item.title}
                                                                rating={item.rating?.toString()}
                                                                image={item.image}
                                                                chapter={item.chapter_count_label}
                                                                isNew={item.is_new}
                                                                isUpdated={recentUpdateIds.includes(item.id)}
                                                                aspect="portrait"
                                                                genres={item.genres}
                                                                status={item.status}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : !loading && (
                                        <div className="flex flex-col items-center justify-center py-40 opacity-50 grayscale">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <MonitorPlay className="w-8 h-8 text-white/20" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-widest text-[11px]">Энэ төрөлд вэбтүүн олдсонгүй</h3>
                                            <p className="text-xs text-muted/50 mt-1">Тун удахгүй шинээр нэмэгдэх болно</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Regular Grid for Search or Continue Reading */
                                <div className={cn(
                                    "grid gap-6",
                                    (activeSection === "continueReading" || activeSection === "newUpdates")
                                        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                                )}>
                                    {filteredItems.map((item, idx) => (
                                        <div key={item.unique_history_id || item.id + "-" + (item.chapter_id || idx)} className="transition-transform hover:scale-105 duration-300">
                                            {activeSection === "continueReading" ? (
                                                <ContinueReadingCard
                                                    id={item.id}
                                                    title={item.title}
                                                    image={item.image}
                                                    lastReadChapterId={item.last_read_chapter_id || item.last_read_chapter || 1}
                                                    lastReadChapterTitle={item.last_read_chapter_title}
                                                    totalChapters={typeof item.chapter_count_label === 'string' ? parseInt(item.chapter_count_label.replace(/\D/g, '')) || 0 : 0}
                                                    isUpdated={recentUpdateIds.includes(item.id)}
                                                />
                                            ) : activeSection === "newUpdates" ? (
                                                <WebtoonCard
                                                    id={item.id}
                                                    title={item.title}
                                                    image={item.image}
                                                    chapter={item.chapter_title}
                                                    updateBadge={item.chapter_title}
                                                    rating={item.rating?.toString()}
                                                    genres={item.genres}
                                                    aspect="portrait"
                                                    href={`/webtoon/${item.id}/read/${item.chapter_id}`}
                                                    isUpdated={true}
                                                    status={item.status}
                                                />
                                            ) : (
                                                <WebtoonCard
                                                    id={item.id}
                                                    title={item.title}
                                                    rating={item.rating?.toString()}
                                                    image={item.image}
                                                    chapter={item.chapter_count_label}
                                                    isNew={item.is_new}
                                                    isUpdated={recentUpdateIds.includes(item.id)}
                                                    aspect="portrait"
                                                    genres={item.genres}
                                                    status={item.status}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div ref={ref} className="h-20 flex items-center justify-center mt-8">
                                {loadingMore && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DiscoveryRow({ title, items, recentUpdateIds, type = "standard" }: { title: string, items: any[], recentUpdateIds: any[], type?: 'premium' | 'standard' }) {
    if (items.length === 0) return null;
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(255,59,48,0.5)]" />
                <h2 className="text-[17px] md:text-xl font-black uppercase tracking-tighter text-white/95">{title}</h2>
            </div>
            <div className="flex gap-4 lg:gap-8 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
                {items.map((item) => (
                    <div key={item.id} className="w-[145px] lg:w-[190px] flex-shrink-0 transition-transform hover:scale-105 duration-300">
                        <WebtoonCard
                            id={item.id}
                            title={item.title}
                            rating={item.rating?.toString()}
                            image={item.image}
                            chapter={item.chapter_count_label}
                            isNew={item.is_new}
                            isUpdated={recentUpdateIds.includes(item.id)}
                            aspect="portrait"
                            genres={item.genres}
                            status={item.status}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
