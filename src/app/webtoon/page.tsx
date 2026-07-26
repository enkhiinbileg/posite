"use client";


import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { WebtoonCard } from "@/components/home/WebtoonCard";
import { AdvancedFilter } from "@/components/home/AdvancedFilter";
import { Loader2, LayoutGrid, SlidersHorizontal, SearchX } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWebtoonsAction } from "@/app/actions/fetch-actions";
import { cn } from "@/lib/utils";

function WebtoonsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Active Filters
    const activeGenre = searchParams.get("genre") || "Бүх";
    const activeSort = searchParams.get("sort") || "popular";
    const activeStatus = searchParams.get("status") || "all";
    const initialSearch = searchParams.get("search") || "";

    // State
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

    const ITEMS_PER_PAGE = 24;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { ref, inView } = useInView({ threshold: 0 });

    async function fetchWebtoons(reset = false) {
        if (loadingMore || (!hasMore && !reset)) return;

        if (reset) {
            setLoading(true);
            setError(null);
            setPage(0);
            setHasMore(true);
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

            if (result.success && result.data) {
                const formattedData = result.data.map((w: any) => ({
                    ...w,
                    chapter_count_label: w.chapter_count_label || '0 Бүлэг'
                }));

                if (reset) setWebtoons(formattedData);
                else setWebtoons(prev => [...prev, ...formattedData]);

                setHasMore((reset ? 0 : webtoons.length) + formattedData.length < (result.count || 0));
                setPage(currentPage + 1);
            } else {
                setError(result.error || "Мэдээлэл ачаалахад алдаа гарлаа.");
            }
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError("Сүлжээний алдаа гарлаа. Та дахин оролдоно уу.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    // Effect for Filters
    useEffect(() => {
        fetchWebtoons(true);
    }, [activeGenre, activeSort, activeStatus, debouncedSearch]);

    // Infinite Scroll
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore) {
            fetchWebtoons();
        }
    }, [inView, hasMore, loading, loadingMore]);

    const updateParams = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all" || value === "popular" || value === "Бүх") params.delete(key);
        else params.set(key, value);
        router.push(`/webtoon?${params.toString()}`);
    };

    return (
        <main className="min-h-screen bg-background pt-0 pb-32">
            <div className="max-w-[1600px] mx-auto px-4 md:px-10">

                {/* Filter Toolbar */}
                <section className="sticky top-0 z-40 bg-background pb-3 pt-4 lg:pt-6 lg:pb-4 -mx-4 px-4 md:-mx-10 md:px-10">
                    <AdvancedFilter
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeGenre={activeGenre}
                        activeSort={activeSort}
                        activeStatus={activeStatus}
                        onGenreChange={(g) => updateParams("genre", g)}
                        onSortChange={(s) => updateParams("sort", s)}
                        onStatusChange={(st) => updateParams("status", st)}
                    />
                </section>
                {/* Content Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-8">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="space-y-4 animate-pulse">
                                <div className="aspect-[2/3] bg-white/5 rounded-3xl border border-white/5" />
                                <div className="h-4 bg-white/5 rounded-full w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-32 flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center mb-8 border border-red-600/20">
                            <SlidersHorizontal className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3">Сүлжээний алдаа</h2>
                        <p className="text-muted font-medium mb-8">{error}</p>
                        <button 
                            onClick={() => fetchWebtoons(true)}
                            className="px-10 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-red-600/20"
                        >
                            Дахин оролдох
                        </button>
                    </div>
                ) : webtoons.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-8">
                        <AnimatePresence mode="popLayout">
                            {webtoons.map((item, idx) => (
                                <motion.div
                                    key={item.id + "-" + idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: (idx % 16) * 0.03 }}
                                    className="transition-transform hover:scale-105 duration-300"
                                >
                                    <WebtoonCard
                                        id={item.id}
                                        title={item.title}
                                        rating={item.rating?.toString()}
                                        image={item.image}
                                        chapter={item.chapter_count_label}
                                        isNew={item.is_new}
                                        aspect="portrait"
                                        genres={item.genres}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10">
                            <SearchX className="w-10 h-10 text-muted" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3">Илэрц олдсонгүй</h2>
                        <p className="text-muted font-medium mb-8">Таны сонгосон шүүлтүүрт тохирох вэбтүүн одоогоор байхгүй байна. Өөр төрөл сонгож үзнэ үү.</p>
                        <button 
                            onClick={() => router.push('/webtoon')}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Бүх вэбтүүнийг үзэх
                        </button>
                    </div>
                )}

                {/* Infinite Scroll Loader */}
                <div ref={ref} className="h-40 flex items-center justify-center mt-12">
                    {loadingMore && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                            <span className="text-[10px] font-black text-red-600/50 uppercase tracking-[0.3em]">Цааш ачаалж байна...</span>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function WebtoonsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
        }>
            <WebtoonsContent />
        </Suspense>
    );
}
