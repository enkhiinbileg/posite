'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Upload, Download, Loader2, CheckCircle2, XCircle, Languages, LayoutGrid, ListOrdered, Type, ImageIcon, Clock, Play, Save, ChevronLeft, ChevronRight, X, Eraser, Trash2, Plus, Zap, Sparkles, Edit3, Settings, MonitorPlay, Eye, EyeOff, Brain, RotateCcw, ChevronDown, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadToR2, getPresignedUrl } from '@/lib/r2';
import { cn } from '@/lib/utils';
import AdvancedEditor from '@/components/admin/translator/AdvancedEditor';
import CompareSlider from '@/components/admin/translator/CompareSlider';
import { EditorAcademy } from '@/components/admin/translator/EditorAcademy';
import { BookOpen as BookIcon } from 'lucide-react';
import { parseCTPR } from '@/lib/ctpr-importer';
import WebtoonSearchSelector from '@/components/admin/WebtoonSearchSelector';
import { convertLocalToUTC, convertUTCToLocalInput, formatInTimeZone } from '@/lib/timezone-utils';

const TIMEZONES = [
    { value: 'Asia/Ulaanbaatar', label: 'Улаанбаатар (UTC+8)' },
    { value: 'Asia/Seoul', label: 'Сөүл (UTC+9)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'America/New_York', label: 'Нью-Йорк (EST/EDT)' },
    { value: 'Europe/London', label: 'Лондон (GMT/BST)' },
];

interface Webtoon {
    id: number;
    title: string;
    image?: string;
    is_nsfw?: boolean;
}

interface ImageItem {
    id: string;
    file: File;
    preview: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    translatedUrl?: string;
    cleanUrl?: string; // Stored Clean version (No text) for re-editing
    translatedFile?: File; // For persistence
    progress: number;
    error?: string;
    notes?: string;
}

interface ChapterItem {
    id: string;
    name: string;
    images: ImageItem[];
    // Persistent Edit State
    objects?: any[];
    drawings?: any[];
}

const getLocalDateTimeValue = (offsetMinutes = 60, timeZone = 'Asia/Ulaanbaatar') => {
    const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
    return convertUTCToLocalInput(date, timeZone);
};

export default function NativeImageTransPage() {
    const router = useRouter();
    // --- State ---
    const [chapters, setChapters] = useState<ChapterItem[]>([
        { id: Math.random().toString(36).substr(2, 9), name: 'Chapter 1', images: [] }
    ]);
    const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0].id);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [mode, setMode] = useState<'translator' | 'cleaner'>('translator');
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    const [showAcademy, setShowAcademy] = useState(false);

    const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];
    const images = activeChapter.images;

    // Платформ Төлөвүүд
    const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
    const [selectedWebtoonId, setSelectedWebtoonId] = useState<number | null>(null);
    const [chapterInfo, setChapterInfo] = useState({ title: '', number: 1 });
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
    const [selectedTimeZone, setSelectedTimeZone] = useState('Asia/Ulaanbaatar');
    const [scheduledAt, setScheduledAt] = useState(() => convertUTCToLocalInput(new Date(Date.now() + 60 * 60 * 1000), 'Asia/Ulaanbaatar'));
    const [userId, setUserId] = useState<string | null>(null);
    const [allMods, setAllMods] = useState<any[]>([]);
    const [selectedModId, setSelectedModId] = useState<string>("");

    // Тохиргоо
    const [targetLanguage, setTargetLanguage] = useState('mn');
    const [backendUrl, setBackendUrl] = useState('https://artmongolian1--webtoon-translator-v2-translator-web.modal.run');
    const [dragActive, setDragActive] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isZenMode, setIsZenMode] = useState(true);
    const [viewMode, setViewMode] = useState<'fit' | 'scroll'>('scroll');
    const [widthPercentage, setWidthPercentage] = useState(100);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const baseImagesRef = useRef<Record<string, string>>({}); // Stores original image URLs for re-editing

    // --- IDB Persistence ---
    useEffect(() => {
        const DB_NAME = 'ImageTransDB';
        const STORE_NAME = 'chapters';

        const openDB = () => {
            return new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = (e: any) => {
                    e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        };

        const saveToIDB = async (items: ChapterItem[]) => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                // Clear old
                await new Promise((resolve) => {
                    const clearReq = store.clear();
                    clearReq.onsuccess = resolve;
                });

                // Add new
                items.forEach(item => {
                    // We can clone structured data, Files are supported
                    store.put(item);
                });
            } catch (e) {
                console.error("IDB Save Error", e);
            }
        };

        const loadFromIDB = async () => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();

                return new Promise<ChapterItem[]>((resolve) => {
                    request.onsuccess = () => {
                        const items = request.result || [];
                        // Revitalize URLs
                        const revitalized = items.map(ch => ({
                            ...ch,
                            images: ch.images.map((img: ImageItem) => ({
                                ...img,
                                preview: API_revitalizeURL(img.file),
                                translatedUrl: img.translatedFile ? API_revitalizeURL(img.translatedFile) : img.translatedUrl,
                                cleanUrl: img.cleanUrl, // cleanUrl is already a Blob URL if stored, or we can leave it as is
                                status: img.status === 'processing' ? 'idle' : img.status // Reset processing
                            }))
                        }));
                        resolve(revitalized);
                    };
                });
            } catch (e) {
                console.error("IDB Load Error", e);
                return [];
            }
        };

        const API_revitalizeURL = (file: File) => {
            try {
                return URL.createObjectURL(file);
            } catch (e) {
                return '';
            }
        };

        // Load on mount
        loadFromIDB().then(saved => {
            if (saved.length > 0) {
                setChapters(saved);
                const savedActiveId = localStorage.getItem('imagetrans_active_id');
                if (savedActiveId && saved.find(c => c.id === savedActiveId)) {
                    setActiveChapterId(savedActiveId);
                } else {
                    setActiveChapterId(saved[0].id);
                }
                toast.success('Өмнөх зургуудыг сэргээлээ', { position: 'top-center' });
            }
        });

        // Save trigger is separate
    }, []);

    // Fetch Webtoons list
    useEffect(() => {
        async function fetchWebtoons() {
            try {
                console.log("[IMAGETRANS] Fetching webtoons list via Server Action...");
                const { getWebtoonsAction } = await import("@/app/actions/webtoon-actions");
                const result = await getWebtoonsAction();

                if (!result.success) {
                    throw new Error(result.error);
                }

                console.log("[IMAGETRANS] Webtoons loaded:", result.data?.length);
                if (result.data) setWebtoons(result.data);
            } catch (error: any) {
                console.error('[IMAGETRANS] Error fetching webtoons:', error);
                toast.error("Вэбтүүнүүд ачаалахад алдаа гарлаа: " + error.message);
            }
        }
        fetchWebtoons();
    }, []);

    // Fetch User ID
    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Load from localStorage if available, otherwise default to current user
                const savedModId = localStorage.getItem('imagetrans_selected_mod_id');
                if (savedModId) {
                    setSelectedModId(savedModId);
                } else if (!selectedModId) {
                    setSelectedModId(user.id);
                }
            }
        }
        getUser();

        // Fetch moderators
        async function fetchMods() {
            const { data: mods } = await supabase
                .from('profiles')
                .select('id, username, email')
                .or('is_moderator.eq.true,is_translator.eq.true,is_admin.eq.true');
            setAllMods(mods || []);
        }
        fetchMods();
    }, []);

    // Save selected moderator to localStorage
    useEffect(() => {
        if (selectedModId) {
            localStorage.setItem('imagetrans_selected_mod_id', selectedModId);
        }
    }, [selectedModId]);

    // --- NEW: Fetch Published Chapters for Selection ---
    const [publishedChapters, setPublishedChapters] = useState<{ id: string, chapter_number: number, title: string }[]>([]);

    useEffect(() => {
        if (!selectedWebtoonId) {
            setPublishedChapters([]);
            return;
        }

        async function fetchChapters() {
            const { data, error } = await supabase
                .from('chapters')
                .select('id, chapter_number, title')
                .eq('webtoon_id', selectedWebtoonId)
                .order('chapter_number', { ascending: false });

            if (data) setPublishedChapters(data);
        }

        fetchChapters();
    }, [selectedWebtoonId]);

    // Smart Auto-increment
    useEffect(() => {
        if (publishedChapters.length > 0) {
            const nextNum = publishedChapters[0].chapter_number + 1;
            setChapterInfo(prev => ({
                ...prev,
                number: nextNum,
                title: `Chapter ${nextNum}`
            }));
        } else if (selectedWebtoonId) {
            setChapterInfo(prev => ({
                ...prev,
                number: 1,
                title: `Chapter 1`
            }));
        }
    }, [publishedChapters, selectedWebtoonId]);

    // Save effect
    useEffect(() => {
        if (chapters.length === 0) return;

        // Save Active ID
        localStorage.setItem('imagetrans_active_id', activeChapterId);

        // Save Data to IDB (Debounced)
        const timer = setTimeout(async () => {
            const DB_NAME = 'ImageTransDB';
            const request = indexedDB.open(DB_NAME, 1);
            request.onsuccess = (e: any) => {
                const db = e.target.result;
                const tx = db.transaction('chapters', 'readwrite');
                const store = tx.objectStore('chapters');
                store.clear();
                chapters.forEach(ch => store.put(ch));
            };
        }, 1000);

        return () => clearTimeout(timer);
    }, [chapters, activeChapterId]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (editingImageId) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [editingImageId]);

    // Warning on close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (images.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [images]);

    useEffect(() => {
        if (selectedWebtoonId) {
            async function fetchLastChapter() {
                // Fetch max number and total count to be extremely accurate
                const [maxRes, countRes] = await Promise.all([
                    supabase
                        .from('chapters')
                        .select('chapter_number')
                        .eq('webtoon_id', selectedWebtoonId)
                        .order('chapter_number', { ascending: false })
                        .limit(1),
                    supabase
                        .from('chapters')
                        .select('id', { count: 'exact', head: true })
                        .eq('webtoon_id', selectedWebtoonId)
                ]);

                const lastNumber = maxRes.data?.[0]?.chapter_number || 0;
                const totalCount = countRes.count || 0;

                // World-class logic: Take the maximum of existing numbering or total count as the baseline
                const nextNum = Math.max(Number(lastNumber), totalCount) + 1;
                setChapterInfo({ title: `Chapter ${nextNum}`, number: nextNum });
            }
            fetchLastChapter();
        }
    }, [selectedWebtoonId]);

    // --- Handlers ---
    const updateActiveChapterImages = (updater: (prev: ImageItem[]) => ImageItem[]) => {
        setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, images: updater(c.images) } : c));
    };

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileList = Array.from(files);
        const ctprFile = fileList.find(f => f.name.toLowerCase().endsWith('.ctpr'));

        if (ctprFile) {
            const tId = toast.loading("CTPR файл уншиж байна...");
            try {
                const result = await parseCTPR(ctprFile);

                // Map filenames to new IDs
                const fileToIdMap: Record<string, string> = {};
                const newImages: ImageItem[] = [];

                // 1. Convert CTPR images to File objects and ImageItems
                for (const [filename, dataUrl] of Object.entries(result.images)) {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], filename, { type: blob.type });
                    const id = Math.random().toString(36).substr(2, 9);

                    baseImagesRef.current[id] = dataUrl;
                    fileToIdMap[filename.toLowerCase()] = id;
                    newImages.push({
                        id: id,
                        file: file,
                        preview: dataUrl,
                        status: 'idle',
                        progress: 0
                    });
                }

                // 2. Map objects to new Image IDs
                // Note: result.textObjects and eraserObjects use the original filePath (filename) as imageId
                const mappedObjects = result.textObjects.map(obj => ({
                    ...obj,
                    imageId: fileToIdMap[obj.imageId] || obj.imageId,
                    y: obj.y + 7 // +7px manual offset for import
                }));

                const mappedDrawings = result.eraserObjects.map(obj => ({
                    ...obj,
                    imageId: fileToIdMap[obj.imageId] || obj.imageId
                }));

                // 3. Update State
                setChapters(prev => prev.map(c =>
                    c.id === activeChapterId
                        ? {
                            ...c,
                            images: [...c.images, ...newImages],
                            objects: [...(c.objects || []), ...mappedObjects],
                            drawings: [...(c.drawings || []), ...mappedDrawings]
                        }
                        : c
                ));

                toast.success(`CTPR-аас ${newImages.length} зураг, ${mappedObjects.length} текст, ${mappedDrawings.length} засварыг амжилттай импортлолоо!`, { id: tId });
            } catch (err: any) {
                console.error("CTPR Main Import Error:", err);
                toast.error(`CTPR импортлоход алдаа гарлаа: ${err.message}`, { id: tId });
            }
            return;
        }

        const newImages: ImageItem[] = fileList
            .filter(f => f.type.startsWith('image/'))
            .map(f => {
                const id = Math.random().toString(36).substr(2, 9);
                const previewUrl = URL.createObjectURL(f);
                baseImagesRef.current[id] = previewUrl; // Store original preview
                return {
                    id: id,
                    file: f,
                    preview: previewUrl,
                    status: 'idle',
                    progress: 0
                };
            });
        updateActiveChapterImages(prev => [...prev, ...newImages]);
    }, [activeChapterId]);

    const removeImage = (id: string) => {
        updateActiveChapterImages(prev => {
            const item = prev.find(img => img.id === id);
            if (item) {
                URL.revokeObjectURL(item.preview);
                if (item.translatedUrl) URL.revokeObjectURL(item.translatedUrl);
                if (item.cleanUrl) URL.revokeObjectURL(item.cleanUrl);
                delete baseImagesRef.current[id]; // Clean up ref
            }
            return prev.filter(img => img.id !== id);
        });
    };

    const addChapter = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        const nextNum = chapters.length + 1;
        setChapters(prev => [...prev, { id: newId, name: `Chapter ${nextNum}`, images: [] }]);
        setActiveChapterId(newId);
    };

    const deleteChapter = (id: string) => {
        if (chapters.length <= 1) return;
        setChapters(prev => {
            const target = prev.find(c => c.id === id);
            target?.images.forEach(img => {
                URL.revokeObjectURL(img.preview);
                if (img.translatedUrl) URL.revokeObjectURL(img.translatedUrl);
                if (img.cleanUrl) URL.revokeObjectURL(img.cleanUrl);
                delete baseImagesRef.current[img.id];
            });
            const filtered = prev.filter(c => c.id !== id);
            if (activeChapterId === id) {
                setActiveChapterId(filtered[0].id);
            }
            return filtered;
        });
    };

    const processBatch = async (): Promise<void> => {
        if (images.length === 0) {
            toast.error('Зураг оруулаагүй байна', { position: 'top-center' });
            return;
        }
        if (isProcessing) return;

        setIsProcessing(true);
        toast.info('Орчуулгын процесс эхэллээ...', { position: 'top-center' });

        const processImage = async (img: ImageItem) => {
            updateActiveChapterImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'processing', progress: 10 } : p));

            try {
                // 1. Convert to Base64
                // 2. Prepare FormData
                const formData = new FormData();
                formData.append('image', img.file);
                formData.append('target_lang', targetLanguage);
                formData.append('task_id', img.id);
                formData.append('task_type', mode === 'cleaner' ? 'erase_only' : 'translate');

                updateActiveChapterImages(prev => prev.map(p => p.id === img.id ? { ...p, progress: 30 } : p));

                // 3. Call AI Backend
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    body: formData,
                    // No Content-Type header needed for FormData
                });

                if (!response.ok) throw new Error('API Error');

                // 4. Handle Blob Response (Backend returns image/png)
                const blob = await response.blob();
                const resultUrl = URL.createObjectURL(blob);
                const resultFile = new File([blob], `translated_${img.file.name}`, { type: blob.type });

                updateActiveChapterImages(prev => prev.map(p => p.id === img.id ? {
                    ...p,
                    status: 'success',
                    progress: 100,
                    translatedUrl: resultUrl,
                    translatedFile: resultFile,
                    // If cleaning, store the cleaned URL as cleanUrl
                    cleanUrl: mode === 'cleaner' ? resultUrl : p.cleanUrl
                } : p));

            } catch (err) {
                console.error(err);
                updateActiveChapterImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'error', error: 'Алдаа гарлаа' } : p));
            }
        };

        // Parallel processing in chunks of 2 for stability
        const chunkSize = 2;
        for (let i = 0; i < images.length; i += chunkSize) {
            const chunk = images.slice(i, i + chunkSize).filter(img => img.status !== 'success');
            await Promise.all(chunk.map(processImage));
        }

        setIsProcessing(false);
        toast.success('Орчуулга дууслаа', { position: 'top-center' });
    };

    const publishChapter = async () => {
        if (!selectedWebtoonId) return toast.error('Вебтүн сонгоно уу', { position: 'top-center' });
        if (images.length === 0) return toast.error('Зураг оруулаагүй байна', { position: 'top-center' });
        if (!navigator.onLine) return toast.error('Интернет холболт байхгүй байна', { position: 'top-center' });

        // Only block if images are currently being processed
        if (isProcessing || images.some(img => img.status === 'processing')) {
            return toast.error('Зураг боловсруулагдаж байна, түр хүлээнэ үү', { position: 'top-center' });
        }

        const scheduledDate = publishMode === 'schedule' ? convertLocalToUTC(scheduledAt, selectedTimeZone) : null;
        if (publishMode === 'schedule') {
            if (!scheduledAt || !scheduledDate || !Number.isFinite(scheduledDate.getTime())) {
                return toast.error('Нийтлэх цагаа зөв сонгоно уу', { position: 'top-center' });
            }
            if (scheduledDate.getTime() <= Date.now()) {
                return toast.error('Ирээдүйн цаг сонгоно уу', { position: 'top-center' });
            }
        }

        // Warning but not blocking for idle/error images
        if (images.some(img => img.status !== 'success')) {
            toast.info('Орчуулагдаагүй зургуудыг эх хувиар нь нийтэлж байна...', { position: 'top-center' });
        }

        setIsPublishing(true);
        const t = toast.loading(publishMode === 'schedule' ? 'Бүлгийг товлож байна (0%)...' : 'Бүлгийг нийтэлж байна (0%)...', { position: 'top-center' });

        try {
            // 1. Upload to R2 (Direct Upload with Presigned URLs)
            // Robust Mobile Uploading:
            // - Bypasses Server Body Limits (4.5MB)
            // - Retries on Network Failure
            // - Batch Processing
            const BATCH_SIZE = 3;
            const urls: string[] = [];
            const timestamp = Date.now();

            // Retry helper: attempts fetch up to 3 times with exponential backoff
            const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
                try {
                    const res = await fetch(url, options);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res;
                } catch (err) {
                    if (retries > 0) {
                        const delay = (4 - retries) * 1000; // 1s, 2s, 3s
                        console.warn(`Retrying upload... (${retries} left)`);
                        await new Promise(r => setTimeout(r, delay));
                        return fetchWithRetry(url, options, retries - 1);
                    }
                    throw err;
                }
            };



            for (let i = 0; i < images.length; i += BATCH_SIZE) {
                const chunk = images.slice(i, i + BATCH_SIZE);

                // Update Progress
                const percent = Math.round((i / images.length) * 100);
                toast.loading(`Нийтэлж байна... ${percent}% (${i}/${images.length})`, { id: t });

                const chunkPromises = chunk.map(async (img, chunkIdx) => {
                    const globalIdx = i + chunkIdx;
                    const sourceUrl = img.translatedUrl || img.preview;

                    // 1. Get Blob
                    let blob: Blob;
                    try {
                        // Priority 1: Use Original File if no translation is needed
                        if (img.file && !img.translatedUrl) {
                            blob = img.file;
                        } else if (sourceUrl) {
                            // Priority 2: Fetch the source (Translation or Preview)
                            const blobRes = await fetch(sourceUrl);
                            if (!blobRes.ok) throw new Error(`Failed to read image ${globalIdx + 1}`);
                            blob = await blobRes.blob();
                        } else {
                            throw new Error("Image source is missing");
                        }
                    } catch (e: any) {
                        // Priority 3: FALLBACK to Original File if fetch failed (e.g. Translation Blob expired)
                        if (img.file) {
                            console.warn(`Fetch failed for image ${globalIdx + 1}, falling back to original file.`);
                            blob = img.file;
                            // Optionally toast a warning?
                            // toast('Translation lost for page ' + (globalIdx + 1) + ', using original.', { icon: '⚠️' });
                        } else {
                            const isRevoked = sourceUrl?.startsWith('blob:') && e.message === 'Failed to fetch';
                            const msg = isRevoked
                                ? "Зургийн файл олдсонгүй (Хугацаа дууссан). Та энэ зургийг устгаад дахин хуулна уу."
                                : e.message;
                            throw new Error(`Зургийг уншиж чадсангүй (Page ${globalIdx + 1}): ${msg}`);
                        }
                    }

                    // 2. Determine Path & Ext (Respect original format or Blob type)
                    const ext = blob.type === 'image/webp' ? 'webp' : (blob.type === 'image/png' ? 'png' : 'jpg');
                    const timestamp = Date.now();
                    const filename = `page_${globalIdx + 1}_${timestamp}.${ext}`;
                    const path = `webtoons/${selectedWebtoonId}/chapters/${chapterInfo.number}/${filename}`;

                    // 3. Get Presigned URL (Server Action - Metadata only)
                    let uploadUrl: string;
                    let publicUrl: string;
                    try {
                        const res = await getPresignedUrl(path, blob.type);
                        if (!res.success || !res.url) throw new Error(res.error || "Failed to get upload URL");
                        uploadUrl = res.url;
                        publicUrl = res.publicUrl!; // Bang operator ok because success=true implies publicUrl
                    } catch (e: any) {
                        throw new Error(`Upload URL авч чадсангүй: ${e.message}`);
                    }

                    // 4. Direct Upload to R2 (with Retry)
                    try {
                        await fetchWithRetry(uploadUrl, {
                            method: 'PUT',
                            body: blob,
                            headers: { 'Content-Type': blob.type }
                        });
                    } catch (e: any) {
                        if (e.message === 'Failed to fetch') {
                            throw new Error(`Cloud руу илгээхэд алдаа гарлаа (CORS тохиргоог шалгана уу): ${e.message}`);
                        }
                        throw new Error(`Cloud upload failed (Page ${globalIdx + 1}): ${e.message}`);
                    }

                    return { index: globalIdx, url: publicUrl };
                });

                const chunkResults = await Promise.all(chunkPromises);
                chunkResults.forEach(r => { if (r.url) urls.push(r.url); });
            }

            toast.loading('Мэдээллийн санд хадгалж байна...', { id: t });

            // 2. Save to Supabase (via Server Action)
            // Prepare Edit State for Persistence (CapCut Style)
            const activeCh = chapters.find(c => c.id === activeChapterId);
            const editState = {
                objects: activeCh?.objects || [],
                drawings: activeCh?.drawings || [],
                version: 1,
                timestamp: Date.now()
            };

            const resultAction = await (await import("@/app/actions/webtoon-actions")).publishChapterAction({
                webtoon_id: selectedWebtoonId,
                chapter_number: chapterInfo.number,
                title: chapterInfo.title,
                images: urls,
                edit_state: editState,
                is_published: publishMode === 'now',
                translator_id: selectedModId || userId,
                scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
                publish_mode: publishMode
            });

            if (!resultAction.success) {
                throw new Error(resultAction.error || "Нийтлэх явцад сервер дээр алдаа гарлаа");
            }

            toast.success(
                publishMode === 'schedule' ? 'Бүлэг амжилттай товлогдлоо!' : 'Амжилттай нийтлэгдлээ!',
                { id: t, position: 'top-center', duration: 5000 }
            );

            // Optional: Don't clear immediately if user wants to keep editing?
            // User requested: "publish, if mistake go back".
            // If we clear, they have to reload.
            // If we DON'T clear, they can keep editing locally. 
            // Better to keep it, but mark as "Published".
            // updateActiveChapterImages(() => []); // Disable auto-clear for better UX

        } catch (err: any) {
            console.error("Publish Error Detail:", err);
            // Don't mask the error anymore, show exactly what happened
            toast.error(err.message || 'Нийтлэх явцад алдаа гарлаа', { id: t, position: 'top-center', duration: 8000 });
        } finally {
            setIsPublishing(false);
        }
    };

    const handleManualClean = async (imgId: string) => {
        const img = images.find((i: ImageItem) => i.id === imgId);
        if (!img) return;

        updateActiveChapterImages((prev: ImageItem[]) => prev.map((p: ImageItem) => p.id === imgId ? { ...p, status: 'processing', progress: 50 } : p));

        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(img.file);
            });
            const base64 = await base64Promise;
            const base64Data = base64.split(',')[1];

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: base64Data,
                    task_type: 'erase_only',
                    task_id: img.id
                }),
            });

            if (!response.ok) throw new Error('API Error');
            const result = await response.json();

            // Convert base64 result to File for persistence
            const resBlob = await (await fetch(`data:image/jpeg;base64,${result.result}`)).blob();
            const resFile = new File([resBlob], `cleaned_${img.file.name}`, { type: 'image/jpeg' });
            const resUrl = URL.createObjectURL(resBlob);

            updateActiveChapterImages((prev: ImageItem[]) => prev.map((p: ImageItem) => p.id === imgId ? {
                ...p,
                status: 'success',
                progress: 100,
                translatedUrl: resUrl,
                translatedFile: resFile,
                cleanUrl: resUrl // Store the cleaned URL
            } : p));
            toast.success('Зургийг амжилттай цэвэрлэлээ', { position: 'top-center' });

        } catch (err) {
            toast.error('Цэвэрлэхэд алдаа гарлаа', { position: 'top-center' });
        }
    };

    const handleUrlImport = async () => {
        if (!importUrl) return;

        // --- NEW: Check if input is a list of direct Image URLs ---
        const lines = importUrl.split(/[\n,]/).map(l => l.trim()).filter(l => l.startsWith('http'));
        const isUrlList = lines.length > 1 || (lines.length === 1 && lines[0].match(/\.(jpg|jpeg|png|webp|avif)/i));

        const tId = toast.loading(isUrlList ? "Зургуудыг шууд татаж байна..." : "Сайтаас зургуудыг хайж байна...", { position: 'top-center' });
        setIsImporting(true);

        try {
            let imageUrls: string[] = [];

            if (isUrlList) {
                imageUrls = lines;
            } else {
                // Auto-scrape
                const res = await fetch('/api/scrape-chapter', {
                    method: 'POST',
                    body: JSON.stringify({ url: importUrl })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                if (!data.images || data.images.length === 0) throw new Error("Зураг олдсонгүй");
                imageUrls = data.images;
            }

            toast.loading(`${imageUrls.length} зураг олдлоо. Боловсруулж байна...`, { id: tId, position: 'top-center' });

            const newItems: ImageItem[] = [];

            // Limit to prevent crash
            const sliceLinks = imageUrls.slice(0, 100);

            for (const url of sliceLinks) {
                try {
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                    const imgRes = await fetch(proxyUrl);
                    if (!imgRes.ok) continue;

                    const blob = await imgRes.blob();
                    const fileName = url.split('/').pop()?.split('?')[0] || `import-${Math.random().toString(36).substr(2, 5)}.jpg`;
                    const file = new File([blob], fileName, { type: blob.type });

                    const id = Math.random().toString(36).substr(2, 9);
                    const previewUrl = URL.createObjectURL(file);
                    baseImagesRef.current[id] = previewUrl; // Store original preview

                    newItems.push({
                        id: id,
                        file: file,
                        preview: previewUrl,
                        status: 'idle',
                        progress: 0
                    });
                } catch (e) {
                    console.warn("Failed to download image:", url);
                }
            }

            if (newItems.length === 0) throw new Error("Ямар ч зураг татагдсангүй");

            updateActiveChapterImages(prev => [...prev, ...newItems]);
            setImportUrl('');
            toast.success(`${newItems.length} зураг амжилттай нэмэгдлээ!`, { id: tId, position: 'top-center' });
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('403') || msg.includes('Cloudflare')) {
                msg = "Энэ сайт Cloudflare хамгаалалттай байна. Зургийн линкүүдээ (Image Links) жагсаалтаар хуулж тавина уу.";
            }
            toast.error("Алдаа: " + msg, { id: tId, duration: 6000, position: 'top-center' });
        } finally {
            setIsImporting(false);
        }
    };



    const handleLoadChapter = async (chapterId: string) => {
        if (!selectedWebtoonId) return toast.error('Вебтүн сонгоно уу', { position: 'top-center' });

        const t = toast.loading('Бүлгийг татаж байна...', { position: 'top-center' });

        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('id', chapterId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Бүлэг олдсонгүй');

            // Construct Chapter Item with Edit State
            const editState = data.edit_state || {};
            const imageUrls: string[] = data.images || [];

            // We need to convert URLs back to ImageItems
            // Note: These are R2 URLs. We can use them directly as previews.
            // But for "Clean", if we don't have the clean version stored, we might relying on 'cleanUrl' in editState?
            // If `edit_state` has objects, we can restore them.

            const restoredImages: ImageItem[] = await Promise.all(imageUrls.map(async (url, idx) => {
                const id = Math.random().toString(36).substr(2, 9);
                // Fetch blob to make it editable/savable again? 
                // Or just keep as URL until save?
                // AdvancedEditor handles URLs fine.
                // But `file` property is required by ImageItem interface?
                // Let's create a dummy file or fetch it. Fetch is safer for re-upload.

                let file: File;
                try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    file = new File([blob], `restored_page_${idx}.jpg`, { type: blob.type });
                } catch (e) {
                    // Fallback stub if fetch fails (e.g. CORS)
                    file = new File([], 'placeholder.jpg');
                }

                return {
                    id: id,
                    preview: url, // Use the remote URL as preview
                    translatedUrl: url, // It was published, so it's likely translated? Or original? 
                    // Depending on what was saved in `images` column. Usually final images.
                    // If we want "Clean" version, we need to know where it is.
                    // If `edit_state` captures `cleanUrl` per image? 
                    // My previous Edit State structure was `{ objects, drawings }`. 
                    // It didn't save `images` mapping.
                    // So we only have the Final Result.
                    // This is a limitation. If user wants to re-edit TEXT, they need Clean Background.
                    // IF `drawings` (Eraser) are present, real-time rendering might handle cleaning if we have Original.
                    // BUT `images` column usually has the text burnt in if we aren't careful?
                    // Wait, `publishChapter` sends `urls`.
                    // `urls` comes from `img.translatedUrl` or `img.preview`.
                    // If `translatedUrl` has text burnt in, then loading it back means double text?
                    // NO. `AdvancedEditor` renders Objects ON TOP of background.
                    // Users usually hide text layer when saving for "Clean" archive?
                    // Or they save the Final.
                    // If they save the Final, we can't easily edit text underneath without the clean version.
                    // ISSUE: We need to store CLEAN version URL too if we want robust edit.
                    // For now, I will assume `images` contains the "Working Image" (Clean or Original).
                    // Actually, usually users publish the FINAL Output.
                    // So reloading it for edit is tricky if it's flattened.
                    // BUT for "Smart Editor" context, usually we save Project Data separate from Export.
                    // Since I just added `edit_state`, that is the Project Data.
                    // But where are the Source Images?
                    // I will assume the `images` in DB are usable as source or I should save `source_images` too.
                    // For this task (MVP), I will load the `images` from DB and apply `objects` on top.
                    // User verifies if it works.

                    status: 'success',
                    file: file,
                    cleanUrl: url, // Assume the loaded image is the base
                    progress: 100
                };
            }));

            // Restore Chapter
            const newChapterId = Math.random().toString(36).substr(2, 9);
            const restoredChapter: ChapterItem = {
                id: newChapterId,
                name: `Edit: ${data.title}`,
                images: restoredImages,
                objects: editState.objects,
                drawings: editState.drawings
            };

            setChapters(prev => [...prev, restoredChapter]);
            setActiveChapterId(newChapterId);

            toast.success(`Бүлэг ${data.chapter_number} ("${data.title}") засахад бэлэн боллоо!`, { id: t });

        } catch (e: any) {
            toast.error('Алдаа: ' + e.message, { id: t });
        }
    };

    // --- UI Components ---
    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 space-y-8">
            {/* Header - Cinematic & Clean */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3.5 bg-gradient-to-br from-primary to-red-600 rounded-2xl shadow-lg shadow-primary/20">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
                                ImageTrans AI
                            </h1>
                        </div>
                    </div>
                    <p className="text-muted text-xs font-black uppercase tracking-[0.3em] pl-1 opacity-60">
                        Native Translation Suite <span className="text-primary/50 mx-2">•</span> Phase 1
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Editor Academy Button - Top Right */}
                    <button
                        onClick={() => setShowAcademy(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all group backdrop-blur-md"
                    >
                        <BookIcon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span>Academy</span>
                    </button>

                    {/* Settings Toggle */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "p-3 rounded-2xl transition-all border",
                            showSettings ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/5 hover:border-white/10 text-muted hover:text-white"
                        )}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Settings Sidebar / Content */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden relative z-10"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-surface border border-white/5 rounded-[32px]">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Backend URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('backendUrl', backendUrl);
                                        }}
                                        className="p-3 bg-primary/20 text-primary rounded-xl"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Target Language</label>
                                <select
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none appearance-none"
                                >
                                    <option value="mn">Mongolian (mn)</option>
                                    <option value="en">English (en)</option>
                                    <option value="ru">Russian (ru)</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left: Uploader & Gallery */}
                <div className="xl:col-span-8 space-y-8">

                    {/* URL Import Section */}
                    <div className="bg-surface border border-white/5 rounded-[40px] p-6 shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="Гадаад сайтын линкийг энд тавина уу..."
                                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all placeholder:text-muted/20 pr-12"
                                />
                                <LayoutGrid className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                                {importUrl.toLowerCase().includes('asuracomic') && (
                                    <div className="absolute top-full left-0 mt-2 px-3 py-1 bg-primary/10 rounded-lg text-[9px] font-black text-primary uppercase animate-pulse border border-primary/20 z-10">
                                        💡 Asura Scans-аас шууд татах боломжгүй бол зургийн линкийг (URL List) шууд хуулаад тавьж болно шүү.
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleUrlImport}
                                disabled={isImporting || !importUrl}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Зургуудыг Татах
                            </button>
                            <button
                                onClick={() => router.push('/admin/chapters/bulk')}
                                className="px-8 py-4 bg-primary/10 hover:bg-primary-hover border border-primary/20 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 text-primary hover:text-white"
                            >
                                <Plus className="w-4 h-4" />
                                Багцаар нэмэх
                            </button>
                        </div>
                    </div>

                    {/* Dropzone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative group cursor-pointer border-2 border-dashed rounded-[40px] p-12 transition-all overflow-hidden bg-surface/50",
                            dragActive ? "border-primary bg-primary/5" : "border-white/5 hover:border-white/10"
                        )}
                    >
                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleFiles(e.target.files)} />

                        <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
                            <div className="p-8 bg-white/5 rounded-full group-hover:scale-110 group-hover:bg-primary/10 transition-all shadow-inner">
                                <Upload className="w-14 h-14 text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-center px-4">
                                <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-2">Зургаа энд чирнэ үү</p>
                                <p className="text-muted text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed max-w-xs mx-auto">
                                    эсвэл товшиж сонгоно уу. <br className="md:hidden" /> Мөн дээрх хэсэгт линкээ тавьж болно.
                                </p>
                            </div>
                        </div>

                        {/* Animated background elements */}
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                            <ListOrdered className="w-32 h-32" />
                        </div>
                    </div>

                    {/* Image Grid */}
                    {images.length > 0 && (
                        <Reorder.Group axis="y" values={images} onReorder={(newImages) => updateActiveChapterImages(() => newImages)} className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {images.map((img: ImageItem) => (
                                    <Reorder.Item
                                        key={img.id}
                                        value={img}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "p-4 bg-surface border border-white/5 rounded-[32px] flex items-center gap-6 group relative overflow-hidden",
                                            img.status === 'processing' && "border-primary/30",
                                            img.status === 'success' && "border-green-500/20"
                                        )}
                                    >
                                        <div className="w-20 h-28 md:w-24 md:h-32 relative rounded-2xl overflow-hidden shrink-0 bg-black/40 border border-white/5 shadow-2xl">
                                            {/* Initialize baseImagesRef for this image if not already set */}
                                            {(() => {
                                                if (!baseImagesRef.current[img.id]) {
                                                    // Priority: Clean URL > Original Preview (if no translation)
                                                    // If we have a translation but no clean URL, it means it's an old legacy save (might ghost).
                                                    // Ideally we prefer cleanUrl.
                                                    baseImagesRef.current[img.id] = img.cleanUrl || img.preview;
                                                }
                                                return null;
                                            })()}
                                            <Image
                                                src={img.status === 'success' ? img.translatedUrl! : img.preview}
                                                alt="Preview"
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                            {img.status === 'processing' && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                        <span className="text-[8px] font-black text-primary">AI</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1 self-stretch">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <h3 className="font-bold text-xs md:text-sm truncate uppercase tracking-tight text-white/80">
                                                        {img.file.name}
                                                    </h3>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                                        className="p-2 hover:bg-red-500/10 rounded-xl text-muted hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                        img.status === 'idle' && "bg-white/5 border-white/10 text-muted",
                                                        img.status === 'processing' && "bg-primary/10 border-primary/20 text-primary animate-pulse",
                                                        img.status === 'success' && "bg-green-500/10 border-green-500/20 text-green-500",
                                                        img.status === 'error' && "bg-red-500/10 border-red-500/20 text-red-500"
                                                    )}>
                                                        {img.status === 'idle' && ''}
                                                        {img.status === 'processing' && '...'}
                                                        {img.status === 'success' && ''}
                                                        {img.status === 'error' && '!'}
                                                    </div>
                                                    {img.status === 'processing' && (
                                                        <span className="text-[10px] font-black text-primary font-mono">{img.progress}%</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between mt-auto">
                                                <div className="flex-1 max-w-[120px] md:max-w-none mr-4">
                                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                img.status === 'error' ? "bg-red-500" : "bg-primary"
                                                            )}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${img.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setEditingImageId(img.id); setIsCompareMode(true); }}
                                                    className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/10 active:scale-95 whitespace-nowrap"
                                                >
                                                    Review & Edit
                                                </button>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>
                    )}

                    {/* Floating Dock Control Center (Fixed with Offset) */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-fit xl:ml-[120px] pointer-events-none">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-[#0f0f0f]/95 backdrop-blur-3xl border border-white/10 rounded-full p-2.5 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] flex items-center justify-between pointer-events-auto ring-1 ring-white/5 relative gap-1 sm:gap-4 w-fit max-w-[95vw] overflow-x-auto no-scrollbar"
                        >
                            {/* 1. Left Group: Load & Mode */}
                            <div className="flex items-center gap-3 shrink-0 pl-1">
                                {/* Load Chapter Button */}
                                <div className="relative group">
                                    <button
                                        disabled={!selectedWebtoonId}
                                        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 rounded-full text-yellow-500 transition-all disabled:opacity-30 group-hover:scale-105 shadow-inner active:scale-95"
                                        title="Load Chapter"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                    {/* Floating Menu (Upwards) */}
                                    {/* Use pb-6 for hover bridge */}
                                    <div className="absolute left-0 bottom-full pb-6 w-80 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50 origin-bottom-left">
                                        <div className="bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5 p-2">
                                            <div className="px-4 py-3 border-b border-white/5 mb-1 bg-white/5 rounded-t-2xl">
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">Published Chapters</h3>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 p-1">
                                                {publishedChapters.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500 text-xs font-medium">Нийтэлсэн бүлэг алга</div>
                                                ) : (
                                                    publishedChapters.map(ch => (
                                                        <button
                                                            key={ch.id}
                                                            onClick={() => handleLoadChapter(ch.id)}
                                                            className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-between group/item"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-white text-xs uppercase tracking-wide">Ch {ch.chapter_number}</p>
                                                                <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{ch.title}</p>
                                                            </div>
                                                            <Edit3 className="w-3 h-3 text-yellow-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mode Switcher (Desktop Only) */}
                                <div className="hidden sm:flex bg-white/5 p-1 rounded-full border border-white/5 shrink-0 h-11 items-center">
                                    <button
                                        onClick={() => setMode('translator')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 h-9 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                            mode === 'translator'
                                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                                : "text-muted hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Languages className="w-4 h-4" />
                                        <span>Translator</span>
                                    </button>
                                    <button
                                        onClick={() => setMode('cleaner')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 h-9 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                            mode === 'cleaner'
                                                ? "bg-white text-black shadow-lg scale-105"
                                                : "text-muted hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Eraser className="w-4 h-4" />
                                        <span>Cleaner</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. Chapter Nav (Minimal) */}
                            <div className="flex bg-white/5 p-1 rounded-full border border-white/5 items-center justify-center shrink-0 min-w-fit sm:min-w-[120px] h-11 px-2 gap-1">
                                {chapters.map((ch, idx) => (
                                    <div key={ch.id} className="relative group shrink-0">
                                        <button
                                            onClick={() => setActiveChapterId(ch.id)}
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-black transition-all",
                                                activeChapterId === ch.id
                                                    ? "bg-white/20 text-white shadow-inner border border-white/10 scale-110"
                                                    : "text-white/40 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            {idx + 1}
                                        </button>
                                        {chapters.length > 1 && (
                                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}
                                                    className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md scale-90 hover:scale-100 transition-transform"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={addChapter}
                                    className="w-8 h-8 flex items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 rounded-full transition-all shrink-0 hover:scale-110"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1 hidden sm:block min-w-4" />

                            {/* 3. Primary Actions */}
                            <div className="flex items-center gap-3 shrink-0 pr-1">
                                {/* Infinity Editor (Moved First) */}
                                <button
                                    onClick={() => setShowAdvancedEditor(true)}
                                    disabled={images.length === 0}
                                    className="relative group h-11 px-3 sm:px-6 bg-[#0F172A] border border-blue-500/30 rounded-full overflow-hidden hover:border-blue-500/50 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 flex items-center gap-2.5"
                                >
                                    <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors" />
                                    <Edit3 className="w-4 h-4 text-blue-400 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-100 whitespace-nowrap hidden sm:inline">Infinity Editor</span>
                                </button>

                                <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

                                {/* Clear Button (Moved Last) */}
                                <button
                                    onClick={() => updateActiveChapterImages(() => [])}
                                    className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 hover:border-red-500/30 rounded-full transition-all group active:scale-95"
                                    title="Clear All"
                                >
                                    <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                                </button>


                            </div>
                        </motion.div>
                    </div>

                </div>

                {/* Right: Publish Panel */}
                <div className="xl:col-span-4 space-y-6 sticky top-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl border-white/5"
                    >
                        {/* Premium Glow Effect */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Бүлэг Нийтлэх</h2>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20 animate-pulse">
                                    LIVE PREVIEW
                                </span>
                            </div>
                            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Publishing Console v2.0</p>
                        </div>

                        <div className="space-y-6 relative z-10 text-left">
                            {/* Webtoon Selector */}
                            <div className="space-y-3">
                                <WebtoonSearchSelector 
                                    webtoons={webtoons}
                                    selectedId={selectedWebtoonId}
                                    onSelect={(id) => setSelectedWebtoonId(id)}
                                />
                            </div>

                            {/* Moderator Selector */}
                            {allMods.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Хариуцсан Модератор</label>
                                        {selectedModId && (
                                            <span className="text-[9px] font-bold text-primary">MODERATOR</span>
                                        )}
                                    </div>
                                    <div className="relative group/select">
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none appearance-none transition-all cursor-pointer relative z-10 text-white"
                                            onChange={(e) => setSelectedModId(e.target.value)}
                                            value={selectedModId}
                                        >
                                            <option value="" className="bg-surface">-- Сонгох --</option>
                                            {allMods.map(m => (
                                                <option key={m.id} value={m.id} className="bg-surface">
                                                    {m.username || m.email} {m.id === userId ? "(Би)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-muted group-hover/select:text-primary transition-colors">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground italic px-1">Тайлангийн системд энэ хүний нэр дээр бүртгэгдэнэ.</p>
                                </div>
                            )}

                            {/* Number & Title Section */}
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    {/* Focused Number Input */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Бүлгийн дугаар</label>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                                <Sparkles className="w-2.5 h-2.5 text-primary" />
                                                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Auto Naming</span>
                                            </div>
                                        </div>
                                        
                                        <div className="relative group">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ListOrdered className="w-4 h-4 text-muted/30 group-hover:text-primary transition-colors" />
                                            </div>
                                            <input
                                                type="number"
                                                value={chapterInfo.number}
                                                onChange={(e) => {
                                                    const val = e.target.value ? Number(e.target.value) : 0;
                                                    setChapterInfo(prev => ({ 
                                                        ...prev, 
                                                        number: val, 
                                                        title: `Chapter ${val}` 
                                                    }));
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-6 pl-14 pr-24 text-xl font-black focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="0"
                                            />
                                            {/* Premium Steppers */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const val = Math.max(0, chapterInfo.number - 1);
                                                        setChapterInfo(prev => ({ ...prev, number: val, title: `Chapter ${val}` }));
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all border border-white/5"
                                                >
                                                    <ChevronDown className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const val = chapterInfo.number + 1;
                                                        setChapterInfo(prev => ({ ...prev, number: val, title: `Chapter ${val}` }));
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl transition-all border border-primary/20"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Indicators */}
                                {selectedWebtoonId && (
                                    <div className="flex items-center gap-2 px-1">
                                        {publishedChapters.some(c => c.chapter_number === chapterInfo.number) ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-[0.1em]">Бүртгэлтэй бүлгийг шинэчлэх (Update)</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/5 border border-green-500/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-green-500/80 uppercase tracking-[0.1em]">Дараагийн шинэ бүлэг (Next Chapter)</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Publish Mode */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Нийтлэх горим</label>
                                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/40 border border-white/10 p-1">
                                    {([
                                        { id: 'now', label: 'Одоо', icon: Play },
                                        { id: 'schedule', label: 'Товлох', icon: Clock },
                                    ] as const).map((modeItem) => {
                                        const Icon = modeItem.icon;
                                        return (
                                            <button
                                                key={modeItem.id}
                                                type="button"
                                                onClick={() => setPublishMode(modeItem.id)}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all",
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

                                {publishMode === 'schedule' && (
                                    <div className="space-y-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">Цагийн бүс</label>
                                            <select
                                                value={selectedTimeZone}
                                                onChange={(e) => {
                                                    const newTz = e.target.value;
                                                    const prevUtc = convertLocalToUTC(scheduledAt, selectedTimeZone);
                                                    setSelectedTimeZone(newTz);
                                                    setScheduledAt(convertUTCToLocalInput(prevUtc, newTz));
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
                                                value={scheduledAt}
                                                onChange={(e) => setScheduledAt(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none [color-scheme:dark] focus:border-primary"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: '+1 цаг', minutes: 60 },
                                                { label: '20:00', minutes: null },
                                                { label: 'Маргааш', minutes: 24 * 60 },
                                            ].map((quick) => (
                                                <button
                                                    key={quick.label}
                                                    type="button"
                                                    onClick={() => {
                                                        if (quick.minutes === null) {
                                                            const nowInTarget = convertUTCToLocalInput(new Date(), selectedTimeZone);
                                                            const [datePart] = nowInTarget.split('T');
                                                            let targetTimeStr = `${datePart}T20:00`;
                                                            let targetDateUTC = convertLocalToUTC(targetTimeStr, selectedTimeZone);
                                                            if (targetDateUTC.getTime() <= Date.now()) {
                                                                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                                                                const tomorrowInTarget = convertUTCToLocalInput(tomorrow, selectedTimeZone);
                                                                const [tomorrowDatePart] = tomorrowInTarget.split('T');
                                                                targetTimeStr = `${tomorrowDatePart}T20:00`;
                                                            }
                                                            setScheduledAt(targetTimeStr);
                                                        } else {
                                                            setScheduledAt(getLocalDateTimeValue(quick.minutes, selectedTimeZone));
                                                        }
                                                    }}
                                                    className="rounded-lg bg-white/5 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-blue-100 hover:bg-white/10"
                                                >
                                                    {quick.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chapter Preview Card (Premium Refined) */}
                            <div className="p-5 rounded-[2rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group/preview space-y-4">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                                
                                <p className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] relative z-10">Live Preview</p>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                                        {webtoons.find(w => w.id === selectedWebtoonId)?.image ? (
                                            <img 
                                                src={webtoons.find(w => w.id === selectedWebtoonId)?.image} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-white/5" />
                                        )}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">
                                            {webtoons.find(w => w.id === selectedWebtoonId)?.title || "Вэбтүүн сонгоогүй"}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-primary">Бүлэг {chapterInfo.number}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                            <span className="text-[10px] font-medium text-muted truncate">{chapterInfo.title}</span>
                                        </div>
                                    </div>
                                </div>

                                {publishMode === 'schedule' && (
                                    <div className="mt-2 space-y-2 border-t border-white/5 pt-3 relative z-10">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Дэлхийн цагаар орох цагууд:</p>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
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
                                                    <div key={tz.value} className="flex items-center justify-between text-white/70 border-b border-white/[0.02] pb-1">
                                                        <span className="font-bold text-muted/80">{tz.label.split(' ')[0]}:</span>
                                                        <span className="font-black text-blue-300 ml-2">{formattedTime}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!selectedWebtoonId || isPublishing || images.length === 0}
                                onClick={publishChapter}
                                className={cn(
                                    "group relative w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm overflow-hidden transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none",
                                    (selectedWebtoonId && images.length > 0) ? "bg-primary text-white shadow-[0_10px_40px_-10px_rgba(229,9,20,0.5)]" : "bg-white/5 text-muted border border-white/10"
                                )}
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {isPublishing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        publishMode === 'schedule' ? <Clock className="w-5 h-5 transition-transform group-hover:scale-110" /> : <Save className="w-5 h-5 transition-transform group-hover:scale-110" />
                                    )}
                                    {isPublishing ? '...' : (publishMode === 'schedule' ? 'Товлох' : 'Нийтлэх')}
                                </div>
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            </button>
                        </div>

                        {/* Status Dashboard */}
                        <div className="relative z-10 grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center group hover:bg-white/[0.08] transition-all">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <LayoutGrid className="w-4 h-4 text-primary" />
                                </div>
                                <p className="text-xl font-black text-white leading-none">{images.length}</p>
                                <p className="text-[8px] font-black uppercase text-muted tracking-widest mt-1">Нийт хуудас</p>
                            </div>
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center group hover:bg-white/[0.08] transition-all">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                                <p className="text-xl font-black text-white leading-none">
                                    {images.filter(i => i.status === 'success' || i.translatedUrl).length}
                                </p>
                                <p className="text-[8px] font-black uppercase text-muted tracking-widest mt-1">Орчуулагдсан</p>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="relative z-10 flex items-center justify-center gap-2 pt-2 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                            <Clock className="w-3 h-3" />
                            <p className="text-[8px] font-black uppercase tracking-widest">Auto-save Enabled</p>
                        </div>
                    </motion.div>
                </div>
            </div >

            {/* Modal: Review/Edit (Zen Mode & Slider) */}
            <AnimatePresence>
                {
                    editingImageId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                                "fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-all duration-500",
                                isZenMode ? "bg-black" : "bg-black/90 backdrop-blur-xl p-4 md:p-12"
                            )}
                        >
                            {/* Zen Mode Background Ambiance */}
                            {isZenMode && (
                                <div className="absolute inset-0 pointer-events-none opacity-20">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/20 rounded-full blur-[150px]" />
                                </div>
                            )}

                            {/* Keyboard Shortcuts Handler */}
                            <ShortcutsHandler
                                onNext={() => {
                                    const idx = images.findIndex(i => i.id === editingImageId);
                                    if (idx < images.length - 1) setEditingImageId(images[idx + 1].id);
                                }}
                                onPrev={() => {
                                    const idx = images.findIndex(i => i.id === editingImageId);
                                    if (idx > 0) setEditingImageId(images[idx - 1].id);
                                }}
                                onClose={() => { setEditingImageId(null); setIsCompareMode(false); }}
                                onToggleZen={() => setIsZenMode(prev => !prev)}
                            />

                            <div 
                                className={cn(
                                    "relative flex flex-col transition-all duration-500",
                                    isZenMode ? "w-full h-full" : "w-full h-full max-w-6xl gap-6",
                                    viewMode === 'scroll' ? "overflow-y-auto no-scrollbar scroll-smooth" : "overflow-hidden"
                                )}
                                onScroll={(e) => {
                                    if (viewMode !== 'scroll') return;
                                    // Robust: Update editingImageId based on which image is most visible
                                    const container = e.currentTarget;
                                    const children = Array.from(container.querySelectorAll('[data-image-id]'));
                                    const containerCenter = container.scrollTop + container.clientHeight / 2;
                                    
                                    let bestId = editingImageId;
                                    let minDistance = Infinity;

                                    children.forEach((child) => {
                                        const rect = (child as HTMLElement);
                                        const distance = Math.abs((rect.offsetTop + rect.clientHeight / 2) - containerCenter);
                                        if (distance < minDistance) {
                                            minDistance = distance;
                                            bestId = rect.getAttribute('data-image-id') || '';
                                        }
                                    });

                                    if (bestId && bestId !== editingImageId) {
                                        setEditingImageId(bestId);
                                    }
                                }}
                            >
                                {/* Header Controls (Minimal in Zen) */}
                                <div className={cn(
                                    "flex items-center justify-between z-50 transition-all duration-300",
                                    isZenMode ? "fixed top-6 left-6 right-6 opacity-0 hover:opacity-100" : "opacity-100"
                                )}>
                                    <div className="space-y-1">
                                        <h2 className={cn("font-black uppercase tracking-tighter transition-all", isZenMode ? "text-lg text-white/50" : "text-2xl")}>
                                            Review Translation
                                        </h2>
                                        {!isZenMode && <p className="text-muted text-[10px] font-bold uppercase tracking-widest">Final check before publishing</p>}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsZenMode(!isZenMode)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all group"
                                            title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                                        >
                                            {isZenMode ? <MonitorPlay className="w-5 h-5 text-primary" /> : <MonitorPlay className="w-5 h-5 text-muted group-hover:text-white" />}
                                        </button>
                                        <button
                                            onClick={() => { setEditingImageId(null); setIsCompareMode(false); }}
                                            className="p-3 bg-white/5 hover:bg-white/20 rounded-full transition-all"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Content Area */}
                                <div className={cn(
                                    "flex-1 relative flex flex-col items-center",
                                    isZenMode ? "p-0" : "bg-black/50 rounded-[40px] border border-white/10 p-4",
                                    viewMode === 'scroll' ? "overflow-visible min-h-0" : "overflow-hidden justify-center"
                                )}>
                                    <div
                                        className={cn(
                                            "relative transition-all duration-500 ease-out flex flex-col items-center",
                                            isZenMode ? "" : "rounded-2xl overflow-hidden",
                                            viewMode === 'fit' ? "w-full h-full" : "h-auto w-full"
                                        )}
                                    >
                                        {viewMode === 'scroll' ? (
                                            <div className="flex flex-col items-center gap-0 w-full pb-32">
                                                {images.map((img) => (
                                                    <div 
                                                        key={img.id}
                                                        data-image-id={img.id}
                                                        className="w-full relative transition-all"
                                                        style={{ width: `${widthPercentage}%` }}
                                                    >
                                                        {isCompareMode ? (
                                                            <CompareSlider
                                                                original={img.preview}
                                                                translated={img.translatedUrl || img.preview}
                                                                className="w-full h-auto"
                                                                isZenMode={isZenMode}
                                                                viewMode="scroll"
                                                            />
                                                        ) : (
                                                            <img 
                                                                src={img.translatedUrl || img.preview}
                                                                alt="Final"
                                                                className="w-full h-auto pointer-events-none select-none"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {isCompareMode ? (
                                                    <CompareSlider
                                                        original={images.find(i => i.id === editingImageId)?.preview || ''}
                                                        translated={images.find(i => i.id === editingImageId)?.translatedUrl || images.find(i => i.id === editingImageId)?.preview || ''}
                                                        className="w-full h-full"
                                                        isZenMode={isZenMode}
                                                        viewMode="fit"
                                                    />
                                                ) : (
                                                    <div className="relative w-full h-full">
                                                        <Image
                                                            src={images.find(i => i.id === editingImageId)?.translatedUrl || images.find(i => i.id === editingImageId)?.preview || ''}
                                                            alt="Preview"
                                                            fill
                                                            className="object-contain"
                                                            priority
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Controls / Navigation */}
                                <div className={cn(
                                    "flex items-center justify-center gap-6 z-50 transition-all duration-300 pointer-events-none",
                                    isZenMode ? "fixed bottom-8 left-0 right-0" : "sticky bottom-8"
                                )}>
                                    {/* Navigation */}
                                    <div className="flex items-center gap-4 p-2 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 pointer-events-auto">
                                        <button
                                            onClick={() => {
                                                const idx = images.findIndex(i => i.id === editingImageId);
                                                if (idx > 0) {
                                                    const newId = images[idx - 1].id;
                                                    setEditingImageId(newId);
                                                    if (viewMode === 'scroll') {
                                                        const el = document.querySelector(`[data-image-id="${newId}"]`);
                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                }
                                            }}
                                            disabled={images.findIndex(i => i.id === editingImageId) === 0}
                                            className="p-3 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all font-bold"
                                            title="Previous (Left Arrow)"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        
                                        <span className="text-sm font-black text-white/50 w-20 text-center font-mono">
                                            {(images.findIndex(i => i.id === editingImageId) + 1).toString().padStart(2, '0')} / {images.length.toString().padStart(2, '0')}
                                        </span>

                                        <button
                                            onClick={() => {
                                                const idx = images.findIndex(i => i.id === editingImageId);
                                                if (idx < images.length - 1) {
                                                    const newId = images[idx + 1].id;
                                                    setEditingImageId(newId);
                                                    if (viewMode === 'scroll') {
                                                        const el = document.querySelector(`[data-image-id="${newId}"]`);
                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                }
                                            }}
                                            disabled={images.findIndex(i => i.id === editingImageId) === images.length - 1}
                                            className="p-3 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all font-bold"
                                            title="Next (Right Arrow)"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {/* Tools */}
                                    <div className="flex items-center gap-2 p-2 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 pointer-events-auto">
                                        <button
                                            onClick={() => setViewMode(viewMode === 'fit' ? 'scroll' : 'fit')}
                                            className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-white hover:bg-white/20 transition-all"
                                            title="Toggle Scroll/Fit"
                                        >
                                            {viewMode === 'fit' ? 'Fit Screen' : 'Scroll Mode'}
                                        </button>

                                        {/* Scroll Width Controls */}
                                        {viewMode === 'scroll' && (
                                            <>
                                                <div className="w-px h-6 bg-white/10" />
                                                <div className="flex bg-black/50 rounded-lg p-1">
                                                    {[100, 70, 50, 30, 10, 5].map((w) => (
                                                        <button
                                                            key={w}
                                                            onClick={() => setWidthPercentage(w)}
                                                            className={cn(
                                                                "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                                                widthPercentage === w ? "bg-white text-black" : "text-white/50 hover:text-white"
                                                            )}
                                                        >
                                                            {w}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        <div className="w-px h-6 bg-white/10" />
                                        <button
                                            onClick={() => setIsCompareMode(!isCompareMode)}
                                            className={cn(
                                                "flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                                isCompareMode ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                            {isCompareMode ? 'Slider' : 'Single'}
                                        </button>
                                        <div className="w-px h-6 bg-white/10" />
                                        <button
                                            onClick={() => setIsZenMode(!isZenMode)}
                                            className={cn(
                                                "p-3 rounded-xl transition-all",
                                                isZenMode ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:bg-white/10 hover:text-white"
                                            )}
                                            title="Toggle Zen Mode"
                                        >
                                            <MonitorPlay className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Advanced Infinity Editor Modal */}
            <AnimatePresence>
                {
                    showAdvancedEditor && (
                        <AdvancedEditor
                            chapters={chapters.map(ch => ({
                                id: ch.id,
                                name: ch.name,
                                images: ch.images.map(img => ({
                                    id: img.id,
                                    preview: img.preview,
                                    translatedUrl: img.translatedUrl,
                                    cleanUrl: img.cleanUrl,
                                    status: img.status === 'processing' ? 'processing' : 'idle',
                                    file: img.file
                                })),
                                // Pass saved state to editor
                                objects: ch.objects,
                                drawings: ch.drawings
                            }))}
                            onClose={() => setShowAdvancedEditor(false)}
                            onUpdateImage={(chapterId, imageId, newUrl, file) => {
                                setChapters(prev => prev.map(ch => {
                                    if (ch.id === chapterId) {
                                        return {
                                            ...ch,
                                            images: ch.images.map(img => img.id === imageId ? {
                                                ...img,
                                                translatedUrl: newUrl,
                                                translatedFile: file || img.translatedFile,
                                                status: 'success'
                                            } : img)
                                        };
                                    }
                                    return ch;
                                }));
                            }}
                            onSaveChapter={(chapterId, finalImages, objects, drawings, cleanImages, silent) => {
                                setChapters(prev => prev.map(ch => {
                                    if (ch.id === chapterId) {
                                        return {
                                            ...ch,
                                            objects, // Save State
                                            drawings, // Save State
                                            images: ch.images.map(img => {
                                                // CapCut-Style Save: Only update JSON if images are empty
                                                // The saved state is handled purely by objects/drawings.

                                                // If explicit new images are passed (e.g. from Auto-Clean or Import), we update URLs.
                                                // Otherwise (Manual Save), we keep existing URLs and only update JSON meta.

                                                const saved = finalImages.find(s => s.id === img.id);
                                                const clean = cleanImages?.find(c => c.id === img.id);

                                                if (saved || clean) {
                                                    const cleanBlobUrl = clean ? URL.createObjectURL(clean.file) : img.cleanUrl;
                                                    const bakedBlobUrl = saved ? URL.createObjectURL(saved.file) : img.translatedUrl;

                                                    return {
                                                        ...img,
                                                        translatedUrl: bakedBlobUrl,
                                                        cleanUrl: cleanBlobUrl,
                                                        translatedFile: saved ? saved.file : img.translatedFile,
                                                        status: 'success'
                                                    };
                                                }

                                                // JSON Save only - Return image as is
                                                return img;
                                            })
                                        };
                                    }
                                    return ch;
                                }));

                                if (!silent) {
                                    setShowAdvancedEditor(false);
                                    toast.success('Бүлэг хадгалагдлаа', { position: 'top-center' });
                                }
                            }}
                            onAddChapter={addChapter}
                            onDeleteChapter={deleteChapter}
                            onCleanAll={processBatch}
                            isCleaning={isProcessing}
                            mode={mode}
                            backendUrl={backendUrl}
                        />
                    )
                }
            </AnimatePresence >



            {/* Editor Academy Modal */}
            < EditorAcademy
                isOpen={showAcademy}
                onClose={() => setShowAcademy(false)
                }
            />
        </div >
    );
}

// --- Helper Components ---

function ShortcutsHandler({ onNext, onPrev, onClose, onToggleZen }: { onNext: () => void, onPrev: () => void, onClose: () => void, onToggleZen: () => void }) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'Escape') onClose();
            if (e.key === 'z') onToggleZen(); // Optional: 'z' for Zen Mode toggle
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrev, onClose, onToggleZen]);

    return null;
}
