"use client";

import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { ReaderMenu } from "@/components/reader/ReaderMenu";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { ReaderComments } from "@/components/reader/ReaderComments";
import { ReaderImage } from "@/components/reader/ReaderImage"; // Newly added
import { useParams, useRouter } from "next/navigation";
import { ReaderControls } from "@/components/reader/ReaderControls";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Loader2, Settings, List, Crown, Home } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getCDNUrl } from "@/lib/storage-utils";
import { fetchChapterImagesAction, updateReadingProgressAction, getChapterLikesAction } from "@/app/actions/fetch-actions";
import { supabase } from "@/lib/supabase";

import { memo, useMemo } from "react";
import { ContentProtection } from "@/components/common/ContentProtection";

interface ReaderClientProps {
    id: string;
    chapterId: string;
    initialChapter: any;
    initialWebtoon: any;
    initialAllChapters: any[];
    initialIsVipBlocked?: boolean;
    initialUser?: any;
    isNsfwFreeOverride?: boolean;
}

import { useWindowVirtualizer } from '@tanstack/react-virtual';
// We use Window Virtualizer directly in the component for performance.


import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function ReaderClient({
    // ... props
    id,
    chapterId,
    initialChapter,
    initialWebtoon,
    initialAllChapters,
    initialIsVipBlocked = false,
    initialUser = null,
    isNsfwFreeOverride = false
}: ReaderClientProps) {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [chapter, setChapter] = useState<any>(initialChapter);
    const [webtoon, setWebtoon] = useState<any>(initialWebtoon);
    const [isVipBlocked, setIsVipBlocked] = useState(initialIsVipBlocked);
    const [nextChapterImages, setNextChapterImages] = useState<string[]>([]);
    const hasFetchedNextRef = useRef(false);

    useEffect(() => {
        console.log("🔥🔥 READER CLIENT MOUNTED 🔥🔥", chapter?.title);
    }, []);

    const [loading, setLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Reader Settings State
    const [readerTheme, setReaderTheme] = useState<"dark" | "light" | "sepia">("dark");
    const [brightness, setBrightness] = useState(100);
    const [readMode, setReadMode] = useState<"vertical" | "horizontal">("vertical");

    // Load Settings from Persistence
    useEffect(() => {
        const savedTheme = localStorage.getItem('reader_theme') as any;
        const savedBrightness = localStorage.getItem('reader_brightness');
        const savedReadMode = localStorage.getItem('reader_mode') as any;
        if (savedTheme) setReaderTheme(savedTheme);
        if (savedBrightness) setBrightness(parseInt(savedBrightness));
        if (savedReadMode) setReadMode(savedReadMode);
    }, []);

    // Save Settings
    useEffect(() => {
        localStorage.setItem('reader_theme', readerTheme);
        localStorage.setItem('reader_brightness', brightness.toString());
        localStorage.setItem('reader_mode', readMode);
    }, [readerTheme, brightness, readMode]);

    // Social State
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const [allChapters, setAllChapters] = useState<any[]>(initialAllChapters);
    const [showControls, setShowControls] = useState(true);
    const [lastTap, setLastTap] = useState(0);
    const [showHeart, setShowHeart] = useState(false);
    const tapTimeout = useRef<any>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [hasFinished, setHasFinished] = useState(false);
    const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Scroll & Progress Logistics ---
    const [scrollProgress, setScrollProgress] = useState(0);
    const { scrollYProgress } = useScroll();
    const isScrolling = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Initial resets and Scroll Restoration (Aggressive Force Reset)
    useLayoutEffect(() => {
        if (!id || !chapterId) return;

        // Force reset across all possible scrolling elements
        const resetScroll = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };

        resetScroll();
        
        // Also ensure scrollRestoration is manual BEFORE any other logic
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Secondary safety reset after a tiny delay to catch any Next.js/Browser overrides
        const timer = setTimeout(resetScroll, 10);
        return () => clearTimeout(timer);
    }, [id, chapterId]);

    // Saved position restoration
    useEffect(() => {
        if (!id || !chapterId || !chapter) return;
        const storageKey = `webtoon_scroll_${id}_${chapterId}`;
        const savedPosition = localStorage.getItem(storageKey);

        if (savedPosition) {
            // ONLY restore if a position was explicitly saved for THIS chapter
            const timer = setTimeout(() => {
                window.scrollTo({ top: parseInt(savedPosition), behavior: "auto" });
            }, 150);
            return () => clearTimeout(timer);
        } else {
            // NO SAVED POSITION -> Force top again just in case
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
        }
    }, [id, chapterId, !!chapter]);

    // Progress Tracking Strategy (Vertical)
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        if (readMode === "vertical") {
            const rounded = Math.round(latest * 100);
            if (rounded !== scrollProgress) {
                setScrollProgress(rounded);
                if (rounded >= 90 && !hasFinished && user) handleCompleteReading();
            }
        }
        
        isScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => isScrolling.current = false, 150);
    });

    // Progress Tracking Strategy (Horizontal)
    const handleSwiperChange = (swiper: any) => {
        if (readMode === "horizontal") {
            const total = chapter?.images?.length || 1;
            const progress = Math.round((swiper.activeIndex / (total - 1)) * 100);
            setScrollProgress(progress);
            if (progress >= 90 && !hasFinished && user) handleCompleteReading();
        }
    };

    // Prefetching and Controls Visibility
    useEffect(() => {
        const handleScroll = () => {
            const currentScroll = window.scrollY;
            const storageKey = `webtoon_scroll_${id}_${chapterId}`;
            if (currentScroll > 50) {
                localStorage.setItem(storageKey, currentScroll.toString());
            }

            // Simple show/hide controls based on scroll direction
            // (handled by framer motion event now for progress, but direction here)
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [id, chapterId]);

    // Manual Controls reveal/hide helper
    const lastScrollY = useRef(0);
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        const current = window.scrollY;
        if (current > lastScrollY.current && current > 200) {
            setShowControls(false);
        } else if (current < lastScrollY.current) {
            setShowControls(true);
        }
        lastScrollY.current = current;

        // Prefetch logic
        if (Math.round(latest * 100) >= 50 && !hasFetchedNextRef.current) {
            const currentIndex = allChapters.findIndex(c => String(c.id) === String(chapterId));
            const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
            const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
            if (nextChapter) {
                const nextId = nextChapter.id;
                hasFetchedNextRef.current = true;
                router.prefetch(`/webtoon/${id}/read/${nextId}`);
                (async () => {
                    const result = await fetchChapterImagesAction(nextId);
                    if (result.success && result.data) setNextChapterImages(result.data);
                })();
            }
        }
    });

    // Virtualization
    const virtualizer = useWindowVirtualizer({
        count: chapter?.images?.length || 0,
        estimateSize: () => 1200, 
        overscan: 10,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });

    useEffect(() => {
        async function fetchData() {
            if (!chapter || authLoading) return;

            // Wait 1.5 seconds before fetching likes to give priority to the UI render
            // and reduce immediate load on the database
            setTimeout(async () => {
                const result = await getChapterLikesAction(chapter.id, user?.id);
                if (result.success) {
                    setLikeCount(result.count);
                    if (user) setIsLiked(result.isLiked);
                }
            }, 1500);

            // VIP Check - Should run for all users (logged in or guest)
            let isVip = false;
            const now = new Date();

            // 1. Regular VIP check
            if (profile?.is_vip) {
                isVip = true;
                if (profile.vip_expiration && new Date(profile.vip_expiration) < now) {
                    isVip = false;
                }
            }

            // 2. NSFW VIP check (If it's an NSFW webtoon and user has NSFW VIP)
            if (!isVip && webtoon?.is_nsfw && profile?.nsfw_vip_expiration) {
                if (new Date(profile.nsfw_vip_expiration) > now) {
                    isVip = true;
                }
            }

            // 3. Global NSFW Override
            if (!isVip && webtoon?.is_nsfw && isNsfwFreeOverride) {
                isVip = true;
            }

            // Find current chapter index to determine if it's within the free range
            let index = allChapters.findIndex(c => String(c.id) === String(chapterId));
            
            // Fallback: if not found in list, check if it matches initialChapter
            if (index === -1 && chapter && String(chapter.id) === String(chapterId)) {
                index = chapter.chapter_number === 1 ? 0 : 1; 
            }

            // Default to 1 free chapter if not defined
            const freeChaptersCount = webtoon?.free_chapters ?? 1;

            // Block if: Index is beyond the free range AND user is not VIP
            const shouldBlock = index >= freeChaptersCount && !isVip;
            setIsVipBlocked(shouldBlock);

            if (user && chapter) {
                // Progress (UPSERT - now debounced)
                saveProgress();
            }
        }

        fetchData();

        return () => {
            if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
        };
    }, [id, chapterId, user?.id, authLoading, profile, allChapters, chapter]);

    const saveProgress = async () => {
        if (!user || !chapter) return;

        if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);

        progressTimeoutRef.current = setTimeout(async () => {
            console.log("💾 SAVING PROGRESS (SERVER ACTION)...", chapter.id);
            await updateReadingProgressAction({
                chapterId: chapter.id,
                webtoonId: Number(id)
            });
        }, 3000); // 3 second debounce
    };

    const currentIndex = useMemo(() => allChapters.findIndex(c => c.id === Number(chapterId)), [allChapters, chapterId]);
    const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
    const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;

    // Prefetch
    useEffect(() => {
        if (nextChapter) router.prefetch(`/webtoon/${id}/read/${nextChapter.id}`);
        if (prevChapter) router.prefetch(`/webtoon/${id}/read/${prevChapter.id}`);
    }, [nextChapter, prevChapter, id, router]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && prevChapter) router.push(`/webtoon/${id}/read/${prevChapter.id}`);
            else if (e.key === 'ArrowRight' && nextChapter) router.push(`/webtoon/${id}/read/${nextChapter.id}`);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prevChapter, nextChapter, id, router]);

    const handleCompleteReading = async () => {
        if (!user || !chapter || hasFinished) return;

        setHasFinished(true);
        const result = await updateReadingProgressAction({
            chapterId: chapter.id,
            webtoonId: Number(id)
        });
    };

    const toggleLike = async () => {
        if (!user) {
            toast.error("Нэвтэрсний дараа лайк дарах боломжтой.");
            return;
        }

        if (isLiked) {
            const { error } = await supabase.from('likes').delete().eq('chapter_id', chapter.id).eq('user_id', user.id);
            if (!error) {
                setIsLiked(false);
                setLikeCount(prev => prev - 1);
            }
        } else {
            const { error } = await supabase.from('likes').insert({ chapter_id: chapter.id, user_id: user.id });
            if (!error) {
                setIsLiked(true);
                setLikeCount(prev => prev + 1);
            }
        }
    };

    const markAsRead = async () => {
        if (!user || !chapter) return;
        saveProgress(); // Use debounced save instead of immediate update
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) markAsRead(); },
            { threshold: 0.1 }
        );
        const target = document.getElementById('progress-marker');
        if (target) observer.observe(target);
        return () => observer.disconnect();
    }, [user?.id, chapter?.id]);

    const themeConfig = {
        dark: { bg: "bg-[#050505]", text: "text-white" },
        light: { bg: "bg-white", text: "text-black" },
        sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]" },
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
    if (!chapter) return null;

    if (isVipBlocked) {
        return (
            <>
                <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center relative overflow-hidden text-white">
                    <ReaderHeader 
                        webtoonTitle={webtoon?.title || "Webtoon"} 
                        chapterTitle={chapter?.title || "Chapter"} 
                        webtoonId={id as string} 
                        onToggleMenu={() => setIsMenuOpen(true)} 
                        onToggleSettings={() => setIsSettingsOpen(true)} 
                    />
                    <div className="relative z-10 max-w-lg w-full bg-surface border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8">
                        {!user ? (
                            <>
                                <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
                                    <Loader2 className="w-12 h-12 text-primary" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Нэвтрэх Шаардлагатай</h2>
                                    <p className="text-muted text-lg leading-relaxed">Энэ бүлгийг үргэлжлүүлэн уншихын тулд та <span className="text-primary font-bold">Нэвтрэх</span> эсвэл <span className="text-primary font-bold">Бүртгүүлэх</span> шаардлагатай.</p>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <button 
                                        onClick={() => {
                                            router.push('/');
                                        }} 
                                        className="w-full py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Нэвтрэх / Бүртгүүлэх
                                    </button>
                                    <button onClick={() => router.push(`/webtoon/${id}`)} className="w-full py-4 rounded-xl bg-white/5 text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all">Буцах</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={cn(
                                    "w-24 h-24 mx-auto rounded-full flex items-center justify-center border shadow-2xl transition-all duration-700",
                                    webtoon?.is_nsfw 
                                        ? "bg-red-600/10 border-red-500/20 shadow-red-900/30" 
                                        : "bg-yellow-500/10 border-yellow-500/20 shadow-yellow-500/20"
                                )}>
                                    <Crown className={cn(
                                        "w-12 h-12 fill-current",
                                        webtoon?.is_nsfw ? "text-red-600" : "text-yellow-500"
                                    )} />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                                        {webtoon?.is_nsfw ? "+18 VIP Хандалт Шаардлагатай" : "VIP Хандалт Шаардлагатай"}
                                    </h2>
                                    <p className="text-muted text-lg leading-relaxed">
                                        Уучлаарай, энэ бүлгийг зөвхөн <span className={cn("font-bold", webtoon?.is_nsfw ? "text-red-500" : "text-yellow-500")}>
                                            {webtoon?.is_nsfw ? "+18 VIP гишүүд" : "VIP гишүүд"}
                                        </span> унших боломжтой.
                                    </p>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <button 
                                        onClick={() => router.push('/vip')} 
                                        className={cn(
                                            "w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg",
                                            webtoon?.is_nsfw 
                                                ? "bg-red-600 text-white shadow-red-900/40 hover:bg-red-700" 
                                                : "bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-yellow-500/20"
                                        )}
                                    >
                                        {webtoon?.is_nsfw ? "+18 VIP Эрх авах" : "VIP Эрх авах"}
                                    </button>
                                    <button onClick={() => router.push(`/webtoon/${id}`)} className="w-full py-4 rounded-xl bg-white/5 text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all">Буцах</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </>
        );
    }

    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;

        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap < DOUBLE_TAP_DELAY) {
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
            if (!isLiked) toggleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        } else {
            tapTimeout.current = setTimeout(() => setShowControls(prev => !prev), DOUBLE_TAP_DELAY);
        }
        setLastTap(now);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
        setSwipeDirection(null);
        setSwipeProgress(0);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null || isScrolling.current) return;

        const deltaX = touchStartX.current - e.targetTouches[0].clientX;
        const deltaY = touchStartY.current - e.targetTouches[0].clientY;

        // Lock swipe if vertical movement is significant
        if (Math.abs(deltaY) > 20) return;

        const SWIPE_THRESHOLD = 80;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            setSwipeDirection(deltaX > 0 ? "left" : "right");
            setSwipeProgress(Math.min(Math.abs(deltaX) / 200, 1));
        }
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const finalX = e.changedTouches[0].clientX;
        const distance = touchStartX.current - finalX;

        // Intentional long swipe
        if (Math.abs(distance) > 130 && !isScrolling.current) {
            if (distance > 0 && nextChapter) router.push(`/webtoon/${id}/read/${nextChapter.id}`);
            else if (distance < 0 && prevChapter) router.push(`/webtoon/${id}/read/${prevChapter.id}`);
        }
        touchStartX.current = null;
        touchStartY.current = null;
        setSwipeDirection(null);
        setSwipeProgress(0);
    };

    return (
        <div
            className={cn("min-h-screen transition-colors duration-500 overscroll-y-none relative", themeConfig[readerTheme].bg)}
        >
            {/* BRIGHTNESS OVERLAY (Fixed positioning to cover everything) */}
            {brightness < 100 && (
                <div
                    className="fixed inset-0 z-[999] pointer-events-none bg-black transition-opacity duration-300"
                    style={{ opacity: (100 - brightness) / 100 }}
                />
            )}

            <div className="relative z-[100]">
                <ReaderHeader
                    webtoonTitle={webtoon?.title || "Webtoon"}
                    chapterTitle={chapter.title}
                    webtoonId={id as string}
                    onToggleMenu={() => setIsMenuOpen(true)}
                    onToggleSettings={() => setIsSettingsOpen(true)}
                    isVisible={showControls || scrollProgress < 5 || scrollProgress > 95}
                />
            </div>

            <ContentProtection>
                <div className="w-full h-full relative">
                    <div className="h-16 lg:h-20 w-full mb-4 opacity-0 pointer-events-none">
                        {/* Spacer for header */}
                    </div>

                    <main className="max-w-[800px] mx-auto w-full relative z-[10] pb-32">
                        {readMode === "horizontal" ? (
                            <div className="w-full h-[80vh] bg-black relative flex items-center justify-center">
                                <Swiper
                                    modules={[Navigation, Pagination, Keyboard]}
                                    navigation
                                    pagination={{ type: 'fraction' }}
                                    keyboard={{ enabled: true }}
                                    className="w-full h-full"
                                    onSlideChange={handleSwiperChange}
                                    onClick={(swiper, e) => handleContainerClick(e as any)}
                                    onReachEnd={() => {
                                        if (nextChapter) {
                                            toast("Дараагийн бүлэг рүү шилжих үү?", {
                                                action: {
                                                    label: "Тийм",
                                                    onClick: () => router.push(`/webtoon/${id}/read/${nextChapter.id}`)
                                                }
                                            });
                                        } else {
                                            handleCompleteReading();
                                        }
                                    }}
                                >
                                    {chapter.images.map((url: string, index: number) => (
                                        <SwiperSlide key={index} className="flex items-center justify-center max-h-full">
                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                <img
                                                    src={getCDNUrl(url, { width: 1200, quality: 90, format: 'webp' })}
                                                    alt={`Page ${index + 1}`}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>
                        ) : (
                            <div ref={listRef} className="flex flex-col items-center w-full relative" onClick={handleContainerClick} style={{ height: `${virtualizer.getTotalSize()}px` }}>
                                {virtualizer.getVirtualItems().map((virtualItem) => (
                                    <div
                                        key={virtualItem.key}
                                        data-index={virtualItem.index}
                                        ref={virtualizer.measureElement}
                                        className="absolute top-0 left-0 w-full"
                                        style={{
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <ReaderImage
                                            src={chapter.images[virtualItem.index]}
                                            alt={`Page ${virtualItem.index + 1}`}
                                            index={virtualItem.index}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative z-[20] w-full bg-inherit">
                            <div id="progress-marker" className="h-20 w-full" />
                            <section className={cn("w-full py-10 px-4 transition-colors duration-500 mb-10", readerTheme === "dark" ? "bg-gradient-to-t from-black to-transparent" : "")}>
                                <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {prevChapter && (
                                        <button onClick={() => router.push(`/webtoon/${id}/read/${prevChapter.id}`)} className="w-full relative overflow-hidden group rounded-3xl bg-surface border border-white/10 p-6 text-left transition-all hover:bg-white/5 active:scale-95 cursor-pointer">
                                            <div className="relative z-10 flex items-center justify-between">
                                                <ChevronLeft className="w-6 h-6 text-white/50 group-hover:-translate-x-1 transition-transform" />
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Өмнөх бүлэг</p>
                                                    <h3 className="text-lg font-bold text-white/80 leading-tight">{prevChapter.title}</h3>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                    <button onClick={() => nextChapter ? router.push(`/webtoon/${id}/read/${nextChapter.id}`) : router.push(`/webtoon/${id}`)} className={cn("w-full relative overflow-hidden group rounded-3xl bg-surface border border-white/10 p-6 text-left transition-all hover:bg-white/5 active:scale-95 cursor-pointer", !prevChapter ? "md:col-span-2" : "")}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{nextChapter ? "Дараагийн бүлэг" : "Энэ бүлэг дууслаа"}</p>
                                                <h3 className="text-xl font-black text-white leading-tight">{nextChapter ? nextChapter.title : "Буцах"}</h3>
                                            </div>
                                            <ChevronRight className="w-8 h-8 text-white group-hover:translate-x-2 transition-transform" />
                                        </div>
                                    </button>
                                </div>
                            </section>
                            <div id="comments-section" className="w-full px-4 mb-20 border-t border-white/5 pt-10">
                                <ReaderComments chapterId={chapterId as string} user={user} />
                            </div>
                        </div>
                    </main>
                </div>
            </ContentProtection>

            <div className="relative z-[100]">
                <AnimatePresence>
                    {showHeart && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                            <motion.div initial={{ scale: 0, opacity: 0, rotate: -45 }} animate={{ scale: 1.5, opacity: 1, rotate: 0 }} exit={{ scale: 3, opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                                <Heart className="w-32 h-32 text-primary fill-primary drop-shadow-[0_0_50px_rgba(229,9,20,0.8)]" />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <ReaderMenu webtoonId={id as string} currentChapterId={chapterId as string} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
                <ReaderSettings
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    theme={readerTheme}
                    setTheme={setReaderTheme}
                    brightness={brightness}
                    setBrightness={setBrightness}
                    readMode={readMode}
                    setReadMode={setReadMode}
                />
                <ReaderControls
                    progress={scrollProgress}
                    onPrev={() => prevChapter && router.push(`/webtoon/${id}/read/${prevChapter.id}`)}
                    onNext={() => nextChapter && router.push(`/webtoon/${id}/read/${nextChapter.id}`)}
                    hasPrev={!!prevChapter}
                    hasNext={!!nextChapter}
                    isVisible={showControls || scrollProgress < 5 || scrollProgress > 95}
                />

                {/* Hidden Predictive Pre-loader */}
                <div className="hidden pointer-events-none opacity-0" aria-hidden="true">
                    {nextChapterImages.map((src, i) => (
                        <img
                            key={i}
                            src={getCDNUrl(src, { width: 800, quality: 80, format: 'webp' })}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

