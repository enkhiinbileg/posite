"use client";


import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, Trash2, ArrowLeft, GripVertical, Upload, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";

export default function EditChapterPage() {
    const router = useRouter();
    const params = useParams();
    const [chapterId, setChapterId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [webtoonTitle, setWebtoonTitle] = useState("");
    const [title, setTitle] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // For new uploads
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [allMods, setAllMods] = useState<any[]>([]);
    const [selectedModId, setSelectedModId] = useState<string>("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        if (params?.id) {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            setChapterId(id);
            fetchChapter(id);
        }
    }, [params]);

    async function fetchChapter(id: string) {
        setLoading(true);
        const { data: chapter, error } = await supabase
            .from('chapters')
            .select('*, webtoons(title)')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching chapter:", error);
            alert("Error: " + error.message);
            router.back();
            return;
        }

        if (chapter) {
            setTitle(chapter.title);
            setImages(chapter.images || []);
            setSelectedModId(chapter.translator_id || "");
            // @ts-ignore
            setWebtoonTitle(chapter.webtoons?.title || "");
        }

        // Fetch moderators
        const { data: mods } = await supabase
            .from('profiles')
            .select('id, username, email')
            .or('is_moderator.eq.true,is_translator.eq.true,is_admin.eq.true');
        setAllMods(mods || []);

        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) setCurrentUserId(userData.user.id);

        setLoading(false);
    }

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewFiles([...newFiles, ...files]);

            const previews = files.map(f => URL.createObjectURL(f));
            setNewPreviews([...newPreviews, ...previews]);
        }
    };

    const removeNewFile = (index: number) => {
        const files = [...newFiles];
        files.splice(index, 1);
        setNewFiles(files);

        const previews = [...newPreviews];
        previews.splice(index, 1);
        setNewPreviews(previews);
    };

    const removeExistingImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalImages = [...images];

            // Upload new files to Cloudflare R2
            for (const file of newFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `chapters/${chapterId}/${fileName}`;

                const { uploadToR2 } = await import("@/lib/r2");
                const arrayBuffer = await file.arrayBuffer();
                const result = await uploadToR2(arrayBuffer, filePath, file.type);
                if (!result.success) throw new Error(result.error || "R2 Upload failed");
                finalImages.push(result.url!);
            }

            // Update Chapter
            const { data: updateData, error: updateError } = await supabase
                .from('chapters')
                .update({
                    title: title,
                    images: finalImages,
                    translator_id: selectedModId,
                    created_by: selectedModId // Keep consistent
                })
                .eq('id', chapterId)
                .select(); // Add select() to get returned data

            if (updateError) throw updateError;

            if (!updateData || updateData.length === 0) {
                throw new Error("Update succeeded but no rows were modified! Check permissions.");
            }

            toast.success("Бүлэг амжилттай шинэчлэгдлээ!");

            // Clear new files state
            setNewFiles([]);
            setNewPreviews([]);
            // Update images state to reflect result
            setImages(finalImages);

            router.refresh(); // Refresh server components to ensure data consistency

        } catch (error: any) {
            console.error(error);
            toast.error("Алдаа: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <header className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Бүлэг Засах</h2>
                    <p className="text-muted">{webtoonTitle} - {title}</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Title */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Бүлгийн гарчиг</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                        />
                    </div>

                    {allMods.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Хариуцсан Модератор (Тайланд орох)</label>
                            <select
                                value={selectedModId}
                                onChange={(e) => setSelectedModId(e.target.value)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                            >
                                <option value="">-- Сонгох --</option>
                                {allMods.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.username || m.email} {m.id === currentUserId ? "(Би)" : ""}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted italic mt-1">Тайлангийн системд энэ хүний нэр дээр бүртгэгдэнэ.</p>
                        </div>
                    )}
                </div>

                {/* Images Reorder Area */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold">Зургийн дараалал</h3>
                        <p className="text-xs text-muted">Зургийг чирч зөөх боломжтой</p>
                    </div>

                    <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
                        {images.map((src, index) => (
                            <Reorder.Item key={src} value={src}>
                                <div className="flex items-center gap-4 p-3 bg-background border border-white/10 rounded-xl group hover:border-primary/50 cursor-grab active:cursor-grabbing">
                                    <div className="p-2 text-muted group-hover:text-primary">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div 
                                        className="w-12 h-16 bg-black/50 rounded overflow-hidden shrink-0 cursor-zoom-in hover:ring-2 hover:ring-primary transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage(src);
                                        }}
                                    >
                                        <img src={src} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs text-muted truncate">{src.split('/').pop()}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(index)}
                                        className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>

                    {images.length === 0 && (
                        <div className="text-center py-8 text-muted text-sm border-2 border-dashed border-white/10 rounded-xl">
                            Зураг байхгүй байна.
                        </div>
                    )}
                </div>

                {/* Add New Images */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Шинэ зураг нэмэх</label>
                        <span className="text-xs font-bold text-primary">{newFiles.length} зураг сонгогдсон</span>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {newPreviews.map((src, idx) => (
                            <div key={idx} className="relative aspect-[2/3] rounded-lg overflow-hidden group border border-white/10">
                                <img 
                                    src={src} 
                                    className="w-full h-full object-cover cursor-zoom-in" 
                                    onClick={() => setPreviewImage(src)}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeNewFile(idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}

                        <label className="border-2 border-dashed border-white/10 rounded-lg aspect-[2/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all text-muted hover:text-white">
                            <Upload className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">Нэмэх</span>
                            <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="sticky bottom-6">
                    <button
                        disabled={saving}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/50 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Өөрчлөлтийг хадгалах
                    </button>
                </div>
            </form>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-sm cursor-zoom-out"
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-2 font-bold"
                            >
                                <X className="w-6 h-6" />
                                Хаах
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
