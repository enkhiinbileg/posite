"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Search, Plus, Trash2, Edit, FileText } from "lucide-react";
import { toast } from "sonner";
import { getAdminChaptersAction } from "@/app/actions/webtoon-actions";

export default function ChaptersPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [chapters, setChapters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const isAdmin = profile?.is_admin || false;
    const isModerator = profile?.is_moderator || false;
    const isTranslator = profile?.is_translator || false;
    const currentUserId = user?.id || null;

    useEffect(() => {
        fetchChapters();
    }, []);


    async function fetchChapters() {
        setLoading(true);
        const result = await getAdminChaptersAction();

        if (result.success && result.data) {
            setChapters(result.data);
        } else {
            toast.error("Бүлэг татахад алдаа гарлаа: " + result.error);
        }
        setLoading(false);
    }

    async function handleDelete(id: number) {
        if (!confirm("Та энэ бүлгийг устгахдаа итгэлтэй байна уу?")) return;

        const { error } = await supabase.from('chapters').delete().eq('id', id);
        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            setChapters(chapters.filter(c => c.id !== id));
            toast.success("Бүлэг устгагдлаа!");
        }
    }

    function canEdit(chapter: any) {
        if (isAdmin || isModerator) return true;
        if (chapter.created_by && chapter.created_by === currentUserId) return true;
        return false;
    }

    function canDelete(chapter: any) {
        if (isModerator) return false;
        if (isAdmin) return true;
        if (chapter.created_by && chapter.created_by === currentUserId) return true;
        return false;
    }

    const filteredChapters = chapters.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.webtoons?.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Бүлгүүд</h2>
                    <p className="text-muted">Нийт орсон бүлгүүдийн жагсаалт</p>
                </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/chapters/bulk')}
                            className="flex items-center gap-2 bg-surface border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-white/5 transition-all shadow-lg"
                        >
                            <Plus className="w-5 h-5 text-primary" />
                            Багцаар нэмэх
                        </button>
                        <button
                            onClick={() => router.push('/admin/chapters/new')}
                            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-5 h-5" />
                            Бүлэг нэмэх
                        </button>
                    </div>
            </div>

            {/* Search */}
            <div className="bg-surface border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Бүлгийн нэр эсвэл Вэбтүүнээр хайх..."
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
                                <th className="p-4 pl-6">Вэбтүүн</th>
                                <th className="p-4">Бүлгийн дугаар/Нэр</th>
                                <th className="p-4">Огноо</th>
                                <th className="p-4 text-right pr-6">Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredChapters.map((chapter) => (
                                <tr key={chapter.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 shrink-0">
                                                {chapter.webtoons?.image && (
                                                    <img src={chapter.webtoons.image} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{chapter.webtoons?.title || "Unknown"}</div>
                                                <div className="text-muted text-[10px] uppercase">{chapter.webtoons?.author}</div>
                                                {chapter.created_by && chapter.created_by === currentUserId && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[9px] font-bold border border-purple-500/20">
                                                        Минийх
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="font-medium text-white">{chapter.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted text-xs">
                                        {new Date(chapter.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {canEdit(chapter) && (
                                                <button
                                                    onClick={() => router.push(`/admin/chapters/${chapter.id}`)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors opacity-50 group-hover:opacity-100"
                                                    title="Засах"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Only Owners or Admins can delete. Moderators restricted. */}
                                            {canDelete(chapter) && (
                                                <button
                                                    onClick={() => handleDelete(chapter.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors opacity-50 group-hover:opacity-100"
                                                    title="Устгах"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredChapters.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted">
                                        Бүлэг олдсонгүй.
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
