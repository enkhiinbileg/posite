'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
    Upload, Download, Loader2, CheckCircle2, XCircle, Languages,
    Sparkles, Zap, Brain, Cpu, ArrowLeftRight, Save, LayoutGrid,
    Trash2, Plus, ArrowUpCircle, ListOrdered, Clock, History,
    Maximize2, ChevronLeft, ChevronRight, Edit3, Type, Eye, Layers, X
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { convertLocalToUTC, convertUTCToLocalInput, formatInTimeZone } from '@/lib/timezone-utils';

const TIMEZONES = [
    { value: 'Asia/Ulaanbaatar', label: 'Улаанбаатар (UTC+8)' },
    { value: 'Asia/Seoul', label: 'Сөүл (UTC+9)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'America/New_York', label: 'Нью-Йорк (EST/EDT)' },
    { value: 'Europe/London', label: 'Лондон (GMT/BST)' },
];

// import { toast } from 'sonner';
const toast: any = Object.assign(() => { }, {
    info: () => { },
    success: () => { },
    error: () => { },
    loading: () => { },
    dismiss: () => { },
    promise: () => { },
    custom: () => { },
    message: () => { },
});
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';

interface Webtoon {
    id: number;
    title: string;
}

interface ImageItem {
    id: string;
    file: File;
    preview: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    translatedUrl?: string;
    progress: number;
    error?: string;
    notes?: string;
}

export default function PremiumTranslatorPage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);

    // Платформ Төлөвүүд
    const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
    const [selectedWebtoonId, setSelectedWebtoonId] = useState<number | null>(null);
    const [chapterInfo, setChapterInfo] = useState({ title: '', number: 1 });
    const [isPublishing, setIsPublishing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
    const [selectedTimeZone, setSelectedTimeZone] = useState('Asia/Ulaanbaatar');
    const [scheduledAt, setScheduledAt] = useState(() => convertUTCToLocalInput(new Date(Date.now() + 60 * 60 * 1000), 'Asia/Ulaanbaatar'));

    // Тохиргоо
    const [targetLanguage, setTargetLanguage] = useState('mn');
    const [backendUrl, setBackendUrl] = useState('https://artmongolian1--webtoon-translator-process.modal.run');
    const [dragActive, setDragActive] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Өгөгдөл татах
    useEffect(() => {
        async function fetchInitial() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            const { data } = await supabase.from('webtoons').select('id, title').order('title');
            if (data) setWebtoons(data);

            const savedUrl = localStorage.getItem('backendUrl');
            const defaultUrl = 'https://artmongolian1--webtoon-translator-v2-translator-process.modal.run';

            // Зөвхөн яг зөв линк байхгүй бол хүчээр солино
            if (savedUrl !== defaultUrl) {
                setBackendUrl(defaultUrl);
                localStorage.setItem('backendUrl', defaultUrl);
            } else {
                setBackendUrl(savedUrl);
            }
        }
        fetchInitial();
    }, []);

    // 2. Дараагийн Chapter-ын дугаарыг санал болгох
    useEffect(() => {
        if (selectedWebtoonId) {
            async function fetchLastChapter() {
                const { data } = await supabase
                    .from('chapters')
                    .select('chapter_number')
                    .eq('webtoon_id', selectedWebtoonId)
                    .order('chapter_number', { ascending: false })
                    .limit(1);

                const nextNum = data && data.length > 0 ? data[0].chapter_number + 1 : 1;
                setChapterInfo({ title: `Chapter ${nextNum}`, number: nextNum });
            }
            fetchLastChapter();
        }
    }, [selectedWebtoonId]);

    // 3. Файл удирдах
    const handleFiles = useCallback((files: FileList | File[]) => {
        const newImages: ImageItem[] = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                preview: URL.createObjectURL(f),
                status: 'idle',
                progress: 0
            }));
        setImages(prev => [...prev, ...newImages]);
    }, []);

    const removeImage = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setImages(prev => prev.filter(img => img.id !== id));
    };

    // 4. AI Багц Орчуулга (Зэрэг боловсруулах)
    const translateBatch = async (items: ImageItem[]) => {
        const currentBackendUrl = backendUrl || localStorage.getItem('backendUrl');

        return Promise.all(items.map(async (item) => {
            setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: 'processing', progress: 10 } : img));

            try {
                const formData = new FormData();
                formData.append('image', item.file);
                formData.append('target_lang', targetLanguage);

                const response = await fetch('/api/translate-image', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Backend-Url': currentBackendUrl! },
                });

                if (!response.ok) throw new Error('API Error');

                const blob = await response.blob();
                const translatedUrl = URL.createObjectURL(blob);

                setImages(prev => prev.map(img => img.id === item.id ? {
                    ...img,
                    status: 'success',
                    translatedUrl,
                    progress: 100
                } : img));
            } catch (err: any) {
                setImages(prev => prev.map(img => img.id === item.id ? {
                    ...img,
                    status: 'error',
                    error: err.message,
                    progress: 0
                } : img));
            }
        }));
    };

    const startProcessing = async () => {
        if (!backendUrl && !localStorage.getItem('backendUrl')) {
            toast.error('Backend API Линк оруулна уу');
            return;
        }

        setIsProcessing(true);
        const idleImages = [...images].filter(img => img.status === 'idle' || img.status === 'error');

        const batchSize = 5;
        for (let i = 0; i < idleImages.length; i += batchSize) {
            const batch = idleImages.slice(i, i + batchSize);
            await translateBatch(batch);
        }

        setIsProcessing(false);
        toast.success('Багц боловсруулалт дууслаа');
    };

    // --- NEW: URL Import Logic ---
    const handleUrlImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        const tId = toast.loading("Сайтаас зургуудыг хайж байна...");

        try {
            const res = await fetch('/api/scrape-chapter', {
                method: 'POST',
                body: JSON.stringify({ url: importUrl })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            if (!data.images || data.images.length === 0) throw new Error("Зураг олдсонгүй");

            toast.loading(`${data.images.length} зураг олдлоо. Татаж байна...`, { id: tId });

            const newItems: ImageItem[] = [];

            // Download images through proxy to avoid CORS
            for (const url of data.images) {
                try {
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                    const imgRes = await fetch(proxyUrl);
                    if (!imgRes.ok) continue;

                    const blob = await imgRes.blob();
                    const fileName = url.split('/').pop()?.split('?')[0] || `import-${Math.random().toString(36).substr(2, 5)}.jpg`;
                    const file = new File([blob], fileName, { type: blob.type });

                    newItems.push({
                        id: Math.random().toString(36).substr(2, 9),
                        file: file,
                        preview: URL.createObjectURL(file),
                        status: 'idle',
                        progress: 0
                    });
                } catch (e) {
                    console.warn("Failed to download image:", url);
                }
            }

            setImages(prev => [...prev, ...newItems]);
            setImportUrl('');
            toast.success(`${newItems.length} зураг амжилттай импортлогдлоо!`, { id: tId });
        } catch (err: any) {
            toast.error("Импорт амжилтгүй: " + err.message, { id: tId });
        } finally {
            setIsImporting(false);
        }
    };

    // 5. Нийтлэх функц
    const handlePublish = async () => {
        if (!selectedWebtoonId) {
            alert('Вебтүүн сонгоно уу');
            return;
        }
        if (images.length === 0) {
            alert('Нийтлэх зураг олдсонгүй');
            return;
        }

        const scheduledDate = publishMode === 'schedule' ? convertLocalToUTC(scheduledAt, selectedTimeZone) : null;
        if (publishMode === 'schedule') {
            if (!scheduledAt || !scheduledDate || !Number.isFinite(scheduledDate.getTime())) {
                alert('Нийтлэх цагаа зөв сонгоно уу');
                return;
            }
            if (scheduledDate.getTime() <= Date.now()) {
                alert('Ирээдүйн цаг сонгоно уу');
                return;
            }
        }

        setIsPublishing(true);
        try {
            const imageUrls = [];
            const successfulImages = images.filter(img => img.status === 'success');
            const imagesToPublish = successfulImages.length > 0 ? successfulImages : images;

            alert(`${imagesToPublish.length} зургийг R2-руу хадгалж байна...`);

            for (let i = 0; i < imagesToPublish.length; i++) {
                const img = imagesToPublish[i];
                const response = await fetch(img.translatedUrl || img.preview);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();

                const path = `webtoons/${selectedWebtoonId}/chapters/${chapterInfo.number}/${Date.now()}-${i}.webp`;
                const upload = await uploadToR2(buffer, path, 'image/webp');

                if (upload.success && upload.url) {
                    imageUrls.push(upload.url);
                }
            }

            const resultAction = await (await import("@/app/actions/webtoon-actions")).publishChapterAction({
                webtoon_id: selectedWebtoonId,
                chapter_number: chapterInfo.number,
                title: chapterInfo.title,
                images: imageUrls,
                edit_state: {},
                is_published: publishMode === 'now',
                translator_id: userId,
                scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
                publish_mode: publishMode
            });

            if (!resultAction.success) throw new Error(resultAction.error || "Нийтлэх явцад алдаа гарлаа");

            alert(publishMode === 'schedule' ? 'Бүлэг амжилттай товлогдлоо!' : 'Chapter амжилттай нийтлэгдлээ!');
            setImages([]);
        } catch (err: any) {
            alert('Алдаа: ' + err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const stats = useMemo(() => ({
        total: images.length,
        done: images.filter(i => i.status === 'success').length,
        processing: images.filter(i => i.status === 'processing').length,
        error: images.filter(i => i.status === 'error').length,
    }), [images]);

    // Modal Helpers
    const editingImage = images.find(img => img.id === editingImageId);
    const editingIndex = images.findIndex(img => img.id === editingImageId);

    const nextImage = () => {
        if (editingIndex < images.length - 1) setEditingImageId(images[editingIndex + 1].id);
    };
    const prevImage = () => {
        if (editingIndex > 0) setEditingImageId(images[editingIndex - 1].id);
    };

    const updateImageNotes = (id: string, notes: string) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, notes } : img));
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans overflow-x-hidden">
            {/* Толгой хэсэг */}
            <div className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform active:scale-95">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight text-gradient-premium">Студи v2</h1>
                            <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-widest">
                                <Clock className="w-3 h-3 text-primary" /> Индустриал Систем
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm font-bold text-muted">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {stats.done}/{stats.total} Бэлэн
                            </div>
                            {stats.error > 0 && (
                                <div className="flex items-center gap-2 text-primary font-black">
                                    <XCircle className="w-4 h-4" /> {stats.error} Алдаа
                                </div>
                            )}
                        </div>
                        <button onClick={handlePublish} disabled={isPublishing || stats.done === 0} className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95">
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
                            <span className="text-white">Chapter Нийтлэх</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Үндсэн ажлын талбар */}
                <div className="lg:col-span-8 space-y-8">
                    {/* URL Import Section */}
                    <div className="bg-surface border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="Гадаад сайтын линкийг энд тавина уу (жишээ нь: mangatx.com/chapter-1)"
                                    className="w-full bg-background border border-white/10 p-4 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all placeholder:text-muted/20 pr-12"
                                />
                                <LayoutGrid className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                            </div>
                            <button
                                onClick={handleUrlImport}
                                disabled={isImporting || !importUrl}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Зургуудыг Татах
                            </button>
                        </div>
                    </div>

                    {/* Файл оруулах хэсэг */}
                    {images.length === 0 ? (
                        <div
                            className={`h-[500px] rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-12 cursor-pointer group ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-white/10'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-border transition-all">
                                <Upload className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-3xl font-black mb-4 text-gradient-premium">Chapter Оруулах</h2>
                            <p className="text-muted max-w-sm font-medium uppercase tracking-widest text-[10px]">Зургуудаа чирж оруулах эсвэл энд дарж сонгоно уу.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Зураг нэмэх товч */}
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-3xl border-2 border-dashed border-border hover:border-white/10 transition-all flex flex-col items-center justify-center gap-3 bg-surface group active:scale-95">
                                <Plus className="w-10 h-10 text-muted group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Зураг Нэмэх</span>
                            </button>

                            <Reorder.Group axis="y" values={images} onReorder={setImages} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 contents">
                                {images.map((img, index) => (
                                    <Reorder.Item
                                        key={img.id}
                                        value={img}
                                        onClick={() => setEditingImageId(img.id)}
                                        className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-surface border border-border shadow-2xl transition-all active:scale-95 cursor-grab active:cursor-grabbing hover:border-primary/50"
                                    >
                                        <Image src={(img.status === 'success' && img.translatedUrl) ? img.translatedUrl : img.preview} alt="Preview" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        {/* Статус мэдээлэл */}
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] pointer-events-none">
                                            {img.status === 'processing' && (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-primary">...</span>
                                                </div>
                                            )}
                                            {img.status === 'success' && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/20">
                                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500"></span>
                                                </div>
                                            )}
                                            {img.status === 'error' && (
                                                <div className="flex flex-col items-center gap-2 text-primary font-black">
                                                    <XCircle className="w-10 h-10" />
                                                    <span className="text-[10px] uppercase tracking-widest">!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Үйлдэл (Устгах) */}
                                        <div className="absolute top-3 right-3 flex gap-2 z-20">
                                            <button
                                                onClick={(e) => removeImage(img.id, e)}
                                                className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-primary transition-colors group/trash"
                                            >
                                                <Trash2 className="w-4 h-4 transition-transform group-hover/trash:scale-110" />
                                            </button>
                                        </div>

                                        {/* Дугаар Indicator */}
                                        <div className="absolute top-3 left-3 w-8 h-8 bg-background/80 backdrop-blur-md border border-border rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg">
                                            {index + 1}
                                        </div>

                                        {/* Тэмдэглэлтэй эсэх */}
                                        {img.notes && (
                                            <div className="absolute bottom-3 left-3 w-8 h-8 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-lg flex items-center justify-center shadow-lg">
                                                <Edit3 className="w-4 h-4 text-primary" />
                                            </div>
                                        )}

                                        {/* Тухайн зургийн явц */}
                                        {img.status === 'processing' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${img.progress}%` }} />
                                            </div>
                                        )}
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>
                    )}
                </div>

                {/* Удирдлагын хэсэг */}
                <div className="lg:col-span-4 h-fit sticky top-[104px] space-y-6">
                    {/* AI Тохиргоо */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-8 flex items-center gap-2 relative z-10 font-sans">
                            <Brain className="w-4 h-4" /> AI Тохиргоо
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Орчуулах хэл</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['ko', 'mn', 'en', 'cn'].map(lang => (
                                        <button key={lang} onClick={() => setTargetLanguage(lang)} className={`py-3 rounded-xl border-2 transition-all text-xs font-black uppercase font-sans ${targetLanguage === lang ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-transparent text-muted hover:border-border'}`}>
                                            {lang === 'ko' ? '🇰🇷 KOR' : lang === 'mn' ? '🇲🇳 MON' : lang === 'en' ? '🇬🇧 ENG' : '🇨🇳 CHS'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Backend API Холбоос</label>
                                <div className="relative">
                                    <input type="text" value={backendUrl} onChange={(e) => { setBackendUrl(e.target.value); localStorage.setItem('backendUrl', e.target.value); }} placeholder="Modal эсвэл Colab холбоос" className="w-full bg-background border border-border p-4 rounded-xl text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-muted/30 font-sans" />
                                    <Cpu className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                                </div>
                            </div>

                            <button onClick={startProcessing} disabled={isProcessing || images.length === 0} className="w-full py-4 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-tight flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95 text-white font-sans text-sm">
                                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <><Sparkles className="w-10 h-10 md:w-6 md:h-6 shrink-0" /> <span className="text-center">AI Багц Орчуулга Эхлэх</span></>}
                            </button>
                        </div>
                    </div>

                    {/* Нийтлэх Төв */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-8 flex items-center gap-2 relative z-10 font-sans">
                            <Save className="w-4 h-4" /> Нийтлэх Төв
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Вэбтүүн Сонгох</label>
                                <select value={selectedWebtoonId || ''} onChange={(e) => setSelectedWebtoonId(Number(e.target.value))} className="w-full bg-background border border-border p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-all font-sans">
                                    <option value="" className="bg-surface">Вэбтүүн сонгох...</option>
                                    {webtoons.map(w => <option key={w.id} value={w.id} className="bg-surface">{w.title}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Chapter Дугаар</label>
                                    <input type="number" value={chapterInfo.number} onChange={(e) => setChapterInfo(prev => ({ ...prev, number: Number(e.target.value) }))} className="w-full bg-background border border-border p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-all font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Гарчиг Харах</label>
                                    <div className="w-full bg-background border border-border p-4 rounded-xl text-xs font-bold text-muted flex items-center gap-2">
                                        <ListOrdered className="w-3 h-3 text-emerald-500/50" /> Ch. {chapterInfo.number}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Chapter-ын Гарчиг</label>
                                <input type="text" value={chapterInfo.title} onChange={(e) => setChapterInfo(prev => ({ ...prev, title: e.target.value }))} placeholder="Жишээ: Эрийн эхлэл" className="w-full bg-background border border-border p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-all font-sans placeholder:text-muted/30" />
                            </div>

                            {/* Publish Mode Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 font-sans">Нийтлэх горим</label>
                                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background border border-border p-1">
                                    {[
                                        { id: 'now', label: 'Одоо', icon: Play },
                                        { id: 'schedule', label: 'Товлох', icon: Clock },
                                    ].map((modeItem) => {
                                        const Icon = modeItem.icon;
                                        return (
                                            <button
                                                key={modeItem.id}
                                                type="button"
                                                onClick={() => setPublishMode(modeItem.id as 'now' | 'schedule')}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all font-sans",
                                                    publishMode === modeItem.id
                                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                        : "text-muted hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {modeItem.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {publishMode === 'schedule' && (
                                <div className="space-y-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-200 font-sans">Цагийн бүс</label>
                                        <select
                                            value={selectedTimeZone}
                                            onChange={(e) => {
                                                const newTz = e.target.value;
                                                const prevUtc = convertLocalToUTC(scheduledAt, selectedTimeZone);
                                                setSelectedTimeZone(newTz);
                                                setScheduledAt(convertUTCToLocalInput(prevUtc, newTz));
                                            }}
                                            className="bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-[10px] font-bold text-blue-300 outline-none cursor-pointer focus:border-primary font-sans"
                                        >
                                            {TIMEZONES.map(tz => (
                                                <option key={tz.value} value={tz.value} className="bg-[#0f0f0f] text-white">
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-200 font-sans">Орох цаг</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none [color-scheme:dark] focus:border-primary font-sans"
                                        />
                                    </div>

                                    <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-sans">Дэлхийн цагаар орох цагууд:</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                                            {TIMEZONES.map(tz => {
                                                const utcDate = convertLocalToUTC(scheduledAt, selectedTimeZone);
                                                const formattedTime = formatInTimeZone(utcDate, tz.value, {
                                                    month: 'short',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                });
                                                return (
                                                    <div key={tz.value} className="flex justify-between text-white/70 font-sans">
                                                        <span className="font-bold text-muted/80">{tz.label.split(' ')[0]}:</span>
                                                        <span className="font-black text-blue-300">{formattedTime}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 mb-1 leading-tight font-sans">
                                    <CheckCircle2 className="w-3 h-3" /> Бэлэн байдлын шалгалт
                                </div>
                                <p className="text-[10px] text-muted leading-tight font-medium font-sans">
                                    {stats.done} зураг бэлэн. Хадгалах сан: Cloudflare R2 ✅
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Text Editor Modal */}
            <AnimatePresence>
                {editingImageId && editingImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
                    >
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setEditingImageId(null)} />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[1400px] h-full max-h-[900px] bg-surface border border-border rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                        <Edit3 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-tight text-gradient-premium">Гараар Засах</h2>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                                            {editingIndex + 1}-р Хуудас <span className="w-1 h-1 rounded-full bg-border" /> {editingImage.file.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsCompareMode(!isCompareMode)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompareMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-background hover:bg-white/5 border border-border'}`}
                                    >
                                        <ArrowLeftRight className="w-3 h-3" /> {isCompareMode ? 'Ганцаарчилсан' : 'Харьцуулах'}
                                    </button>
                                    <button onClick={() => setEditingImageId(null)} className="w-10 h-10 bg-background hover:bg-white/5 border border-border rounded-xl flex items-center justify-center transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                                {/* Image Preview Area */}
                                <div className={`relative bg-[#050505] p-6 lg:p-12 overflow-y-auto scrollbar-hide select-none transition-all ${isCompareMode ? 'lg:col-span-8' : 'lg:col-span-8'}`}>
                                    <div className={`grid gap-8 h-full ${isCompareMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                                                    <Eye className="w-3 h-3" /> Эх зураг
                                                </span>
                                            </div>
                                            <div className="relative aspect-[3/4] w-full max-w-[500px] mx-auto rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                                                <Image src={editingImage.preview} alt="Original" fill className="object-contain" />
                                            </div>
                                        </div>

                                        {isCompareMode && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                                        <Sparkles className="w-3 h-3 text-primary" /> AI Үр дүн
                                                    </span>
                                                </div>
                                                <div className="relative aspect-[3/4] w-full max-w-[500px] mx-auto rounded-3xl overflow-hidden border border-primary/20 shadow-2xl bg-black">
                                                    {editingImage.translatedUrl ? (
                                                        <Image src={editingImage.translatedUrl} alt="Translated" fill className="object-contain" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/5 text-center p-8">
                                                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 animate-pulse">
                                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                            </div>
                                                            <p className="text-xs font-black uppercase text-primary/50 tracking-widest">...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sidebar / Controls */}
                                <div className="lg:col-span-4 border-l border-border bg-surface/50 p-8 space-y-8 flex flex-col h-full overflow-y-auto">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                                            <Type className="w-3 h-3" /> Гар аргаар засах
                                        </h4>
                                        <textarea
                                            value={editingImage.notes || ''}
                                            onChange={(e) => updateImageNotes(editingImage.id, e.target.value)}
                                            placeholder="Орчуулгад нэмэлт тайлбар эсвэл засах текстийг энд бичнэ үү..."
                                            className="w-full h-40 bg-background border border-border rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all resize-none placeholder:text-muted/20"
                                        />
                                        <p className="text-[9px] text-muted/50 font-medium italic leading-relaxed">
                                            * Энд бичсэн текст нь AI-д нэмэлт заавар болон хадгалагдана. Одоогоор "Burn" функц хөгжүүлэгдэж байна.
                                        </p>
                                    </div>

                                    <div className="space-y-4 pb-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">Хэрэглүүрүүд</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="flex flex-col items-center gap-2 p-4 bg-background border border-border rounded-2xl hover:bg-white/5 transition-all group">
                                                <Layers className="w-5 h-5 text-muted group-hover:text-primary" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Давхарга</span>
                                            </button>
                                            <button className="flex flex-col items-center gap-2 p-4 bg-background border border-border rounded-2xl hover:bg-white/5 transition-all group opacity-30 cursor-not-allowed">
                                                <LayoutGrid className="w-5 h-5 text-muted" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Загвар</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Footer (Controls) */}
                                    <div className="mt-auto space-y-4 border-t border-border pt-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={prevImage}
                                                disabled={editingIndex === 0}
                                                className="py-4 bg-background border border-border rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 disabled:opacity-20 transition-all font-black uppercase text-[10px] tracking-widest"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Буцах
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                disabled={editingIndex === images.length - 1}
                                                className="py-4 bg-background border border-border rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 disabled:opacity-20 transition-all font-black uppercase text-[10px] tracking-widest"
                                            >
                                                Дараах <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setEditingImageId(null)}
                                            className="w-full py-5 bg-primary rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
                                        >
                                            Хадгалаад Гарах
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
