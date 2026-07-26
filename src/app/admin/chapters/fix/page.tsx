"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Search, CheckCircle2, AlertCircle, FileDigit, User, ShieldAlert } from "lucide-react";
import Image from "next/image";

export default function ChapterFixTool() {
    // State
    const [stats, setStats] = useState({ totalOrphaned: 0, webtoonCount: 0 });
    const [orphanedGroups, setOrphanedGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [targetUser, setTargetUser] = useState<any | null>(null);
    const [searchingUser, setSearchingUser] = useState(false);

    useEffect(() => {
        fetchOrphanedChapters();
    }, []);

    const fetchOrphanedChapters = async () => {
        setLoading(true);
        try {
            // 1. Fetch all chapters without translator_id
            const { data: chapters, error } = await supabase
                .from('chapters')
                .select(`
                    id, 
                    chapter_number, 
                    title, 
                    created_at,
                    webtoons (id, title, image)
                `)
                .is('translator_id', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setStats({
                totalOrphaned: chapters?.length || 0,
                webtoonCount: new Set(chapters?.map(c => (c.webtoons as any)?.id)).size
            });

            // Group by Webtoon
            const groups: any = {};
            chapters?.forEach(ch => {
                const wId = (ch.webtoons as any)?.id;
                if (!wId) return; // Skip completely broken ones

                if (!groups[wId]) {
                    groups[wId] = {
                        webtoon: ch.webtoons,
                        count: 0,
                        chapters: []
                    };
                }
                groups[wId].count++;
                groups[wId].chapters.push(ch);
            });

            setOrphanedGroups(Object.values(groups));

        } catch (e: any) {
            console.error(e);
            toast.error("Эзэнгүй бүлгүүдийг ачааллахад алдаа гарлаа: " + (e.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchUser = async () => {
        if (!searchQuery.trim()) return;
        setSearchingUser(true);
        setTargetUser(null);

        try {
            // Try ID first
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('unique_id', searchQuery)
                .single();

            // Try Email if ID fails
            if (!data) {
                const { data: userByEmail } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('email', searchQuery)
                    .single();
                data = userByEmail;
            }

            if (data) {
                setTargetUser(data);
                toast.success(`Хэрэглэгч олдлоо: ${data.full_name || data.email}`);
            } else {
                toast.error("Хэрэглэгч олдсонгүй");
            }
        } catch (e) {
            toast.error("Хайлт амжилтгүй боллоо");
        } finally {
            setSearchingUser(false);
        }
    };

    const handleAssign = async (webtoonId: number) => {
        if (!targetUser) return toast.error("Эхлээд зорилтот хэрэглэгчээ сонгоно уу");
        if (!confirm(`Та тус вебтүүний бүх эзэнгүй бүлгийг ${targetUser.email} рүү шилжүүлэхдээ итгэлтэй байна уу?`)) return;

        setAssigning(String(webtoonId));
        try {
            const { error, count } = await supabase
                .from('chapters')
                .update({ translator_id: targetUser.id })
                .eq('webtoon_id', webtoonId)
                .is('translator_id', null);

            if (error) throw error;

            toast.success(`Бүлгүүдийг амжилттай шилжүүллээ!`);

            fetchOrphanedChapters(); // Refresh

        } catch (e: any) {
            toast.error("Шилжүүлэлт амжилтгүй: " + e.message);
        } finally {
            setAssigning(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Бүлэг Шилжүүлэх Багаж</h1>
                    <p className="text-muted text-sm font-bold uppercase tracking-widest mt-1">Эзэнгүй бүлгүүдийг засах</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <div>
                            <div className="text-xs text-red-200 font-bold uppercase">Эзэнгүй Бүлгүүд</div>
                            <div className="text-2xl font-black text-red-500">{stats.totalOrphaned}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Target User Selector */}
            <div className="glass-card p-6 rounded-[2rem] space-y-4 border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-black uppercase tracking-widest text-sm">1. Орчуулагчийг сонгох</h3>
                </div>

                <div className="flex gap-4 max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                            placeholder="Хэрэглэгчийн ID (#) эсвэл Email..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSearchUser}
                        disabled={searchingUser || !searchQuery}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50"
                    >
                        {searchingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Хайх"}
                    </button>
                </div>

                {targetUser && (
                    <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 relative">
                            {targetUser.avatar_url ? (
                                <Image src={targetUser.avatar_url} alt={targetUser.username || targetUser.full_name || "User Avatar"} fill className="object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-lg font-black">{targetUser.full_name?.[0]}</div>
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{targetUser.full_name || targetUser.email}</div>
                            <div className="text-xs font-mono text-green-400">ID: #{targetUser.unique_id}</div>
                            <div className="text-[10px] text-muted uppercase font-bold mt-1">Бүлэг хүлээн авахад бэлэн</div>
                        </div>
                        <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto" />
                    </div>
                )}
            </div>

            {/* Orphaned List */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h3 className="font-black uppercase tracking-widest text-sm">2. Вебтүүнээр нь хуваарилах</h3>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                ) : orphanedGroups.length === 0 ? (
                    <div className="py-20 text-center text-muted font-bold uppercase tracking-widest">Эзэнгүй бүлэг олдсонгүй. Сайн байна! 🎉</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orphanedGroups.map((group: any) => (
                            <div key={group.webtoon.id} className="bg-surface border border-white/5 p-5 rounded-[2rem] flex items-center gap-5 hover:border-white/10 transition-all group">
                                <div className="w-16 h-20 bg-black/40 rounded-xl relative overflow-hidden shrink-0">
                                    {group.webtoon.image && (
                                        <Image src={group.webtoon.image} alt={group.webtoon.title} fill className="object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{group.webtoon.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] font-black uppercase">
                                            {group.count} ЭЗЭНГҮЙ
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted truncate">
                                        Сүүлд: {new Date(group.chapters[0].created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAssign(group.webtoon.id)}
                                    disabled={!targetUser || !!assigning}
                                    className="px-5 py-3 bg-white/5 hover:bg-primary disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap"
                                >
                                    {assigning === String(group.webtoon.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Бүгдийг шилжүүлэх"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
