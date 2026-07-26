"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Loader2, Play, Upload, Save, X, Trash2, ArrowUpDown, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { SortableImageGrid } from "@/components/admin/SortableImageGridComponent";
import { motion, AnimatePresence } from "framer-motion";
import WebtoonSearchSelector from "@/components/admin/WebtoonSearchSelector";
import { convertLocalToUTC, convertUTCToLocalInput, formatInTimeZone } from "@/lib/timezone-utils";

const TIMEZONES = [
    { value: 'Asia/Ulaanbaatar', label: 'Улаанбаатар (UTC+8)' },
    { value: 'Asia/Seoul', label: 'Сөүл (UTC+9)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'America/New_York', label: 'Нью-Йорк (EST/EDT)' },
    { value: 'Europe/London', label: 'Лондон (GMT/BST)' },
];

const getLocalDateTimeValue = (offsetMinutes = 60, timeZone = 'Asia/Ulaanbaatar') => {
    const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
    return convertUTCToLocalInput(date, timeZone);
};

export default function CreateChapterPage() {
    const router = useRouter();
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedWebtoon, setSelectedWebtoon] = useState("");
    const [chapterNumber, setChapterNumber] = useState<number | "">("");
    const [chapterTitle, setChapterTitle] = useState("");
    const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
    const [selectedTimeZone, setSelectedTimeZone] = useState("Asia/Ulaanbaatar");
    const [publishedAt, setPublishedAt] = useState(() => convertUTCToLocalInput(new Date(Date.now() + 60 * 60 * 1000), "Asia/Ulaanbaatar"));
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [allMods, setAllMods] = useState<any[]>([]);
    const [selectedModId, setSelectedModId] = useState<string>("");

    interface UploadedImage {
        id: string;
        file: File;
        preview: string;
    }
    const [images, setImages] = useState<UploadedImage[]>([]);

    useEffect(() => {
        async function fetchWebtoonsAndUser() {
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) setUserId(userData.user.id);

                const { data, error } = await supabase.from('webtoons').select('id, title, image, is_nsfw').order('title');
                if (error) throw error;
                setWebtoons(data || []);

                // Fetch moderators
                const { data: mods } = await supabase
                    .from('profiles')
                    .select('id, username, email')
                    .or('is_moderator.eq.true,is_translator.eq.true,is_admin.eq.true');
                
                setAllMods(mods || []);
                if (userData.user && !selectedModId) {
                    setSelectedModId(userData.user.id);
                }
            } catch (err: any) {
                toast.error("Вэбтүүнүүд ачаалахад алдаа гарлаа");
            } finally {
                setLoading(false);
            }
        }
        fetchWebtoonsAndUser();
    }, []);

    const searchParams = useSearchParams();

    // Fetch next chapter number when webtoon is selected
    useEffect(() => {
        if (selectedWebtoon) {
            // Skip auto-fill if this is the initial load from URL parameters
            if (isInitialLoad && searchParams?.get('next')) {
                setIsInitialLoad(false);
                return;
            }

            async function getNextChapter() {
                // Fetch max number and total count to be extremely accurate
                const [maxRes, countRes] = await Promise.all([
                    supabase
                        .from('chapters')
                        .select('chapter_number')
                        .eq('webtoon_id', selectedWebtoon)
                        .order('chapter_number', { ascending: false })
                        .limit(1),
                    supabase
                        .from('chapters')
                        .select('id', { count: 'exact', head: true })
                        .eq('webtoon_id', selectedWebtoon)
                ]);

                const lastNumber = maxRes.data?.[0]?.chapter_number || 0;
                const totalCount = countRes.count || 0;

                // World-class logic: Take the maximum of existing numbering or total count as the baseline
                const nextNum = Math.max(Number(lastNumber), totalCount) + 1;
                setChapterNumber(nextNum);
                setIsInitialLoad(false);
            }
            getNextChapter();
        }
    }, [selectedWebtoon]);

    useEffect(() => {
        if (!loading && searchParams) {
            const webtoonIdParam = searchParams.get('webtoonId');
            const nextParam = searchParams.get('next');

            if (webtoonIdParam) setSelectedWebtoon(webtoonIdParam);
            if (nextParam) {
                setChapterNumber(parseInt(nextParam));
            }
        }
    }, [loading, searchParams]);

    // Helper to slice tall images on the client side (Standard Webtoon 1280px height per slice)
    const sliceTallImage = async (file: File, maxHeight: number = 1280): Promise<UploadedImage[]> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                const { width, height } = img;
                if (height <= maxHeight + 50) { // Small buffer to avoid slicing near-border images
                    resolve([{
                        id: Math.random().toString(36).substring(7),
                        file: file,
                        preview: URL.createObjectURL(file)
                    }]);
                    return;
                }

                const slices: UploadedImage[] = [];
                const numSlices = Math.ceil(height / maxHeight);

                for (let i = 0; i < numSlices; i++) {
                    const currentSliceHeight = Math.min(maxHeight, height - i * maxHeight);
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = currentSliceHeight;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    ctx.drawImage(img, 
                        0, i * maxHeight, width, currentSliceHeight,
                        0, 0, width, currentSliceHeight
                    );

                    const blob = await new Promise<Blob>((res) => {
                        canvas.toBlob((b) => res(b!), 'image/webp', 0.90); // Slightly higher quality for original storage
                    });

                    const sliceFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}_part_${i + 1}.webp`, {
                        type: 'image/webp'
                    });

                    slices.push({
                        id: Math.random().toString(36).substring(7),
                        file: sliceFile,
                        preview: URL.createObjectURL(sliceFile)
                    });
                }

                URL.revokeObjectURL(img.src);
                resolve(slices);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const allProcessedImages: UploadedImage[] = [];

            toast.loading("Зургуудыг бэлтгэж байна...", { id: 'processing-images' });

            for (const file of newFiles) {
                try {
                    const slices = await sliceTallImage(file);
                    allProcessedImages.push(...slices);
                } catch (err) {
                    console.error("Slicing failed", err);
                    allProcessedImages.push({
                        id: Math.random().toString(36).substring(7),
                        file,
                        preview: URL.createObjectURL(file)
                    });
                }
            }

            setImages(prev => [...prev, ...allProcessedImages]);
            toast.success("Бүх зургийг бэлтгэж дууслаа", { id: 'processing-images' });
        }
    };

    useEffect(() => {
        return () => {
            images.forEach(img => URL.revokeObjectURL(img.preview));
        };
    }, [images]);

    const handleRemove = (id: string) => {
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove) URL.revokeObjectURL(imageToRemove.preview);
            return prev.filter(img => img.id !== id);
        });
    };

    const handleReorder = (newImages: UploadedImage[]) => {
        setImages(newImages);
    };

    const reverseImages = () => {
        setImages(prev => [...prev].reverse());
        toast.info("Дарааллыг эргүүллээ");
    };

    const clearAllImages = () => {
        if (confirm("Бүх зургийг устгах уу?")) {
            images.forEach(img => URL.revokeObjectURL(img.preview));
            setImages([]);
            toast.info("Бүх зураг устлаа");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWebtoon || chapterNumber === "" || images.length === 0) {
            toast.error("Дутуу мэдээлэл! (Вэбтүүн, дугаар болон зургуудаа шалгана уу)");
            return;
        }

        const scheduledDate = publishMode === "schedule" ? convertLocalToUTC(publishedAt, selectedTimeZone) : null;
        if (publishMode === "schedule") {
            if (!scheduledDate || !Number.isFinite(scheduledDate.getTime())) {
                toast.error("Нийтлэх цагаа зөв сонгоно уу");
                return;
            }
            if (scheduledDate.getTime() <= Date.now()) {
                toast.error("Ирээдүйн цаг сонгоно уу");
                return;
            }
        }

        setSubmitting(true);
        try {
            const imageUrls: string[] = [];

            // Parallel compression and sequential upload (to avoid DB/Storage rate limits if many)
            const { uploadToR2 } = await import("@/lib/r2");

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const file = img.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `ch-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `chapters/${selectedWebtoon}/${fileName}`;

                const compressed = await compressImage(file);
                const arrayBuffer = await compressed.arrayBuffer();

                toast.loading(`Зураг ${i + 1}/${images.length} байршуулж байна...`, { id: 'upload-progress' });

                const result = await uploadToR2(arrayBuffer, filePath, compressed.type);
                if (!result.success) throw new Error(result.error || `Зураг ${i + 1} байршуулахад алдаа гарлаа`);

                imageUrls.push(result.url!);
            }
            toast.success("Бүх зураг амжилттай байршлаа", { id: 'upload-progress' });

            // Final Title Construction
            const finalTitle = chapterTitle ? `Бүлэг ${chapterNumber} - ${chapterTitle}` : `Бүлэг ${chapterNumber}`;

            const { publishChapterAction } = await import("@/app/actions/webtoon-actions");
            const resultAction = await publishChapterAction({
                webtoon_id: Number(selectedWebtoon),
                chapter_number: Number(chapterNumber),
                title: finalTitle,
                images: imageUrls,
                edit_state: null,
                is_published: publishMode === "now",
                translator_id: selectedModId || userId,
                scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
                publish_mode: publishMode
            });

            if (!resultAction.success) throw new Error(resultAction.error || "Нийтлэхэд алдаа гарлаа");

            toast.success(publishMode === "schedule" ? "Бүлэг амжилттай товлогдлоо!" : "Бүлэг амжилттай нийтлэгдлээ!");
            router.push(`/admin/webtoons/${selectedWebtoon}`);

        } catch (error: any) {
            console.error(error);
            toast.error("Алдаа гарлаа: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted font-medium animate-pulse">Ачаалж байна...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-10"
            >
                <div>
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-muted hover:text-white transition-colors mb-2 text-sm font-bold uppercase tracking-wider"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Буцах
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
                        Шинэ Бүлэг <span className="text-primary text-glow">Үүсгэх</span>
                    </h1>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted leading-none mb-1">Нийт зураг</p>
                        <p className="text-2xl font-black text-white leading-none">{images.length}</p>
                    </div>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Forms (Sticky on scroll) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 lg:sticky lg:top-24 space-y-6"
                >
                    <div className="glass-card rounded-[2rem] p-8 space-y-8 border-white/5 shadow-2xl">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <WebtoonSearchSelector 
                                    webtoons={webtoons}
                                    selectedId={selectedWebtoon ? Number(selectedWebtoon) : null}
                                    onSelect={(id) => setSelectedWebtoon(id.toString())}
                                />
                            </div>

                            {allMods.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Модератор (Тайлан орох хүн)</label>
                                    <div className="relative group">
                                        <select
                                            value={selectedModId}
                                            onChange={(e) => setSelectedModId(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-white appearance-none cursor-pointer group-hover:bg-black/60"
                                        >
                                            {allMods.map(m => (
                                                <option key={m.id} value={m.id} className="bg-surface">
                                                    {m.username || m.email} {m.id === userId ? "(Би)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1 space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Дугаар</label>
                                    <input
                                        type="number"
                                        value={chapterNumber}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setChapterNumber(val ? parseInt(val) : "");
                                            if (val && (!chapterTitle || chapterTitle.startsWith("Chapter "))) {
                                                setChapterTitle(`Chapter ${val}`);
                                            }
                                        }}
                                        placeholder="1"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-white placeholder:text-muted/50 group-hover:bg-black/60 font-bold"
                                    />
                                </div>
                                <div className="col-span-2 space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Нэмэлт нэр (Сонголтоор)</label>
                                    <input
                                        value={chapterTitle}
                                        onChange={(e) => setChapterTitle(e.target.value)}
                                        placeholder="Эхлэл..."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-white placeholder:text-muted/50 group-hover:bg-black/60"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Нийтлэх горим</label>
                                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/40 border border-white/10 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setPublishMode("now")}
                                        className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${publishMode === "now" ? "bg-primary text-white" : "text-muted hover:bg-white/5 hover:text-white"}`}
                                    >
                                        <Play className="w-4 h-4" />
                                        Одоо
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPublishMode("schedule")}
                                        className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${publishMode === "schedule" ? "bg-primary text-white" : "text-muted hover:bg-white/5 hover:text-white"}`}
                                    >
                                        <Clock className="w-4 h-4" />
                                        Товлох
                                    </button>
                                </div>
                            </div>

                            {publishMode === "schedule" && (
                                <div className="space-y-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">Цагийн бүс</label>
                                        <select
                                            value={selectedTimeZone}
                                            onChange={(e) => {
                                                const newTz = e.target.value;
                                                const prevUtc = convertLocalToUTC(publishedAt, selectedTimeZone);
                                                setSelectedTimeZone(newTz);
                                                setPublishedAt(convertUTCToLocalInput(prevUtc, newTz));
                                            }}
                                            className="bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-[10px] font-bold text-blue-300 outline-none cursor-pointer focus:border-primary"
                                        >
                                            {TIMEZONES.map(tz => (
                                                <option key={tz.value} value={tz.value} className="bg-[#0f0f0f] text-white">
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">Орох цаг</label>
                                        <input
                                            type="datetime-local"
                                            value={publishedAt}
                                            onChange={(e) => setPublishedAt(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-white [color-scheme:dark] group-hover:bg-black/60 font-bold"
                                        />
                                    </div>
                                    
                                    <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Дэлхийн цагаар орох цагууд:</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                                            {TIMEZONES.map(tz => {
                                                const utcDate = convertLocalToUTC(publishedAt, selectedTimeZone);
                                                const formattedTime = formatInTimeZone(utcDate, tz.value, {
                                                    month: 'short',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                });
                                                return (
                                                    <div key={tz.value} className="flex justify-between text-white/70">
                                                        <span className="font-bold text-muted/80">{tz.label.split(' ')[0]}:</span>
                                                        <span className="font-black text-blue-300">{formattedTime}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_40px_-10px_rgba(229,9,20,0.5)] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {submitting ? "Хадгалж байна..." : (publishMode === "schedule" ? "Бүлэг Товлох" : "Бүлэг Нийтлэх")}
                        </button>

                        <p className="text-[10px] text-muted/60 text-center uppercase tracking-widest font-bold">
                            Хугацааг ирээдүйд тохируулбал товлосон цагт нийтлэгдэнэ.
                        </p>
                    </div>
                </motion.div>

                {/* Right Side: Image Grid */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-8 space-y-6"
                >
                    <div className="bg-surface/30 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-6 md:p-10 min-h-[600px] flex flex-col">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                                    Зургийн дараалал
                                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold ml-2">
                                        {images.length} хуудас
                                    </span>
                                </h3>
                                <p className="text-xs text-muted mt-1">Зургуудыг чирж байгаад дарааллыг нь өөрчлөх боломжтой.</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {images.length > 0 && (
                                    <>
                                        <button
                                            onClick={reverseImages}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all border border-white/5 flex items-center gap-2 text-xs font-bold"
                                            title="Дарааллыг эргүүлэх"
                                        >
                                            <ArrowUpDown className="w-4 h-4" />
                                            <span className="hidden sm:inline">Эргүүлэх</span>
                                        </button>
                                        <button
                                            onClick={clearAllImages}
                                            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/10 flex items-center gap-2 text-xs font-bold"
                                            title="Бүгдийг устгах"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden sm:inline">Устгах</span>
                                        </button>
                                    </>
                                )}
                                <label className="cursor-pointer group">
                                    <div className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                        <Upload className="w-4 h-4" />
                                        Нэмэх
                                    </div>
                                    <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <div className="flex-1">
                            {images.length === 0 ? (
                                <label className="h-full min-h-[400px] border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group group">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                                        <Upload className="w-8 h-8 text-muted group-hover:text-primary transition-colors" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Зураг оруулаагүй байна</h4>
                                    <p className="text-sm text-muted text-center max-w-[280px]">
                                        Энд дарж эсвэл зургуудаа чирж оруулж бүлгийн хуудсуудыг нэмнэ үү.
                                    </p>
                                    <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
                                </label>
                            ) : (
                                <SortableImageGrid
                                    images={images}
                                    onReorder={handleReorder}
                                    onRemove={handleRemove}
                                />
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
