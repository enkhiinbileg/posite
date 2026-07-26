"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, Image as ImageIcon, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TagInput } from "@/components/admin/TagInput";
import { compressImage } from "@/lib/image-compression";

export default function CreateWebtoonPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");

    const [existingGenres, setExistingGenres] = useState<string[]>([]);

    useEffect(() => {
        async function fetchGenres() {
            const { data } = await supabase.from('webtoons').select('genres');
            if (data) {
                const uniqueGenres = Array.from(new Set(data.flatMap(w => w.genres || [])));
                setExistingGenres(uniqueGenres.sort());
            }
        }
        fetchGenres();
    }, []);

    const [formData, setFormData] = useState({
        title: "",
        author: "",
        description: "",
        rating: "5.0",
        genres: [] as string[],
        is_new: true,
        is_nsfw: false,
        free_chapters: 1,
        hero_position: 20,
        status: "Ongoing"
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !formData.title || !formData.author) {
            toast.error("Мэдээллийг гүйцэд оруулна уу!");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image to Cloudflare R2
            console.log("[CREATE] Step 1: Starting image upload...");
            const fileExt = file.name.split('.').pop();
            const fileName = `cover-${Date.now()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            console.log("[CREATE] Step 2: Compressing image...");
            const compressed = await compressImage(file);
            console.log("[CREATE] Step 3: Compressed, size:", compressed.size, "bytes");

            const arrayBuffer = await compressed.arrayBuffer();
            console.log("[CREATE] Step 4: ArrayBuffer ready, size:", arrayBuffer.byteLength);

            console.log("[CREATE] Step 5: Importing uploadToR2...");
            const { uploadToR2 } = await import("@/lib/r2");
            console.log("[CREATE] Step 6: Calling uploadToR2...");
            const result = await uploadToR2(arrayBuffer, filePath, file.type);
            console.log("[CREATE] Step 7: Upload result:", result);

            if (!result.success) {
                throw new Error(result.error || "R2 руу зураг байршуулахад алдаа гарлаа");
            }

            const imageUrl = result.url!;

            // 2. Insert Record
            console.log("[CREATE] Step 8: Calling server action createWebtoonAction...");

            const resultAction = await (await import("@/app/actions/webtoon-actions")).createWebtoonAction({
                title: formData.title,
                author: formData.author,
                description: formData.description,
                rating: parseFloat(formData.rating),
                image: imageUrl,
                genres: formData.genres.map(g => g.trim().charAt(0).toUpperCase() + g.trim().slice(1).toLowerCase()),
                is_new: formData.is_new,
                is_nsfw: formData.is_nsfw,
                free_chapters: formData.free_chapters,
                hero_position: formData.hero_position,
                chapter_count_label: "0 Бүлэг",
                status: formData.status
            });

            if (!resultAction.success) {
                throw new Error(resultAction.error || "Server action failed");
            }

            console.log("[CREATE] Step 9: Success from Server Action!");
            toast.success("Амжилттай нэмэгдлээ!");
            router.push("/admin");
        } catch (error: any) {
            console.error(error);
            toast.error("Алдаа гарлаа: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 md:px-0">
            <header className="mb-8 flex flex-col gap-4">
                <button
                    onClick={() => router.back()}
                    className="self-start text-xs font-bold uppercase tracking-widest text-muted hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Буцах
                </button>
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Шинэ Вэбтүүн</h2>
                    <p className="text-muted">Вэбтүүний үндсэн мэдээллийг оруулах</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 pb-20">
                {/* Image Upload */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center border-dashed group cursor-pointer relative overflow-hidden transition-all hover:bg-white/5 hover:border-primary/50 text-center">
                    <label htmlFor="cover-upload" className="absolute inset-0 w-full h-full cursor-pointer z-10" />
                    <input
                        id="cover-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    {preview ? (
                        <div className="relative w-full max-w-[200px] md:max-w-xs aspect-[2/3] group-hover:scale-105 transition-transform duration-500 shadow-2xl rounded-xl overflow-hidden">
                            <img src={preview} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white space-y-2">
                                <Upload className="w-8 h-8 text-primary animate-bounce" />
                                <span className="font-bold uppercase tracking-widest text-sm">Зураг солих</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-8">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                                <ImageIcon className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-black text-lg uppercase tracking-tight">Cover зураг оруулах</p>
                                <p className="text-sm text-muted">JPEG, PNG (Max 5MB)</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-surface border border-white/5 rounded-3xl p-5 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Гарчиг</label>
                            <input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Solo Leveling..."
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Зохиолч</label>
                            <input
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                placeholder="AUTHOR NAME"
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Тайлбар</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Зохиолын товч утга..."
                            className="w-full h-32 bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Төрөл</label>
                            <TagInput
                                value={formData.genres}
                                onChange={(tags) => setFormData({ ...formData, genres: tags })}
                                placeholder="ACTION, FANTASY..."
                                suggestions={['ACTION', 'ROMANCE', 'FANTASY', 'DRAMA', 'COMEDY', 'THRILLER', 'HORROR', 'HISTORICAL', 'SPORTS', 'SCHOOL', 'MYSTERY', ...existingGenres]}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Үнэлгээ</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.rating}
                                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Үнэгүй бүлэг</label>
                            <input
                                type="number"
                                value={formData.free_chapters}
                                onChange={(e) => setFormData({ ...formData, free_chapters: parseInt(e.target.value) })}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Статус</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-base md:text-sm focus:outline-none focus:border-primary/50 transition-all text-white appearance-none cursor-pointer"
                            >
                                <option value="Ongoing">Гарч байгаа (Ongoing)</option>
                                <option value="Completed">Дууссан (Completed)</option>
                                <option value="Hiatus">Завсарлага (Hiatus)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
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

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">Hero Байршил (Focus)</label>
                            <span className="text-primary font-bold text-xs">{formData.hero_position}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.hero_position}
                            onChange={(e) => setFormData({ ...formData, hero_position: parseInt(e.target.value) })}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-[10px] text-muted text-center italic">Зохиолын нүүр хэсэг харагдах байршлыг тааруулна (Default: 20%)</p>
                    </div>
                </div>

                <div className="sticky bottom-4 md:static">
                    <button
                        disabled={loading}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Вэбтүүн Үүсгэх
                    </button>
                </div>
            </form>
        </div>
    );
}
