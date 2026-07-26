"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Star, Play, Share2, Bookmark, ChevronLeft, Search, Loader2, Heart, Plus, ThumbsUp, Info, Check, Image as ImageIcon, ArrowUpDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface WebtoonDetailClientProps {
    id: number;
    initialWebtoon: any;
    initialChapters: any[];
}
export function WebtoonDetailClient({ id, initialWebtoon, initialChapters }: WebtoonDetailClientProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [webtoon, setWebtoon] = useState<any>(initialWebtoon);
    const [chapters, setChapters] = useState<any[]>(initialChapters);
    const [loading, setLoading] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [readChapterIds, setReadChapterIds] = useState<Set<number>>(new Set());
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [lastReadChapter, setLastReadChapter] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followCount, setFollowCount] = useState(initialWebtoon.follow_count || 0);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<"episodes" | "more" | "details">("episodes");
    const [sortOrder, setSortOrder] = useState<"new" | "old">("new");
    const [relatedWebtoons, setRelatedWebtoons] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    // Derived State: Sorted Chapters - Respect manual ordering from Admin
    const sortedChapters = [...chapters].sort((a, b) => {
        const orderA = a.order_index ?? a.chapter_number ?? a.id;
        const orderB = b.order_index ?? b.chapter_number ?? b.id;
        return sortOrder === 'new' ? orderB - orderA : orderA - orderB;
    });

    // Scroll Effects for Netflix-style Parallax
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();

    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
    const heroScale = useTransform(scrollY, [0, 300], [1, 1.1]);
    const navBackgroundOpacity = useTransform(scrollY, [150, 300], [0, 1]);
    const titleOpacity = useTransform(scrollY, [250, 300], [0, 1]);

    const fetchProgress = async () => {
        if (!user || !id) return;
        const { data: progressData } = await supabase
            .from('reading_progress')
            .select('chapter_id, last_read_at')
            .eq('user_id', user.id)
            .eq('webtoon_id', id)
            .order('last_read_at', { ascending: false });

        if (progressData && progressData.length > 0) {
            const readIds = new Set(progressData.map(p => Number(p.chapter_id)));
            setReadChapterIds(readIds);
            
            const latestChapterId = Number(progressData[0].chapter_id);
            setLastReadChapter(chapters.find(c => Number(c.id) === latestChapterId));
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            if (user && id) {
                const [bookmarkRes, followRes] = await Promise.all([
                    supabase.from('bookmarks').select('*').eq('user_id', user.id).eq('webtoon_id', id).single(),
                    supabase.from('follows').select('*').eq('user_id', user.id).eq('webtoon_id', id).single()
                ]);
                
                setIsBookmarked(!!bookmarkRes.data);
                setIsFollowing(!!followRes.data);
                await fetchProgress();
            }
            setLoading(false);
        }
        fetchData();

        const handleFocus = () => fetchProgress();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [id, user, chapters]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        async function fetchRelated() {
            if (activeTab === "more" && relatedWebtoons.length === 0 && webtoon?.genres?.length > 0) {
                setLoading(true);
                const { data: related } = await supabase
                    .from('webtoons')
                    .select('*')
                    .overlaps('genres', webtoon.genres)
                    .neq('id', id)
                    .limit(6);
                setRelatedWebtoons(related || []);
                setLoading(false);
            }
        }
        fetchRelated();
    }, [activeTab, id, webtoon, relatedWebtoons.length]);

    const toggleBookmark = async () => {
        if (!user) {
            toast.error("Нэвтэрсний дараа хадгалах боломжтой.");
            return;
        }
        setBookmarkLoading(true);
        if (isBookmarked) {
            const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('webtoon_id', id);
            if (!error) {
                setIsBookmarked(false);
                toast.success('Жагсаалтаас хасагдлаа');
            }
        } else {
            const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, webtoon_id: id });
            if (!error) {
                setIsBookmarked(true);
                toast.success('Жагсаалтад нэмэгдлээ');
            }
        }
        setBookmarkLoading(false);
    };

    const toggleFollow = async () => {
        if (!user) {
            toast.error("Нэвтэрсний дараа дагах боломжтой.");
            return;
        }
        setFollowLoading(true);
        if (isFollowing) {
            const { error } = await supabase.from('follows').delete().eq('user_id', user.id).eq('webtoon_id', id);
            if (!error) {
                setIsFollowing(false);
                setFollowCount((prev: number) => Math.max(0, prev - 1));
                toast.success('Дагахаа болилоо');
            }
        } else {
            const { error } = await supabase.from('follows').insert({ user_id: user.id, webtoon_id: id });
            if (!error) {
                setIsFollowing(true);
                setFollowCount((prev: number) => prev + 1);
                toast.success('Дагаж эхэллээ');
            }
        }
        setFollowLoading(false);
    };

    const handleShare = async () => {
        const shareData = { title: webtoon.title, url: window.location.href };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Холбоос хуулагдлаа');
            }
        } catch (err) { }
    };

    if (!webtoon) return null;

    const targetChapter = lastReadChapter || (chapters.length > 0 ? chapters[chapters.length - 1] : null);
    const buttonText = lastReadChapter ? "Үргэлжлүүлэн унших" : "Уншиж эхлэх";

    // Flavor Meta: "Match" percentage based on rating or random for flair
    const matchPercentage = 90 + Math.floor(webtoon.rating * 1.5) + (id % 5);

    const headerBg = useTransform(navBackgroundOpacity, [0, 1], ["rgba(0,0,0,0)", "rgba(5,5,5,1)"]);
    const headerBlur = useTransform(navBackgroundOpacity, [0, 1], ["blur(0px)", "blur(12px)"]);

    return (
        <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden">

            {/* Netflix-style Sticky Header */}
            <motion.header
                style={{
                    backgroundColor: headerBg,
                    backdropFilter: headerBlur
                }}
                className="fixed top-0 left-0 lg:left-24 right-0 h-16 z-[100] flex items-center justify-between px-4 lg:px-10 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <motion.h2
                        style={{ opacity: titleOpacity }}
                        className="text-lg font-bold truncate max-w-[200px]"
                    >
                        {webtoon.title}
                    </motion.h2>
                </div>
                <div className="flex items-center gap-5">
                    <button className="hover:scale-110 transition-transform">
                        <Search className="w-6 h-6" />
                    </button>
                    <div className="w-7 h-7 rounded bg-primary overflow-hidden ring-1 ring-white/10 relative">
                        <Image
                            src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'Guest'}`}
                            alt="Avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </motion.header>

            {/* Hero Section with Parallax */}
            <div className="relative h-[65vh] lg:h-[85vh] w-full overflow-hidden bg-black">
                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="absolute inset-0"
                >
                    {/* Background Layer: Blurred and darkened to fill the space without pixelation */}
                    <Image
                        src={webtoon.image}
                        alt=""
                        fill
                        className="object-cover blur-3xl opacity-40 scale-110"
                        priority
                    />

                    {/* Foreground Layer: Smart positioning (top-focused) to show characters clearly */}
                    <div className="absolute inset-0 flex items-start justify-center">
                        <Image
                            src={webtoon.image}
                            alt={webtoon.title}
                            fill
                            className="object-cover transition-all duration-300"
                            style={{ objectPosition: `center ${webtoon.hero_position || 20}%` }}
                            priority
                        />
                    </div>

                    {/* Immersive Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#141414]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 lg:hidden" />
                </motion.div>

                {/* Hero Info Overlay (Bottom) */}
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-20 space-y-4">
                    <div className="flex items-center gap-2 mb-2 lg:hidden">
                        <div className="relative w-5 h-5">
                            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-80 text-white/60">Цуврал</span>
                    </div>
                    <h1 className="text-4xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4 drop-shadow-2xl">
                        {webtoon.title}
                    </h1>
                </div>
            </div>

            {/* Netflix Action Stack */}
            <div className="px-4 lg:px-20 mt-4 lg:mt-8 relative z-10 space-y-6">

                {/* Metadata Summary */}
                <div className="flex items-center gap-4 text-sm font-bold text-white/60 py-2">
                    <span className="text-green-500">{matchPercentage}% Тохирох</span>
                    <span>{new Date(webtoon.created_at || Date.now()).getFullYear()}</span>
                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] uppercase font-black text-white/80">HD</span>
                    <span>{chapters.length} Анги</span>
                </div>

                {/* Primary Action */}
                <Link href={targetChapter ? `/webtoon/${webtoon.id}/read/${targetChapter.id}` : "#"} className="block">
                    <button className="w-full py-4 bg-white text-black rounded-md font-black flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all text-sm uppercase shadow-xl">
                        <Play className="w-5 h-5 fill-current" />
                        {buttonText}
                    </button>
                </Link>

                {/* Secondary Actions */}
                <div className="flex items-start justify-center lg:justify-start gap-12 sm:gap-20 pt-2 lg:pt-4">
                    <button onClick={toggleBookmark} className="flex flex-col items-center gap-2 group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-white/5 transition-colors">
                            {isBookmarked ? <Check className="w-7 h-7 text-white" /> : <Plus className="w-7 h-7 text-white" />}
                        </div>
                        <span className="text-[10px] font-bold text-white/60 group-hover:text-white uppercase tracking-widest">Миний сан</span>
                    </button>

                    <button onClick={toggleFollow} className="flex flex-col items-center gap-2 group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-white/5 transition-colors">
                            <Heart className={cn("w-7 h-7 text-white transition-all", isFollowing && "fill-primary text-primary")} />
                        </div>
                        <span className="text-[10px] font-bold text-white/60 group-hover:text-white uppercase tracking-widest">Үнэлэх</span>
                    </button>

                    <button onClick={handleShare} className="flex flex-col items-center gap-2 group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-white/5 transition-colors">
                            <Share2 className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-white/60 group-hover:text-white uppercase tracking-widest">Хуваалцах</span>
                    </button>
                </div>

                {/* Description */}
                <div className="pt-4 max-w-4xl">
                    <p className={cn(
                        "text-sm lg:text-base font-medium leading-relaxed text-white/80 transition-all",
                        !isDescriptionExpanded && "line-clamp-3"
                    )}>
                        {webtoon.description}
                    </p>
                    {webtoon.description?.length > 150 && (
                        <button
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            className="mt-2 text-white/40 text-xs font-bold hover:text-white transition-colors uppercase tracking-widest"
                        >
                            {isDescriptionExpanded ? "Бага үзэх" : "Дэлгэрэнгүй"}
                        </button>
                    )}
                    <div className="mt-6 text-xs font-bold text-white/30 flex flex-wrap gap-x-4 gap-y-2">
                        <div className="flex gap-2"><span className="text-white/50">Зохиолч:</span> <span className="text-white/70 italic">{webtoon.author}</span></div>
                        <div className="flex gap-2"><span className="text-white/50">Төрөл:</span> <span className="text-white/70 italic">{webtoon.genres?.join(', ')}</span></div>
                    </div>
                </div>

                {/* Tabbed Navigation */}
                <div className="pt-12">
                    <div className="flex gap-10 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => setActiveTab("episodes")}
                            className={cn(
                                "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                                activeTab === "episodes" ? "text-white" : "text-white/40 hover:text-white/60"
                            )}
                        >
                            Ангиуд
                            {activeTab === "episodes" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                        </button>
                        <button
                            onClick={() => setActiveTab("more")}
                            className={cn(
                                "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                                activeTab === "more" ? "text-white" : "text-white/40 hover:text-white/60"
                            )}
                        >
                            Төсөөтэй
                            {activeTab === "more" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === "episodes" ? (
                            <motion.div
                                key="episodes"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6 pb-20"
                            >
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'new' ? 'old' : 'new')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/5 active:scale-95 text-[11px] font-bold shadow-sm uppercase tracking-wider"
                                    >
                                        <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                                        <span>Эрэмбэ: {sortOrder === 'new' ? 'Шинэ нь эхэндээ' : 'Хуучин нь эхэндээ'}</span>
                                    </button>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Нийт {chapters.length} бүлэг</span>
                                </div>
                                 {sortedChapters.map((chapter) => (
                                    <Link
                                        key={chapter.id}
                                        href={`/webtoon/${webtoon.id}/read/${chapter.id}`}
                                        className="group block"
                                        onMouseEnter={() => {
                                            // Pre-fetch chapter data and images on hover
                                            if (typeof window !== 'undefined') {
                                                const { fetchChapterImagesAction } = require("@/app/actions/fetch-actions");
                                                fetchChapterImagesAction(chapter.id).catch(() => {});
                                            }
                                        }}
                                    >
                                        <div className="flex gap-4 items-start py-3">
                                            <div className="relative w-36 lg:w-48 aspect-video flex-shrink-0 bg-white/5 rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg">
                                                <Image
                                                    src={chapter.images?.[0] || webtoon.image}
                                                    alt={chapter.title}
                                                    fill
                                                    className={cn(
                                                        "object-cover transition-transform duration-500 group-hover:scale-110",
                                                        readChapterIds.has(Number(chapter.id)) && "opacity-40 grayscale"
                                                    )}
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                {readChapterIds.has(Number(chapter.id)) && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                            <Check className="w-5 h-5 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                                    {readChapterIds.has(Number(chapter.id)) && <div className="h-full bg-primary w-full" />}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className={cn(
                                                            "text-sm lg:text-base font-bold transition-colors line-clamp-2",
                                                            readChapterIds.has(Number(chapter.id)) ? "text-white/30" : "text-white group-hover:text-primary"
                                                        )}>
                                                            {chapter.title}
                                                        </h3>
                                                        {(new Date(chapter.created_at || chapter.date).getTime() > Date.now() - 48 * 60 * 60 * 1000) && (
                                                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[9px] font-black uppercase tracking-widest animate-pulse flex-shrink-0 shadow-[0_0_10px_rgba(229,9,20,0.2)]">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Info className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors mt-1" />
                                                </div>
                                                <p className="text-[10px] text-white/30 font-black mt-1 uppercase tracking-widest">
                                                    {mounted ? new Date(chapter.date || chapter.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                                                </p>
                                                <p className="text-[11px] lg:text-xs text-white/50 line-clamp-2 mt-3 leading-snug font-medium italic">
                                                    {chapter.description || "Бүлгийн дэлгэрэнгүй тайлбар одоогоор байхгүй байна."}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="more"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="grid grid-cols-3 gap-3 pb-20"
                            >
                                {loading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-md animate-pulse border border-white/5" />
                                    ))
                                ) : (
                                    relatedWebtoons.map((item) => (
                                        <Link key={item.id} href={`/webtoon/${item.id}`}>
                                            <div className="relative aspect-[2/3] bg-white/5 rounded-md overflow-hidden ring-1 ring-white/10 group shadow-md">
                                                <Image
                                                    src={item.image}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 px-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest line-clamp-1">{item.title}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
