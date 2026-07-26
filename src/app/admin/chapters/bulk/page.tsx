"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, Save, X, Trash2, ChevronLeft, FolderOpen, CheckCircle2, AlertCircle, Eye, ImageIcon, GripVertical, MonitorPlay, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import WebtoonSearchSelector from "@/components/admin/WebtoonSearchSelector";

// Helper to revoke URLs
const revokeURLs = (urls: string[]) => {
    urls.forEach(url => URL.revokeObjectURL(url));
};

interface BulkChapter {
    id: string;
    folderName: string;
    chapterNumber: number;
    title: string;
    files: {
        id: string;
        file: File;
        preview: string;
    }[];
    status: 'idle' | 'processing' | 'uploading' | 'completed' | 'error';
    progress: number;
    error?: string;
    validationErrors: string[];
}

export default function BulkUploadPage() {
    const router = useRouter();
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedWebtoon, setSelectedWebtoon] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [allMods, setAllMods] = useState<any[]>([]);
    const [selectedModId, setSelectedModId] = useState<string>("");

    const [chapters, setChapters] = useState<BulkChapter[]>([]);
    const [previewChapterId, setPreviewChapterId] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewScale, setPreviewScale] = useState(50);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const readerScrollRef = useRef<HTMLDivElement>(null);

    const openPreview = (chapterId: string) => {
        setPreviewChapterId(chapterId);
    };

    const closePreview = () => {
        setPreviewChapterId(null);
    };

    const removeImageFromChapter = (chapterId: string, index: number) => {
        setChapters(prev => {
            const newList = prev.map(c => {
                if (c.id === chapterId) {
                    const newFiles = [...c.files];
                    const removed = newFiles.splice(index, 1)[0];
                    if (removed.preview) URL.revokeObjectURL(removed.preview);
                    return { ...c, files: newFiles };
                }
                return c;
            });
            return validateList(newList);
        });
    };

    const handleReorderImages = (chapterId: string, newFiles: any[]) => {
        setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, files: newFiles } : c));
    };

    // Helper to re-validate a whole list
    const validateList = (list: BulkChapter[]) => {
        return list.map(chapter => {
            const errors: string[] = [];
            if (chapter.chapterNumber <= 0) errors.push("Бүлгийн дугаар буруу байна");
            if (chapter.files.length === 0) errors.push("Зураг олдсонгүй");
            const isDuplicate = list.filter(c => c.chapterNumber === chapter.chapterNumber && c.id !== chapter.id).length > 0;
            if (isDuplicate) errors.push("Бүлгийн дугаар давхардаж байна");
            return { ...chapter, validationErrors: errors };
        });
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (chapters.length > 0 && !submitting) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [chapters, submitting]);

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) setUserId(userData.user.id);

                const { data: webtoonData } = await supabase.from('webtoons').select('id, title, image, is_nsfw').order('title');
                setWebtoons(webtoonData || []);

                const { data: mods } = await supabase
                    .from('profiles')
                    .select('id, username, email')
                    .or('is_moderator.eq.true,is_translator.eq.true,is_admin.eq.true');
                setAllMods(mods || []);
                
                if (userData.user) setSelectedModId(userData.user.id);
            } catch (err) {
                toast.error("Мэдээлэл татахад алдаа гарлаа");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const chapterMap: Record<string, File[]> = {};

        files.forEach((file: any) => {
            const path = file.webkitRelativePath || "";
            const parts = path.split('/');
            if (parts.length >= 2) {
                const folderName = parts[parts.length - 2];
                if (!chapterMap[folderName]) chapterMap[folderName] = [];
                chapterMap[folderName].push(file);
            }
        });

        const newChapters: BulkChapter[] = Object.entries(chapterMap).map(([folderName, files]) => {
            files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            const numMatch = folderName.match(/(\d+(\.\d+)?)/);
            const chapterNum = numMatch ? parseFloat(numMatch[1]) : 0;

            const chapterFiles = files.map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                preview: URL.createObjectURL(f)
            }));

            return {
                id: Math.random().toString(36).substr(2, 9),
                folderName,
                chapterNumber: chapterNum,
                title: folderName,
                files: chapterFiles,
                status: 'idle',
                progress: 0,
                validationErrors: []
            };
        });

        // Sort chapters by number
        newChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
        
        validateAndSetChapters(newChapters);
        toast.success(`${newChapters.length} бүлэг илрүүллээ`);
    };

    const validateAndSetChapters = (list: BulkChapter[]) => {
        const validated = list.map(chapter => {
            const errors: string[] = [];
            if (chapter.chapterNumber <= 0) errors.push("Бүлгийн дугаар буруу байна");
            if (chapter.files.length === 0) errors.push("Зураг олдсонгүй");
            
            // Check for duplicate numbers
            const isDuplicate = list.filter(c => c.chapterNumber === chapter.chapterNumber && c.id !== chapter.id).length > 0;
            if (isDuplicate) errors.push("Бүлгийн дугаар давхардаж байна");

            return { ...chapter, validationErrors: errors };
        });
        setChapters(validated);
    };

    const removeChapter = (id: string) => {
        setChapters(prev => {
            const newList = prev.filter(c => c.id !== id);
            // Re-validate after removal (especially for duplicates)
            return newList.map(chapter => {
                const errors: string[] = [];
                if (chapter.chapterNumber <= 0) errors.push("Бүлгийн дугаар буруу байна");
                if (chapter.files.length === 0) errors.push("Зураг олдсонгүй");
                const isDuplicate = newList.filter(c => c.chapterNumber === chapter.chapterNumber && c.id !== chapter.id).length > 0;
                if (isDuplicate) errors.push("Бүлгийн дугаар давхардаж байна");
                return { ...chapter, validationErrors: errors };
            });
        });
    };

    const updateChapterInfo = (id: string, field: keyof BulkChapter, value: any) => {
        setChapters(prev => {
            const newList = prev.map(c => {
                if (c.id === id) {
                    let updated = { ...c, [field]: value };
                    if (field === 'chapterNumber') {
                        // If title is empty, matches folder name (default), or follows Chapter pattern
                        if (!c.title || c.title === c.folderName || c.title.startsWith("Chapter ")) {
                            updated.title = `Chapter ${value}`;
                        }
                    }
                    return updated;
                }
                return c;
            });
            // Re-validate
            return newList.map(chapter => {
                const errors: string[] = [];
                if (chapter.chapterNumber <= 0) errors.push("Бүлгийн дугаар буруу байна");
                if (chapter.files.length === 0) errors.push("Зураг олдсонгүй");
                const isDuplicate = newList.filter(c => c.chapterNumber === chapter.chapterNumber && c.id !== chapter.id).length > 0;
                if (isDuplicate) errors.push("Бүлгийн дугаар давхардаж байна");
                return { ...chapter, validationErrors: errors };
            });
        });
    };

    const startUpload = async () => {
        if (!selectedWebtoon) {
            toast.error("Вэбтүүн сонгоно уу");
            return;
        }
        if (chapters.length === 0) {
            toast.error("Бүлэг сонгогдоогүй байна");
            return;
        }

        const hasErrors = chapters.some(c => c.validationErrors.length > 0);
        if (hasErrors) {
            toast.error("Зарим бүлэгт алдаа байна. Шалгаад дахин оролдоно уу.");
            return;
        }

        setSubmitting(true);
        const { uploadToR2 } = await import("@/lib/r2");
        const { publishChapterAction } = await import("@/app/actions/webtoon-actions");

        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            
            try {
                // Update status to processing
                setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, status: 'processing' } : c));

                const imageUrls: string[] = new Array(chapter.files.length);
                const CONCURRENCY = 5; // Process 5 images at once
                let completedCount = 0;

                // Process in chunks to speed up significantly
                for (let j = 0; j < chapter.files.length; j += CONCURRENCY) {
                    const chunk = chapter.files.slice(j, j + CONCURRENCY);
                    
                    const chunkResults = await Promise.all(chunk.map(async (fileObj, chunkIdx) => {
                        const globalIdx = j + chunkIdx;
                        const file = fileObj.file;
                        
                        try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `ch-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                            const filePath = `chapters/${selectedWebtoon}/${fileName}`;

                            const compressed = await compressImage(file);
                            const arrayBuffer = await compressed.arrayBuffer();
                            
                            const result = await uploadToR2(arrayBuffer, filePath, compressed.type);
                            if (!result.success) throw new Error(result.error);

                            completedCount++;
                            const progress = Math.round((completedCount / chapter.files.length) * 100);
                            setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, status: 'uploading', progress } : c));

                            return { index: globalIdx, url: result.url };
                        } catch (e: any) {
                            throw new Error(`Хуудас ${globalIdx + 1} дээр алдаа: ${e.message}`);
                        }
                    }));

                    chunkResults.forEach(res => {
                        imageUrls[res.index] = res.url!;
                    });
                }

                // Final Title Construction
                let finalTitle = chapter.title;
                const lowerTitle = finalTitle.toLowerCase();
                if (!lowerTitle.startsWith('chapter') && !lowerTitle.startsWith('бүлэг')) {
                    finalTitle = `Chapter ${chapter.chapterNumber}${chapter.title !== chapter.chapterNumber.toString() ? ` - ${chapter.title}` : ""}`;
                }

                // Create Chapter in DB
                const resultAction = await publishChapterAction({
                    webtoon_id: Number(selectedWebtoon),
                    chapter_number: chapter.chapterNumber,
                    title: finalTitle,
                    images: imageUrls,
                    edit_state: null,
                    is_published: true,
                    translator_id: selectedModId || userId
                });

                if (!resultAction.success) throw new Error(resultAction.error || "DB-д хадгалахад алдаа");

                setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, status: 'completed', progress: 100 } : c));
                toast.success(`${chapter.folderName} амжилттай орлоо`);

            } catch (err: any) {
                console.error(err);
                setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, status: 'error', error: err.message } : c));
                toast.error(`${chapter.folderName} дээр алдаа гарлаа`);
                // Continue with next chapter? Or stop? 
                // Let's stop if there's a major error to let user fix it.
                // But for bulk, maybe continue is better. Let's continue.
            }
        }

        setSubmitting(false);
        toast.success("Бүх бүлгийг оруулах процесс дууслаа");
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-4 text-sm font-bold uppercase"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Буцах
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
                        Бүлэг <span className="text-primary">Багцаар Оруулах</span>
                    </h1>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card rounded-3xl p-8 space-y-6 border-white/5">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <WebtoonSearchSelector 
                                    webtoons={webtoons}
                                    selectedId={selectedWebtoon ? Number(selectedWebtoon) : null}
                                    onSelect={(id) => setSelectedWebtoon(id.toString())}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хариуцагч (Тайлан орох)</label>
                                <select
                                    value={selectedModId}
                                    onChange={(e) => setSelectedModId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none"
                                >
                                    {allMods.map(m => (
                                        <option key={m.id} value={m.id}>{m.username || m.email} {m.id === userId ? "(Би)" : ""}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                onChange={handleFolderSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group"
                            >
                                <FolderOpen className="w-8 h-8 text-muted group-hover:text-primary transition-colors" />
                                <span className="text-xs font-bold text-muted group-hover:text-white uppercase tracking-widest">Хавтас сонгох</span>
                            </button>
                        </div>

                        <button
                            onClick={startUpload}
                            disabled={submitting || chapters.length === 0}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-primary/20"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Оруулж байна...
                                </span>
                            ) : (
                                "Нийтлэж эхлэх"
                            )}
                        </button>
                    </div>

                    {/* Instruction Card */}
                    <div className="glass-card rounded-3xl p-6 border-white/5 bg-blue-500/5 space-y-4">
                        <div className="flex items-center gap-2 text-blue-400">
                            <AlertCircle className="w-5 h-5" />
                            <h4 className="text-xs font-black uppercase tracking-widest">Ашиглах заавар</h4>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">1</span>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    <strong className="text-white">Хавтасны бүтэц:</strong> Бүлэг бүрийг тусдаа хавтасанд хийнэ. (Жишээ нь: <code className="text-blue-300">Chapter 1</code>, <code className="text-blue-300">Chapter 2</code>)
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">2</span>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    <strong className="text-white">Файлын нэр:</strong> Зургуудыг дугаарлаж нэрлэсэн байх ёстой. (Жишээ нь: <code className="text-blue-300">01.jpg</code>, <code className="text-blue-300">02.jpg</code>)
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">3</span>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    <strong className="text-white">Сонгох:</strong> Хамгийн гадна талын үндсэн хавтасыг сонгоход доторх бүх бүлэг автоматаар илэрнэ.
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Chapter List */}
                <div className="lg:col-span-2 space-y-4">
                    {chapters.length === 0 ? (
                        <div className="h-[400px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-muted">
                            <Upload className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">Хавтас сонгож бүлгүүдийг илрүүлнэ үү</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-lg font-black uppercase tracking-tighter text-white">
                                    Илрүүлсэн бүлгүүд ({chapters.length})
                                </h3>
                                <button 
                                    onClick={() => setChapters([])}
                                    className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
                                >
                                    Бүгдийг арилгах
                                </button>
                            </div>
                            
                            <AnimatePresence>
                                {chapters.map((chapter, index) => (
                                    <motion.div
                                        key={chapter.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={`glass-card p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 items-center ${
                                            chapter.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 
                                            chapter.status === 'error' ? 'border-red-500/30 bg-red-500/5' : ''
                                        }`}
                                    >
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-muted">Бүлгийн дугаар</label>
                                                <input
                                                    type="number"
                                                    value={chapter.chapterNumber}
                                                    onChange={(e) => updateChapterInfo(chapter.id, 'chapterNumber', parseFloat(e.target.value) || 0)}
                                                    className={`w-full bg-white/5 border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary ${
                                                        chapter.validationErrors.some(e => e.includes("дугаар")) ? 'border-red-500/50' : 'border-white/10'
                                                    }`}
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[9px] font-black uppercase text-muted">Нэр</label>
                                                <input
                                                    type="text"
                                                    value={chapter.title}
                                                    onChange={(e) => updateChapterInfo(chapter.id, 'title', e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary"
                                                />
                                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">Нийтлэгдэх нэр:</span>
                                                    <span className="text-[9px] font-bold text-white/60">
                                                        {chapter.title.toLowerCase().startsWith('chapter') || chapter.title.toLowerCase().startsWith('бүлэг') 
                                                            ? chapter.title 
                                                            : `Chapter ${chapter.chapterNumber}${chapter.title !== chapter.chapterNumber.toString() ? ` - ${chapter.title}` : ""}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {chapter.validationErrors.length > 0 && (
                                            <div className="absolute top-2 right-12 flex flex-col items-end gap-1 pointer-events-none">
                                                {chapter.validationErrors.map((err, i) => (
                                                    <span key={i} className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg">
                                                        {err}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right">
                                                <p className="text-xl font-black text-white">{chapter.files.length}</p>
                                                <p className="text-[9px] font-black uppercase text-muted">Зураг</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => openPreview(chapter.id)}
                                                    className="p-3 rounded-xl hover:bg-white/10 text-muted hover:text-white transition-all"
                                                    title="Зургуудыг харах"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                
                                                {(chapter.status === 'idle' || chapter.status === 'error') && (
                                                    <button 
                                                        onClick={() => removeChapter(chapter.id)}
                                                        className="p-3 rounded-xl hover:bg-red-500/10 text-muted hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {chapter.status === 'processing' && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                                                {chapter.status === 'uploading' && (
                                                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                                )}
                                                {chapter.status === 'completed' && <CheckCircle2 className="w-8 h-8 text-green-500" />}
                                                {chapter.status === 'error' && (
                                                    <div className="group relative">
                                                        <AlertCircle className="w-8 h-8 text-red-500 cursor-help" />
                                                        <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-red-900 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            {chapter.error}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {chapter.status === 'uploading' && (
                                            <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300" style={{ width: `${chapter.progress}%` }} />
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewChapterId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closePreview}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-5xl max-h-full bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">
                                            {chapters.find(c => c.id === previewChapterId)?.folderName}
                                        </h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            Нийт {chapters.find(c => c.id === previewChapterId)?.files.length || 0} зураг
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsPreviewMode(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <MonitorPlay className="w-4 h-4" />
                                        Унших горим
                                    </button>
                                    <button
                                        onClick={closePreview}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <Reorder.Group
                                    axis="y"
                                    values={chapters.find(c => c.id === previewChapterId)?.files || []}
                                    onReorder={(newFiles) => {
                                        if (previewChapterId) {
                                            setChapters(prev => prev.map(c => c.id === previewChapterId ? { ...c, files: newFiles } : c));
                                        }
                                    }}
                                    className="space-y-3 max-w-3xl mx-auto pb-20"
                                >
                                    {(chapters.find(c => c.id === previewChapterId)?.files || []).map((img, i) => (
                                        <Reorder.Item
                                            key={img.id}
                                            value={img}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)" }}
                                            className="relative group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-primary/30 rounded-[24px] p-3 transition-colors flex items-center gap-5 backdrop-blur-md"
                                        >
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="p-2.5 bg-white/5 rounded-xl text-muted cursor-grab active:cursor-grabbing hover:text-white hover:bg-white/10 transition-all">
                                                    <GripVertical className="w-4 h-4" />
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[11px] font-black text-primary border border-primary/20 shadow-inner">
                                                    #{i + 1}
                                                </div>
                                            </div>

                                            <div 
                                                className="w-20 h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                                                onClick={() => setFullScreenImageUrl(img.preview)}
                                            >
                                                <img
                                                    src={img.preview}
                                                    alt={`Preview ${i + 1}`}
                                                    className="w-full h-full object-cover pointer-events-none select-none"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white/90 truncate group-hover:text-white transition-colors">
                                                    {img.file.name}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] text-muted uppercase tracking-widest font-black bg-white/5 px-2 py-0.5 rounded-md">
                                                        {(img.file.size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className="text-[10px] text-muted/50 font-bold italic">
                                                        {img.file.type.split('/')[1].toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pr-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (previewChapterId) removeImageFromChapter(previewChapterId, i);
                                                    }}
                                                    className="p-3 rounded-2xl bg-red-500/0 hover:bg-red-500 text-red-500/40 hover:text-white transition-all border border-transparent hover:border-red-500 shadow-lg hover:shadow-red-500/20"
                                                    title="Устгах"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Full Screen Image Viewer (Single) */}
            <AnimatePresence>
                {fullScreenImageUrl && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setFullScreenImageUrl(null)}
                            className="absolute inset-0 bg-black/95 backdrop-blur-xl cursor-zoom-out"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-full max-h-full flex flex-col items-center gap-4"
                        >
                            <img
                                src={fullScreenImageUrl}
                                alt="Full screen"
                                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10"
                            />
                            <button
                                onClick={() => setFullScreenImageUrl(null)}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Хаах
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reader Mode Previewer (Scrollable Strip) */}
            <AnimatePresence>
                {isPreviewMode && (
                    <div className="fixed inset-0 z-[200] flex flex-col bg-[#050505]">
                        {/* Header Controls */}
                        <motion.div 
                            initial={{ y: -100 }}
                            animate={{ y: 0 }}
                            exit={{ y: -100 }}
                            className="h-20 bg-black/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between shrink-0 z-10"
                        >
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">
                                        Хяналтын горим
                                    </h3>
                                    <h4 className="text-sm font-black text-primary truncate max-w-[200px]">
                                        {chapters.find(c => c.id === previewChapterId)?.folderName}
                                    </h4>
                                </div>
                                
                                <div className="h-8 w-px bg-white/5" />
                                
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Одоогийн хуудас</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-white">{currentPageIndex + 1}</span>
                                        <span className="text-white/20 text-xs font-bold">/</span>
                                        <span className="text-sm font-bold text-white/40">
                                            {chapters.find(c => c.id === previewChapterId)?.files.length || 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-8 w-px bg-white/5" />
                                
                                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                                    {[10, 30, 50, 70, 100].map(scale => (
                                        <button
                                            key={scale}
                                            onClick={() => setPreviewScale(scale)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${
                                                previewScale === scale ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-white'
                                            }`}
                                        >
                                            {scale}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsPreviewMode(false)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <X className="w-4 h-4" />
                                Гарах
                            </button>
                        </motion.div>

                        {/* Scrollable Area */}
                        <div 
                            ref={readerScrollRef}
                            onScroll={(e) => {
                                const container = e.currentTarget;
                                const children = container.firstChild?.childNodes as NodeListOf<HTMLElement>;
                                if (!children) return;

                                let activeIdx = 0;
                                const containerTop = container.scrollTop;
                                
                                for (let i = 0; i < children.length; i++) {
                                    if (children[i].offsetTop <= containerTop + 200) {
                                        activeIdx = i;
                                    } else {
                                        break;
                                    }
                                }
                                setCurrentPageIndex(activeIdx);
                            }}
                            className="flex-1 overflow-y-auto scroll-smooth scrollbar-none flex flex-col items-center py-20"
                        >
                            <div 
                                className="transition-all duration-500 ease-in-out"
                                style={{ width: `${previewScale}%` }}
                            >
                                {(chapters.find(c => c.id === previewChapterId)?.files || []).map((img, i) => (
                                    <div key={img.id} className="w-full relative group">
                                        <img
                                            src={img.preview}
                                            alt={`Page ${i + 1}`}
                                            className="w-full h-auto block"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            ХУУДАС #{i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
