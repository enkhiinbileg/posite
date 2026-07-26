"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Search, Plus, MoreHorizontal, Trash2, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import { getAdminWebtoonsAction, deleteWebtoonAction } from "@/app/actions/webtoon-actions";

export default function WebtoonsPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const isAdmin = profile?.is_admin || false;
    const isTranslator = profile?.is_translator || false;
    const currentUserId = user?.id || null;

    useEffect(() => {
        fetchWebtoons();
    }, []);

    async function fetchWebtoons() {
        setLoading(true);
        const result = await getAdminWebtoonsAction();

        if (result.success && result.data) {
            setWebtoons(result.data);
        } else {
            toast.error("Вэбтүүн татахад алдаа гарлаа: " + result.error);
        }
        setLoading(false);
    }

    async function handleDelete(id: number) {
        if (!confirm("Та энэ вэбтүүнийг устгахдаа итгэлтэй байна уу?")) return;

        const result = await deleteWebtoonAction(id);
        if (!result.success) {
            toast.error("Алдаа гарлаа: " + result.error);
        } else {
            setWebtoons(webtoons.filter(w => w.id !== id));
            toast.success("Амжилттай устгагдлаа!");
        }
    }

    function canEdit(webtoon: any) {
        if (isAdmin) return true;
        if (webtoon.created_by && webtoon.created_by === currentUserId) return true;
        return false;
    }

    const filteredWebtoons = webtoons.filter(w =>
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.author.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Вэбтүүнүүд</h2>
                    <p className="text-muted">Нийт вэбтүүнүүдийн жагсаалт</p>
                </div>
                {(isAdmin || isTranslator) && (
                    <button
                        onClick={() => router.push('/admin/webtoons/new')}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-5 h-5" />
                        Вэбтүүн нэмэх
                    </button>
                )}
            </div>

            {/* Search & Filter */}
            <div className="bg-surface border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Хайх..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-muted font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-3 md:p-4 pl-4 md:pl-6 whitespace-nowrap">Cover</th>
                                <th className="p-3 md:p-4 whitespace-nowrap">Мэдээлэл</th>
                                <th className="p-3 md:p-4 whitespace-nowrap">Төрөл</th>
                                <th className="p-3 md:p-4 whitespace-nowrap">Статус</th>
                                <th className="p-3 md:p-4 text-right pr-4 md:pr-6 whitespace-nowrap">Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredWebtoons.map((webtoon) => (
                                <tr key={webtoon.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 pl-6 w-20">
                                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/50">
                                            {webtoon.image ? (
                                                <img src={webtoon.image} alt={webtoon.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-muted">No IMG</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white text-base">{webtoon.title}</div>
                                        <div className="text-muted text-xs">{webtoon.author}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {webtoon.genres?.slice(0, 2).map((g: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-muted border border-white/5">
                                                    {g}
                                                </span>
                                            ))}
                                            {webtoon.genres?.length > 2 && (
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-muted border border-white/5">
                                                    +{webtoon.genres.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            {webtoon.status === "Completed" ? (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                                    Дууссан
                                                </span>
                                            ) : webtoon.status === "Hiatus" ? (
                                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">
                                                    Завсарлага
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                                    Гарч байгаа
                                                </span>
                                            )}


                                            
                                            {webtoon.created_by && webtoon.created_by === currentUserId && (
                                                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase tracking-widest border border-purple-500/20">
                                                    Минийх
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Edit Button - Only if Owner or Admin */}
                                            {canEdit(webtoon) && (
                                                <button
                                                    onClick={() => router.push(`/admin/webtoons/${webtoon.id}`)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                                                    title="Засах"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Delete Button - Only Admin or Owner */}
                                            {canEdit(webtoon) && (
                                                <button
                                                    onClick={() => handleDelete(webtoon.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors group-hover:opacity-100 opacity-50"
                                                    title="Устгах"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && filteredWebtoons.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted">
                                        Вэбтүүн олдсонгүй.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
