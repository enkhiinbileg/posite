"use client";


import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Upload, Loader2, Save, Trash2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { compressImage } from "@/lib/image-compression";

export default function EditBannerPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [banner, setBanner] = useState<any>(null);
    const [imageDesktop, setImageDesktop] = useState<File | null>(null);
    const [imageMobile, setImageMobile] = useState<File | null>(null);
    const [previewDesktop, setPreviewDesktop] = useState<string | null>(null);
    const [previewMobile, setPreviewMobile] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);

    useEffect(() => {
        if (id) fetchBanner();
    }, [id]);

    async function fetchBanner() {
        setLoading(true);
        const { data, error } = await supabase
            .from('banners')
            .select('*, webtoons(title, image)')
            .eq('id', id)
            .single();

        if (error) {
            toast.error("Баннер олдсонгүй");
            router.push("/admin/banners");
            return;
        }

        setBanner(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setPreviewDesktop(data.image_url);
        setPreviewMobile(data.image_mobile_url);
        setIsActive(data.is_active);
        setSortOrder(data.sort_order);
        setLoading(false);
    }

    function handleDesktopChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setImageDesktop(file);
            setPreviewDesktop(URL.createObjectURL(file));
        }
    }

    function handleMobileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setImageMobile(file);
            setPreviewMobile(URL.createObjectURL(file));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            const { uploadToR2 } = await import("@/lib/r2");
            let finalDesktopUrl = banner.image_url;
            let finalMobileUrl = banner.image_mobile_url;

            // 1. Upload Desktop if changed
            if (imageDesktop) {
                const compressedDesktop = await compressImage(imageDesktop);
                const name = `banner-dt-${Date.now()}-${imageDesktop.name}`;
                const buffer = await compressedDesktop.arrayBuffer();
                const res = await uploadToR2(buffer, `banners/${name}`, compressedDesktop.type);
                if (res.success) finalDesktopUrl = res.url;
            }

            // 2. Upload Mobile if changed
            if (imageMobile) {
                const compressedMobile = await compressImage(imageMobile);
                const name = `banner-mb-${Date.now()}-${imageMobile.name}`;
                const buffer = await compressedMobile.arrayBuffer();
                const res = await uploadToR2(buffer, `banners/${name}`, compressedMobile.type);
                if (res.success) finalMobileUrl = res.url;
            }

            // 3. Update Banner
            const { error: updateError } = await supabase
                .from('banners')
                .update({
                    image_url: finalDesktopUrl,
                    image_mobile_url: finalMobileUrl,
                    title: title || null,
                    description: description || null,
                    is_active: isActive,
                    sort_order: sortOrder
                })
                .eq('id', id);

            if (updateError) throw updateError;

            toast.success("Баннер шинэчлэгдлээ!");
            router.push("/admin/banners");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error("Алдаа гарлаа: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Устгахдаа итгэлтэй байна уу?")) return;

        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) {
            toast.error("Устгахад алдаа гарлаа");
        } else {
            toast.success("Баннер устгагдлаа");
            router.push("/admin/banners");
            router.refresh();
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/banners">
                        <button className="p-3 rounded-xl bg-surface border border-white/5 hover:bg-white/5 text-muted hover:text-white transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white">Баннер засах</h1>
                        <p className="text-sm text-muted">ID: {id} • {banner?.webtoons?.title}</p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                {/* Left Column - Images */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Desktop Image */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Monitor className="w-4 h-4" /> Desktop (16:9)
                            </label>
                            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all overflow-hidden group">
                                <label htmlFor="desktop-upload" className="absolute inset-0 cursor-pointer z-10" />
                                {previewDesktop ? (
                                    <img src={previewDesktop} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                                        <p className="text-xs font-bold text-white/60">Desktop зураг</p>
                                    </div>
                                )}
                                <input id="desktop-upload" type="file" accept="image/*" className="hidden" onChange={handleDesktopChange} />
                            </div>
                        </div>

                        {/* Mobile Image */}
                        <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Smartphone className="w-4 h-4" /> Mobile (9:16)
                            </label>
                            <div className="relative aspect-[9/16] h-[200px] mx-auto rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all overflow-hidden group">
                                <label htmlFor="mobile-upload" className="absolute inset-0 cursor-pointer z-10" />
                                {previewMobile ? (
                                    <img src={previewMobile} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                                        <p className="text-xs font-bold text-white/60">Mobile зураг</p>
                                    </div>
                                )}
                                <input id="mobile-upload" type="file" accept="image/*" className="hidden" onChange={handleMobileChange} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted block">Тохиргоо</label>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                <span className="font-bold text-sm">Идэвхтэй эсэх</span>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={e => setIsActive(e.target.checked)}
                                    className="w-5 h-5 accent-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="number"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(Number(e.target.value))}
                                    placeholder="Дараалал"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-6">
                        <label className="text-xs font-black uppercase tracking-widest text-muted block">Дэлгэрэнгүй</label>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Гарчиг</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={banner?.webtoons?.title || "Гарчиг"}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Тайлбар</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Тайлбар..."
                                    rows={8}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={saving}
                        type="submit"
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /> Хадгалах</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
