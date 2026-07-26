"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Upload, Loader2, Save, Search, Monitor, Tablet, Smartphone } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { compressImage } from "@/lib/image-compression";

export default function NewBannerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [selectedWebtoon, setSelectedWebtoon] = useState<any>(null);
    const [imageDesktop, setImageDesktop] = useState<File | null>(null);
    const [imageMobile, setImageMobile] = useState<File | null>(null);
    const [previewDesktop, setPreviewDesktop] = useState<string | null>(null);
    const [previewMobile, setPreviewMobile] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        fetchWebtoons();
    }, []);

    async function fetchWebtoons() {
        const { data } = await supabase.from('webtoons').select('id, title, image');
        setWebtoons(data || []);
    }

    const filteredWebtoons = webtoons.filter(w =>
        w.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        // Cleanup previews on unmount
        return () => {
            if (previewDesktop) URL.revokeObjectURL(previewDesktop);
            if (previewMobile) URL.revokeObjectURL(previewMobile);
        };
    }, [previewDesktop, previewMobile]);

    function validateImage(file: File, maxSizeMB: number = 5): boolean {
        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Зөвхөн зураг файл сонгоно уу');
            return false;
        }

        // Check file size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
            toast.error(`Файлын хэмжээ ${maxSizeMB}MB-аас бага байх ёстой (${sizeMB.toFixed(1)}MB)`);
            return false;
        }

        return true;
    }

    function handleDesktopChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file && validateImage(file)) {
            // Cleanup old preview
            if (previewDesktop) URL.revokeObjectURL(previewDesktop);

            setImageDesktop(file);
            setPreviewDesktop(URL.createObjectURL(file));
        }
    }

    function handleMobileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file && validateImage(file)) {
            // Cleanup old preview
            if (previewMobile) URL.revokeObjectURL(previewMobile);

            setImageMobile(file);
            setPreviewMobile(URL.createObjectURL(file));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWebtoon || !imageDesktop) {
            toast.error("Вэбтүүн болон үндсэн (Desktop) зургийг сонгоно уу");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Баннер үүсгэж байна...");

        try {
            const { uploadToR2 } = await import("@/lib/r2");

            // 1. Upload Desktop Image
            toast.loading("Desktop зураг байршуулж байна...", { id: loadingToast });
            const compressedDesktop = await compressImage(imageDesktop);
            const desktopName = `banner-dt-${Date.now()}-${imageDesktop.name}`;
            const desktopPath = `banners/${desktopName}`;
            const desktopBuffer = await compressedDesktop.arrayBuffer();
            const desktopResult = await uploadToR2(desktopBuffer, desktopPath, compressedDesktop.type);

            if (!desktopResult.success) {
                throw new Error(`Desktop зураг байршуулахад алдаа: ${desktopResult.error}`);
            }

            // 2. Upload Mobile Image (Optional)
            let mobileUrl = null;
            if (imageMobile) {
                toast.loading("Mobile зураг байршуулж байна...", { id: loadingToast });
                const compressedMobile = await compressImage(imageMobile);
                const mobileName = `banner-mb-${Date.now()}-${imageMobile.name}`;
                const mobilePath = `banners/${mobileName}`;
                const mobileBuffer = await compressedMobile.arrayBuffer();
                const mobileResult = await uploadToR2(mobileBuffer, mobilePath, compressedMobile.type);

                if (mobileResult.success) {
                    mobileUrl = mobileResult.url;
                } else {
                    console.warn('Mobile зураг байршуулахад алдаа:', mobileResult.error);
                }
            }

            // 3. Insert Banner
            toast.loading("Баннер хадгалж байна...", { id: loadingToast });
            const { error: insertError } = await supabase
                .from('banners')
                .insert({
                    webtoon_id: selectedWebtoon.id,
                    image_url: desktopResult.url,
                    image_mobile_url: mobileUrl,
                    title: title || selectedWebtoon.title,
                    description: description,
                    is_active: true
                });

            if (insertError) throw insertError;

            toast.success("Баннер амжилттай нэмэгдлээ!", { id: loadingToast });
            router.push("/admin/banners");
            router.refresh();
        } catch (error: any) {
            console.error('Banner creation error:', error);
            toast.error(error.message || "Баннер үүсгэхэд алдаа гарлаа", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/admin/banners">
                    <button className="p-3 rounded-xl bg-surface border border-white/5 hover:bg-white/5 text-muted hover:text-white transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-white">Шинэ баннер</h1>
                    <p className="text-muted">Нүүр хуудсанд харагдах онцлох вэбтүүн</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                {/* Left Column - Images & Details (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Images Row */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Desktop Image */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <Monitor className="w-4 h-4" /> Desktop (16:9)
                                </label>
                                <span className="text-[10px] text-primary font-bold">ЗААВАЛ</span>
                            </div>
                            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all overflow-hidden group">
                                <label htmlFor="desktop-upload" className="absolute inset-0 cursor-pointer z-10" />
                                {previewDesktop ? (
                                    <img src={previewDesktop} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Upload className="w-6 h-6 text-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
                                        <p className="text-xs font-bold text-white/60">Desktop зураг</p>
                                    </div>
                                )}
                                <input id="desktop-upload" type="file" accept="image/*" className="hidden" onChange={handleDesktopChange} />
                            </div>
                        </div>

                        {/* Mobile Image */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" /> Mobile (9:16)
                                </label>
                                <span className="text-[10px] text-muted font-bold tracking-tighter">СОНГОЛТТОЙ</span>
                            </div>
                            <div className="relative aspect-[9/16] h-[200px] mx-auto rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all overflow-hidden group">
                                <label htmlFor="mobile-upload" className="absolute inset-0 cursor-pointer z-10" />
                                {previewMobile ? (
                                    <img src={previewMobile} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Upload className="w-6 h-6 text-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
                                        <p className="text-xs font-bold text-white/60">Mobile зураг</p>
                                    </div>
                                )}
                                <input id="mobile-upload" type="file" accept="image/*" className="hidden" onChange={handleMobileChange} />
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-6">
                        <label className="text-xs font-black uppercase tracking-widest text-muted block">дэлгэрэнгүй мэдээлэл</label>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Гарчиг (Заавал биш)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={selectedWebtoon ? selectedWebtoon.title : "Тусгай гарчиг..."}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Тайлбар (Заавал биш)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Тусгай тайлбар..."
                                    rows={1}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Webtoon Selection (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-6 h-[500px] flex flex-col">
                        <label className="text-xs font-black uppercase tracking-widest text-muted block">Вэбтүүн сонгох</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-muted" />
                            <input
                                type="text"
                                placeholder="Хайх..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredWebtoons.map((w) => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setSelectedWebtoon(w)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${selectedWebtoon?.id === w.id
                                        ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                                        : "bg-white/5 border-transparent hover:bg-white/10"
                                        }`}
                                >
                                    <img src={w.image} className="w-10 h-14 rounded-lg object-cover bg-black/50" />
                                    <h3 className={`font-bold text-sm truncate ${selectedWebtoon?.id === w.id ? "text-primary" : "text-white"}`}>
                                        {w.title}
                                    </h3>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        disabled={loading || !selectedWebtoon || !imageDesktop}
                        type="submit"
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /> Хадгалах</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
