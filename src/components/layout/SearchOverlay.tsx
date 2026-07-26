"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, History, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export function SearchOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('openSearch', handleOpen);
        return () => window.removeEventListener('openSearch', handleOpen);
    }, []);

    const onClose = () => setIsOpen(false);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [trending, setTrending] = useState<string[]>([]);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // Fetch trending webtoons on mount
    useEffect(() => {
        async function fetchTrending() {
            if (trending.length > 0) return; // Already fetched

            const { data } = await supabase
                .from('webtoons')
                .select('title')
                .order('rating', { ascending: false })
                .limit(6);

            if (data) {
                setTrending(data.map(w => w.title));
            }
        }

        if (isOpen) {
            fetchTrending();
            // Load search history from localStorage
            const history = localStorage.getItem('searchHistory');
            if (history) {
                setSearchHistory(JSON.parse(history).slice(0, 5));
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (searchValue.trim() === "") {
                setResults([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('webtoons')
                .select('*')
                .or(`title.ilike.%${searchValue}%,author.ilike.%${searchValue}%`);

            if (error) {
                console.error("Search error:", error);
            } else {
                setResults(data || []);
            }
            setLoading(false);
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchValue]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [isOpen]);

    const saveToHistory = (query: string) => {
        const history = localStorage.getItem('searchHistory');
        let historyArray = history ? JSON.parse(history) : [];

        // Remove if already exists
        historyArray = historyArray.filter((item: string) => item !== query);

        // Add to beginning
        historyArray.unshift(query);

        // Keep only last 10
        historyArray = historyArray.slice(0, 10);

        localStorage.setItem('searchHistory', JSON.stringify(historyArray));
        setSearchHistory(historyArray.slice(0, 5));
    };

    const removeFromHistory = (query: string) => {
        const history = localStorage.getItem('searchHistory');
        if (history) {
            let historyArray = JSON.parse(history);
            historyArray = historyArray.filter((item: string) => item !== query);
            localStorage.setItem('searchHistory', JSON.stringify(historyArray));
            setSearchHistory(historyArray.slice(0, 5));
        }
    };

    const handleSearchClick = (query: string) => {
        setSearchValue(query);
        saveToHistory(query);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl p-4 lg:p-10 overflow-y-auto"
                >
                    <div className="max-w-4xl mx-auto pt-10 lg:pt-20 pb-20">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex-1 relative group">
                                {loading ? (
                                    <Loader2 className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-spin" />
                                ) : (
                                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                                )}
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Вэбтүүн, зохиолч хайх..."
                                    className="w-full bg-transparent border-b-2 border-border focus:border-primary py-4 pl-12 pr-4 text-2xl lg:text-4xl font-black focus:outline-none transition-all placeholder:text-muted/30"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={onClose}
                                className="ml-8 p-3 rounded-full hover:bg-surface transition-colors"
                            >
                                <X className="w-8 h-8 text-muted hover:text-foreground" />
                            </button>
                        </div>

                        {!searchValue && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="flex items-center gap-2 mb-6 text-muted">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Трэнд хайлт</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {trending.length > 0 ? trending.map((item) => (
                                            <button
                                                key={item}
                                                onClick={() => handleSearchClick(item)}
                                                className="px-4 py-2 rounded-xl bg-surface border border-border hover:border-primary hover:text-primary transition-all text-sm font-medium"
                                            >
                                                {item}
                                            </button>
                                        )) : (
                                            <p className="text-muted text-sm">Ачаалж байна...</p>
                                        )}
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="flex items-center gap-2 mb-6 text-muted">
                                        <History className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Сүүлд хайсан</span>
                                    </div>
                                    <div className="space-y-3">
                                        {searchHistory.length > 0 ? searchHistory.map((item) => (
                                            <div
                                                key={item}
                                                className="flex items-center justify-between group cursor-pointer"
                                            >
                                                <span
                                                    onClick={() => handleSearchClick(item)}
                                                    className="text-foreground/80 group-hover:text-primary transition-colors flex-1"
                                                >
                                                    {item}
                                                </span>
                                                <button
                                                    onClick={() => removeFromHistory(item)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4 text-muted hover:text-red-500" />
                                                </button>
                                            </div>
                                        )) : (
                                            <p className="text-muted text-sm">Хайлтын түүх хоосон байна</p>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {searchValue && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8"
                            >
                                <p className="text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                                    Хайлтын илэрц ({results.length})
                                </p>

                                <div className="grid gap-4">
                                    {results.length > 0 ? (
                                        results.map((result) => (
                                            <Link
                                                key={result.id}
                                                href={`/webtoon/${result.id}`}
                                                onClick={() => {
                                                    saveToHistory(result.title);
                                                    onClose();
                                                }}
                                            >
                                                <div className="flex items-center gap-6 p-4 rounded-3xl bg-surface/50 border border-white/5 hover:border-primary/30 hover:bg-surface transition-all group">
                                                    <div className="w-20 h-24 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
                                                        <img src={result.image} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{result.title}</h3>
                                                        <p className="text-xs text-muted mt-1">{result.author}</p>
                                                        <div className="flex gap-2 mt-3">
                                                            {result.genres?.slice(0, 2).map((g: string) => (
                                                                <span key={g} className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded text-muted uppercase">
                                                                    {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </Link>
                                        ))
                                    ) : !loading && (
                                        <div className="text-center py-24 bg-surface/30 rounded-[40px] border border-dashed border-border/50">
                                            <Search className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                                            <p className="text-muted font-medium">"{searchValue}"-д тохирох вэбтүүн олдсонгүй.</p>
                                            <button
                                                onClick={() => setSearchValue("")}
                                                className="mt-6 text-xs font-black text-primary hover:underline uppercase tracking-widest"
                                            >
                                                Хайлтыг цэвэрлэх
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
