"use client";


import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, Image as ImageIcon, Save, Trash2, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { SortableChapterList } from "@/components/admin/SortableChapterList";
import { compressImage } from "@/lib/image-compression";
import { deleteChapterAction, reorderChaptersAction } from "@/app/actions/webtoon-actions";

export default function EditWebtoonPage() {
    const router = useRouter();
    const params = useParams();
    const [webtoonId, setWebtoonId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");

    const [formData, setFormData] = useState({
        title: "",
        author: "",
        description: "",
        rating: "5.0",
        image: "",
        genres: "",
        is_new: true,
        is_nsfw: false,
        chapter_count_label: "",
        free_chapters: 1,
        hero_position: 20,
        status: "Ongoing"
    });

    const [chapters, setChapters] = useState<any[]>([]);

    useEffect(() => {
        if (params?.id) {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            setWebtoonId(id);
            fetchWebtoon(id);
            fetchChapters(id);
        }
    }, [params]);

    async function fetchWebtoon(id: string) {
        setLoading(true);
        console.log("Fetching webtoon with ID:", id);

        const { data, error } = await supabase
            .from('webtoons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching webtoon:", error);
            alert("Error: " + error.message);
            router.push("/admin/webtoons");
            return;
        }

        if (data) {
            setFormData({
                title: data.title,
                author: data.author,
                description: data.description || "",
                rating: String(data.rating),
                image: data.image || "",
                genres: data.genres ? data.genres.join(', ') : "",
                is_new: data.is_new,
                is_nsfw: data.is_nsfw || false,
                chapter_count_label: data.chapter_count_label || "",
                free_chapters: data.free_chapters || 1,
                hero_position: data.hero_position || 20,
                status: data.status || "Ongoing"
            });
            if (data.image) setPreview(data.image);
        } else {
            alert("Вэбтүүн олдсонгүй!");
            router.push("/admin/webtoons");
        }
        setLoading(false);
    }

    async function fetchChapters(id: string) {
        const { data, error } = await supabase
            .from('chapters')
            .select('*')
            .eq('webtoon_id', id)
            .order('order_index', { ascending: false }); // Show newest first by default in admin

        if (data) {
            // Sort by order_index descending (default admin view)
            const sorted = [...data].sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));
            setChapters(sorted);
        }
    }

    async function handleReorder(newOrder: any[]) {
        setChapters(newOrder);
        
        // Prepare updates for database
        // We set order_index based on position in array. 
        // If we want newest first, the first item in array (index 0) gets highest order_index.
        const total = newOrder.length;
        const updates = newOrder.map((c, idx) => ({
            id: c.id,
            order_index: total - idx // Highest index at the top
        }));

        const result = await reorderChaptersAction(updates);
        if (result.success) {
            toast.success("Дараалал шинэчлэгдлээ");
        } else {
            toast.error("Дараалал хадгалахад алдаа гарлаа: " + result.error);
        }
    }

    async function handleDeleteChapter(chapterId: number) {
        if (!confirm("Та энэ бүлгийг устгахдаа итгэлтэй байна уу?")) return;

        const result = await deleteChapterAction(chapterId, Number(webtoonId));

        if (!result.success) {
            toast.error("Алдаа гарлаа: " + result.error);
        } else {
            toast.success("Бүлэг устгагдлаа!");
            setChapters(chapters.filter(c => c.id !== chapterId));
            // Reload webtoon to see updated count label if needed
            if (webtoonId) fetchWebtoon(String(webtoonId));
        }
    }

    async function handleBulkDelete(ids: number[]) {
        if (!confirm(`Are you sure you want to delete ${ids.length} chapters?`)) return;

        setSaving(true);
        try {
            for (const id of ids) {
                await deleteChapterAction(id, Number(webtoonId));
            }
            toast.success("Chapters deleted successfully!");
            setChapters(chapters.filter(c => !ids.includes(c.id)));
            if (webtoonId) fetchWebtoon(String(webtoonId));
        } catch (err: any) {
            toast.error("Error deleting chapters: " + err.message);
        } finally {
            setSaving(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let imageUrl = formData.image;

            // 1. Upload new image to Cloudflare R2 if selected
            if (file) {
                console.log("[EDIT] Step 1: Uploading new image...");
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                console.log("[EDIT] Step 2: Compressing image...");
                const compressed = await compressImage(file);
                console.log("[EDIT] Step 3: Compressed, size:", compressed.size);

                const arrayBuffer = await compressed.arrayBuffer();
                console.log("[EDIT] Step 4: ArrayBuffer ready, size:", arrayBuffer.byteLength);

                const { uploadToR2 } = await import("@/lib/r2");
                console.log("[EDIT] Step 5: Calling uploadToR2...");
                const result = await uploadToR2(arrayBuffer, filePath, file.type);
                console.log("[EDIT] Step 6: Upload result:", result);
                if (!result.success) throw new Error(result.error || "R2 Upload failed");
                imageUrl = result.url!;
            } else {
                console.log("[EDIT] No new image, skipping upload");
            }

            if (!webtoonId) {
                toast.error("ID олдсонгүй (Refresh хийнэ үү)");
                return;
            }

            // 2. Update Record
            console.log("[EDIT] Step 7: Calling server action updateWebtoonAction...", webtoonId);

            const resultAction = await (await import("@/app/actions/webtoon-actions")).updateWebtoonAction({
                id: Number(webtoonId),
                title: formData.title,
                author: formData.author,
                description: formData.description,
                rating: parseFloat(formData.rating),
                image: imageUrl,
                genres: formData.genres.split(',').map(g => {
                    const trimmed = g.trim();
                    if (!trimmed) return "";
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
                }).filter(Boolean),
                is_new: formData.is_new,
                is_nsfw: formData.is_nsfw,
                free_chapters: formData.free_chapters,
                hero_position: formData.hero_position,
                status: formData.status
            });

            if (!resultAction.success) {
                throw new Error(resultAction.error || "Server action failed");
            }

            console.log("[EDIT] Step 8: Success from Server Action!");
            toast.success("Амжилттай хадгалагдлаа!");
            router.push("/admin/webtoons");
        } catch (error: any) {
            console.error(error);
            toast.error("Алдаа гарлаа: " + error.message);
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
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Засварлах</h2>
                    <p className="text-muted">Вэбтүүний мэдээллийг шинэчлэх</p>
                </div>
            </header>

            <div className="space-y-12">
                <div className="space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center border-dashed group cursor-pointer relative overflow-hidden transition-all hover:bg-white/5 hover:border-primary/50">
                            <label htmlFor="cover-edit-upload" className="absolute inset-0 cursor-pointer z-10" />
                            <input
                                id="cover-edit-upload"
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            {preview ? (
                                <div className="relative w-full h-64 flex items-center justify-center">
                                    <img src={preview} className="h-full object-contain rounded-xl" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold">
                                        Зураг солих
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted group-hover:text-primary transition-colors">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-sm">Cover зураг оруулах</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Гарчиг</label>
                                    <input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Зохиолч</label>
                                    <input
                                        value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted">Тайлбар</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Төрөл (Таслалаар)</label>
                                    <input
                                        value={formData.genres}
                                        onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                    />
                                </div>
                                <div className="space-y-4 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_new}
                                                onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-muted group-hover:text-white transition-colors">Шинэ вэбтүүн (NEW)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_nsfw}
                                                onChange={(e) => setFormData({ ...formData, is_nsfw: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-muted group-hover:text-white transition-colors">Насанд хүрэгчдэд (NSFW)</span>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Үнэлгээ</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={formData.rating}
                                        onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Үнэгүй бүлгийн тоо</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.free_chapters}
                                        onChange={(e) => setFormData({ ...formData, free_chapters: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                    />
                                    <p className="text-[10px] text-muted italic">Эхний хэдэн бүлэг үнэ төлбөргүй байхыг тодорхойлно.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted">Статус</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white appearance-none cursor-pointer"
                                    >
                                        <option value="Ongoing">Гарч байгаа (Ongoing)</option>
                                        <option value="Completed">Дууссан (Completed)</option>
                                        <option value="Hiatus">Завсарлага (Hiatus)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Hero Preview & Positioning */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted">Hero Байршил (Preview)</h3>
                                <div className="px-3 py-1 bg-primary/10 rounded-lg text-primary text-xs font-bold">
                                    Focus: {formData.hero_position}%
                                </div>
                            </div>

                            <div className="relative h-64 lg:h-80 w-full overflow-hidden bg-black rounded-2xl border border-white/10 group">
                                {/* Blurred Background Layer */}
                                <img
                                    src={preview || formData.image}
                                    className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110"
                                />
                                {/* Foreground Sharper Layer with controllable focus */}
                                <div className="absolute inset-0 flex items-start justify-center">
                                    <img
                                        src={preview || formData.image}
                                        className="w-full h-full object-cover transition-all duration-300"
                                        style={{ objectPosition: `center ${formData.hero_position}%` }}
                                    />
                                </div>
                                {/* Gradients to simulate the real detail page */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#141414]" />
                                <div className="absolute inset-x-0 bottom-0 p-6">
                                    <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl">
                                        {formData.title || "Зохиолын нэр"}
                                    </h1>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-widest">
                                    <span>Top (Дээд тал)</span>
                                    <span>Bottom (Доод тал)</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formData.hero_position}
                                    onChange={(e) => setFormData({ ...formData, hero_position: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[10px] text-muted text-center italic">Дүрүүдийн нүүр хэсгийг төвлөрүүлж тааруулна уу</p>
                            </div>
                        </div>

                        <button
                            disabled={saving}
                            className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Хадгалах
                        </button>
                    </form>
                </div>

                {/* Chapters List */}
                <div className="border-t border-white/10 pt-12 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Бүлгүүд</h3>
                            <p className="text-muted text-sm">Энэ вэбтүүний бүх бүлгүүд</p>
                        </div>
                        <span className="px-4 py-2 rounded-full bg-white/5 text-sm font-bold">
                            Нийт: {chapters.length}
                        </span>
                    </div>

                    <SortableChapterList
                        chapters={chapters}
                        onReorder={handleReorder}
                        onDelete={handleBulkDelete}
                    />

                    <button
                        onClick={() => {
                            const nextChapterNum = chapters.length + 1;
                            router.push(`/admin/chapters/new?webtoonId=${webtoonId}&next=${nextChapterNum}`);
                        }}
                        className="w-full py-6 rounded-3xl border-2 border-dashed border-white/10 text-muted font-black text-lg uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    >
                        + Шинэ бүлэг нэмэх
                    </button>
                </div>
            </div>
        </div>
    );
}
