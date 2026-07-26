"use client";

import { useState, useEffect, useMemo } from "react";
import { MatureWebtoonCard } from "@/components/secret/MatureWebtoonCard";
import { useAuth } from "@/context/AuthContext";
import { 
    ShieldAlert, 
    Lock, 
    ArrowLeft, 
    Loader2, 
    Sparkles, 
    AlertTriangle, 
    ChevronDown, 
    Check, 
    LayoutGrid, 
    List,
    SearchX 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WebtoonCard } from "@/components/home/WebtoonCard";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { fetchUserReadingProgressAction } from "@/app/actions/fetch-actions";

interface SecretClientProps {
    initialWebtoons: any[];
    latestUpdates: any[];
}

/**
 * Secret Vault (NSFW Collection)
 * Redesigned in Crimson Shadow Style
 */

export function SecretClient({ initialWebtoons, latestUpdates = [] }: SecretClientProps) {
    const { user, profile, loading: authLoading } = useAuth();
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const verified = localStorage.getItem("nsfw-verified");
        if (verified === "true") {
            setIsVerified(true);
        }
    }, []);

    const handleVerify = () => {
        setIsVerified(true);
        localStorage.setItem("nsfw-verified", "true");
    };

    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [sortBy, setSortBy] = useState<'popularity' | 'latest' | 'top-rated'>('popularity');
    const [activeGenre, setActiveGenre] = useState('All');
    const [activeStatus, setActiveStatus] = useState('All');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [continueReading, setContinueReading] = useState<any[]>([]);

    useEffect(() => {
        async function fetchUserSpecificData() {
            if (!user) {
                setContinueReading([]);
                return;
            }
            try {
                // Fetch ONLY NSFW reading progress
                const result = await fetchUserReadingProgressAction(10, true, true);
                const progress = result.data;
                if (progress && progress.length > 0) {
                    setContinueReading(progress.map((p: any, index: number) => ({
                        ...p.webtoons,
                        unique_history_id: `${p.webtoon_id}_${p.chapter_id}_${index}`,
                        last_read_chapter_id: p.chapter_id,
                        last_read_chapter_title: p.chapters?.title || "1",
                        chapter_count_label: p.webtoons?.chapter_count_label || '...'
                    })));
                }
            } catch (err) {
                console.error("Error fetching NSFW reading progress:", err);
            }
        }
        fetchUserSpecificData();
    }, [user]);

    const hasNsfwVip = profile?.nsfw_vip_expiration 
        ? new Date(profile.nsfw_vip_expiration) > new Date() 
        : false;

    const sortOptions = [
        { id: 'popularity', label: 'Түгээмэл' },
        { id: 'latest', label: 'Шинэ' },
        { id: 'top-rated', label: 'Өндөр үнэлгээтэй' }
    ];

    const formattedWebtoons = useMemo(() => {
        return initialWebtoons.map(w => ({
            ...w,
            chapter_count_label: w.chapter_count_label || '0 Бүлэг'
        }));
    }, [initialWebtoons]);

    const filteredWebtoons = useMemo(() => {
        let result = [...formattedWebtoons];

        // Genre filter logic
        if (activeGenre !== 'All' && activeGenre !== 'Бүгд') {
            const searchGenre = activeGenre.toLowerCase();
            result = result.filter(w => 
                w.genres && Array.isArray(w.genres) && 
                w.genres.some((g: string) => {
                    const genre = g.toLowerCase();
                    // Match either English ID (Romance) or Mongolian ID (Романс) for safety
                    return genre === searchGenre || 
                           (searchGenre === 'романс' && genre === 'romance') ||
                           (searchGenre === 'action' && genre === 'action');
                })
            );
        }

        // Sorting logic
        if (sortBy === 'latest') {
            result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } else if (sortBy === 'top-rated') {
            result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === 'popularity') {
            result.sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        return result;
    }, [formattedWebtoons, activeGenre, sortBy]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-red-600/20 rounded-full" />
                </div>
                <p className="text-red-500/60 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Уншиж байна...</p>
            </div>
        );
    }

    // Age Verification Disclaimer (Premium Version)
    if (showDisclaimer && !isVerified) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center px-6 relative overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-950/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-900/10 blur-[150px] rounded-full" />
                
                <motion.div 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="max-w-xl w-full bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 p-12 rounded-[3.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative z-10"
                >
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                    
                    <div className="space-y-8">
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 group hover:scale-110 transition-transform cursor-default">
                            <ShieldAlert className="w-10 h-10 text-red-500 group-hover:animate-pulse" />
                        </div>
                        
                        <div className="space-y-3">
                            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
                                Хязгаарлагдсан <br /> <span className="text-red-600">Хэсэг</span>
                            </h1>
                            <div className="h-1 w-20 bg-red-600 mx-auto rounded-full" />
                        </div>

                        <p className="text-white/60 text-lg leading-relaxed font-medium">
                            Энэхүү хэсэг нь зөвхөн <span className="text-white font-bold">насанд хүрэгчдэд</span> зориулсан контент агуулсан болно. 
                            Үргэлжлүүлэхийн тулд өөрийн насыг баталгаажуулна уу.
                        </p>
                        
                        <div className="flex flex-col gap-4 pt-4">
                            <button
                                onClick={handleVerify}
                                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-red-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                Нэвтрэх (18+)
                            </button>
                            <Link
                                href="/"
                                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl font-black uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Буцах
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }


    const genreOptions = [
        { id: 'All', label: 'Бүгд' },
        { id: 'Romance', label: 'Романс' },
        { id: 'Action', label: 'Action' },
        { id: 'Drama', label: 'Drama' },
        { id: 'Psychological', label: 'Psychological' },
        { id: 'Fantasy', label: 'Fantasy' }
    ];

    const statusOptions = [
        { id: 'All', label: 'Бүх' },
        { id: 'Ongoing', label: 'Үргэлжилж буй' },
        { id: 'Completed', label: 'Дууссан' },
        { id: 'Hiatus', label: 'Завсарласан' }
    ];

    const isDiscoveryView = activeGenre === 'All' && activeStatus === 'All' && sortBy === 'popularity';

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600/30">
            {/* MOBILE HEADER (Catalog Style) */}
            <div className="lg:hidden bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 pt-2 pb-3 px-4 sticky top-0 z-40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <DropdownFilter 
                        label="Төрөл" 
                        value={activeGenre} 
                        options={genreOptions} 
                        onChange={setActiveGenre}
                        isOpen={activeDropdown === 'genre'}
                        onToggle={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
                        variant="catalog"
                    />
                    <DropdownFilter 
                        label="Төлөв" 
                        value={activeStatus} 
                        options={statusOptions} 
                        onChange={setActiveStatus}
                        isOpen={activeDropdown === 'status'}
                        onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                        variant="catalog"
                    />
                    <DropdownFilter 
                        label="Эрэмбэ" 
                        value={sortBy} 
                        options={sortOptions} 
                        onChange={(val: any) => setSortBy(val)}
                        isOpen={activeDropdown === 'sort'}
                        onToggle={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                        align="right"
                        variant="catalog"
                    />
                </div>
            </div>

            {/* DESKTOP HEADER (Vault Style - 100% Catalog Parity) */}
            <div className="hidden lg:block bg-[#050505] pt-32 pb-8 px-12 border-b border-white/5">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-end justify-between">
                        <div className="flex items-center gap-6">
                            <DropdownFilter 
                                label="Ангилал" 
                                value={activeGenre} 
                                options={genreOptions} 
                                onChange={setActiveGenre}
                                isOpen={activeDropdown === 'genre'}
                                onToggle={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
                                variant="vault"
                            />
                            <div className="opacity-40 font-black">
                                <DropdownFilter 
                                    label="Улирал" 
                                    value="All" 
                                    options={[{id: 'All', label: 'Улирал'}]} 
                                    onChange={() => {}}
                                    variant="vault"
                                />
                            </div>
                            <DropdownFilter 
                                label="Төлөв" 
                                value={activeStatus} 
                                options={statusOptions} 
                                onChange={setActiveStatus}
                                isOpen={activeDropdown === 'status'}
                                onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                variant="vault"
                            />
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <DropdownFilter 
                                label="Эрэмбэ" 
                                value={sortBy} 
                                options={sortOptions} 
                                onChange={(val: any) => setSortBy(val)}
                                isOpen={activeDropdown === 'sort'}
                                onToggle={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                                align="right"
                                variant="vault"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 lg:px-12 py-8">
                <main className="space-y-[5px]">
                    {/* Discovery Sections (Only visible when no filters are active) */}
                    {isDiscoveryView && (continueReading.length > 0 || latestUpdates.length > 0) && (
                        <div className="space-y-[5px] pb-8 border-b border-white/5">
                            {continueReading.length > 0 && (
                                <DiscoveryRow 
                                    title="ҮРГЭЛЖЛҮҮЛЭН УНШИХ" 
                                    items={continueReading} 
                                    isUpdate={false}
                                    isContinueReading={true}
                                />
                            )}
                            {latestUpdates.length > 0 && (
                                <DiscoveryRow 
                                    title="ШИНЭЭР НЭМЭГДСЭН" 
                                    items={latestUpdates} 
                                    isUpdate
                                />
                            )}
                        </div>
                    )}

                    {/* Grid List Section */}
                    <div className="space-y-8">
                        {isDiscoveryView && (
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                                <h2 className="text-xl font-black uppercase tracking-tighter text-white/95">БҮХ ВЭБТҮҮН</h2>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {filteredWebtoons.length > 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-10"
                                >
                                    {filteredWebtoons.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (index % 16) * 0.03, duration: 0.4 }}
                                            className="transition-transform hover:scale-105 duration-300"
                                        >
                                            <WebtoonCard
                                                id={item.id}
                                                title={item.title}
                                                rating={item.rating?.toString()}
                                                image={item.image}
                                                chapter={item.chapter_count_label}
                                                isNew={item.is_new}
                                                isUpdated={false}
                                                aspect="portrait"
                                                genres={item.genres}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="py-40 flex flex-col items-center text-center space-y-6">
                                    <div className="p-10 bg-white/[0.02] border border-white/5 rounded-full relative">
                                        <div className="absolute inset-0 blur-3xl bg-red-600/5 rounded-full" />
                                        <Sparkles className="w-16 h-16 text-white/5 relative z-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Вэбтүүн олдсонгүй</h3>
                                        <p className="text-white/30 text-xs font-medium tracking-widest uppercase">Шүүлтийг өөрчлөөд дахин оролдоно уу</p>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    {filteredWebtoons.length > 0 && (
                        <div className="flex items-center justify-center gap-2 py-20 border-t border-white/5">
                            {[1].map(p => (
                                <button 
                                    key={p}
                                    className={cn(
                                        "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                                        p === 1 ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]" : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </main>
            </div>
            
        </div>
    );
}

function DiscoveryRow({ title, items, isUpdate = false, isContinueReading = false }: { title: string, items: any[], isUpdate?: boolean, isContinueReading?: boolean }) {
    if (items.length === 0) return null;
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="relative"
        >
            <div className="flex items-center justify-between mb-4 px-1 group/header">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(255,59,48,0.4)]" />
                    <h2 className="text-[15px] md:text-[17px] font-black tracking-tighter uppercase text-white group-hover/header:text-primary transition-colors">
                        {title}
                    </h2>
                </div>
            </div>

            <div className="flex gap-4 lg:gap-6 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4 snap-x">
                {items.map((item, idx) => (
                    <div 
                        key={item.chapter_id || `${item.id}-${idx}`} 
                        className="flex-shrink-0 snap-start w-[145px] lg:w-[185px]"
                    >
                        {isContinueReading ? (
                            <ContinueReadingCard
                                id={item.id}
                                title={item.title}
                                image={item.image}
                                lastReadChapterId={item.last_read_chapter_id || item.last_read_chapter || 1}
                                lastReadChapterTitle={item.last_read_chapter_title}
                                totalChapters={item.chapters?.length || (typeof item.chapter_count_label === 'string' ? parseInt(item.chapter_count_label.replace(/\D/g, '')) : 0) || 0}
                                priority={idx < 4}
                            />
                        ) : (
                            <WebtoonCard
                                id={item.id}
                                title={item.title || "Вэбтүүн"}
                                rating={item.rating?.toString()}
                                image={item.image || "/placeholder.jpg"}

                                chapter={item.last_read_chapter_title ? `Бүлэг ${item.last_read_chapter_title}` : isUpdate ? item.chapter_title : item.chapter_count_label}
                                updateBadge={item.last_read_chapter_title ? `Бүлэг ${item.last_read_chapter_title}` : isUpdate ? item.chapter_title : undefined}
                                progressStatus={item.last_read_chapter_title ? "in-progress" : undefined}
                                isNew={item.is_new}
                                isUpdated={isUpdate}
                                aspect="portrait"
                                genres={item.genres}
                                href={item.last_read_chapter_id ? `/webtoon/${item.id}/read/${item.last_read_chapter_id}` : isUpdate ? `/webtoon/${item.id}/read/${item.chapter_id}` : undefined}
                                priority={idx < 4}
                            />
                        )}
                    </div>
                ))}
            </div>
        </motion.section>
    );
}

function DropdownFilter({ label, value, options, onChange, isOpen, onToggle, align = 'left', variant = 'catalog' }: any) {
    const selectedLabel = options.find((o: any) => o.id === value)?.label || value;
    
    return (
        <div className="relative">
            {variant === 'vault' && (
                <label className="block text-xs font-medium text-white/40 mb-2 pl-0.5 uppercase tracking-wider">{label}</label>
            )}
            
            <button
                onClick={onToggle}
                className={cn(
                    "relative flex flex-row items-center justify-between transition-all bg-[#111111]",
                    variant === 'catalog' 
                        ? "w-[95px] lg:w-[130px] h-[30px] px-2 border rounded-[4px] " + (isOpen ? "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "border-white/20 hover:border-white/40")
                        : "px-4 h-10 min-w-[120px] rounded-lg border " + (isOpen ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.1)]" : "border-white/10 hover:border-white/20")
                )}
            >
                {variant === 'catalog' && (
                    <span className="absolute -top-[6px] left-1.5 px-1 bg-[#0a0a0a] text-[#eab308] text-[8px] font-medium leading-none tracking-wide z-10 whitespace-nowrap">
                        {label}
                    </span>
                )}
                
                <span className={cn(
                    "text-[10px] lg:text-xs truncate tracking-wide text-left",
                    isOpen ? "text-white font-medium" : "text-white/60",
                )}>
                    {selectedLabel}
                </span>
                
                <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-300 ml-1 flex-shrink-0",
                    isOpen ? "rotate-180 text-white" : variant === 'catalog' ? "text-white/40" : "text-white/30"
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            "absolute top-full mt-3 z-[100] min-w-[160px] bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 overflow-hidden",
                            align === 'right' ? "right-0" : "left-0"
                        )}
                    >
                        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {options.map((opt: any) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        onToggle();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all",
                                        value === opt.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.id && <Check className="w-3 h-3 text-red-600" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
