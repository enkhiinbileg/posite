"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit, Loader2, Image as ImageIcon, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAdminBannersAction } from "@/app/actions/webtoon-actions";

export default function BannersPage() {
    const router = useRouter();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBanners();
    }, []);

    async function fetchBanners() {
        setLoading(true);
        const result = await getAdminBannersAction();

        if (!result.success) {
            console.error(result.error);
            toast.error("Баннеруудыг татахад алдаа гарлаа: " + result.error);
        } else {
            setBanners(result.data || []);
        }
        setLoading(false);
    }

    async function handleDelete(id: number) {
        if (!confirm("Та энэ баннерыг устгахдаа итгэлтэй байна уу?")) return;

        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Устгахад алдаа гарлаа");
        } else {
            toast.success("Баннер устгагдлаа");
            fetchBanners();
        }
    }

    async function handleReorder(id: number, direction: 'up' | 'down') {
        // Simple swap logic or resort
        // For simplicity, let's just swap sort_order with adjacent item
        const index = banners.findIndex(b => b.id === id);
        if (index === -1) return;

        const current = banners[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex < 0 || swapIndex >= banners.length) return;
        const swapTarget = banners[swapIndex];

        // Update DB
        const { error: e1 } = await supabase.from('banners').update({ sort_order: swapTarget.sort_order }).eq('id', current.id);
        const { error: e2 } = await supabase.from('banners').update({ sort_order: current.sort_order }).eq('id', swapTarget.id);

        if (!e1 && !e2) {
            fetchBanners();
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2">Баннерууд</h1>
                    <p className="text-muted">Нүүр хуудасны слайдер хэсгийг удирдах</p>
                </div>
                <Link href="/admin/banners/new">
                    <button className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">
                        <Plus className="w-5 h-5" />
                        Баннер нэмэх
                    </button>
                </Link>
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {banners.length === 0 ? (
                    <div className="p-12 text-center text-muted">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Одоогоор баннер байхгүй байна.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        <div className="grid grid-cols-[80px_1fr_1fr_100px_150px] gap-4 p-4 bg-black/20 text-xs font-black uppercase tracking-widest text-muted">
                            <div className="text-center">Зураг</div>
                            <div>Гарчиг</div>
                            <div>Тайлбар</div>
                            <div className="text-center">Дараалал</div>
                            <div className="text-end">Үйлдэл</div>
                        </div>
                        {banners.map((banner) => (
                            <div key={banner.id} className="grid grid-cols-[80px_1fr_1fr_100px_150px] gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                                <div className="h-12 rounded-lg bg-white/5 overflow-hidden border border-white/10 relative">
                                    <img src={banner.image_url} className="w-full h-full object-cover" />
                                    {!banner.is_active && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-white uppercase">Off</span>
                                        </div>
                                    )}
                                </div>
                                <div className="font-bold text-white truncate pr-4">
                                    {banner.title || <span className="text-muted italic">Гарчиггүй ({banner.webtoon_id})</span>}
                                </div>
                                <div className="text-sm text-muted truncate pr-4">
                                    {banner.description || "-"}
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => handleReorder(banner.id, 'up')}
                                        className="p-1 hover:bg-white/10 rounded text-muted hover:text-white disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <span className="font-mono text-sm w-6 text-center">{banner.sort_order}</span>
                                    <button
                                        onClick={() => handleReorder(banner.id, 'down')}
                                        className="p-1 hover:bg-white/10 rounded text-muted hover:text-white disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/admin/banners/${banner.id}`}>
                                        <button className="p-2 hover:bg-white/10 text-muted hover:text-blue-400 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        className="p-2 hover:bg-white/10 text-muted hover:text-red-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
