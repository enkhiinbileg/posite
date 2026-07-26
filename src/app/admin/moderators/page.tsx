'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, BookOpen, User, Hash, TrendingUp, Clock, ShieldCheck, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SingleModeratorStatsPage() {
    const [loading, setLoading] = useState(true);
    const [allChapters, setAllChapters] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    const [selectedModId, setSelectedModId] = useState<string>(''); // Default to empty, will be set in initUsers
    const [availableMods, setAvailableMods] = useState<any[]>([]);
    const [showModDropdown, setShowModDropdown] = useState(false);

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const authUser = session?.user;
            
            // Fetch all profiles that have some special role
            const { data: mods, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, unique_id, email, is_moderator, is_translator, is_admin')
                .or('is_moderator.eq.true,is_translator.eq.true,is_admin.eq.true,email.eq.neoisneo07@gmail.com');

            if (error) {
                console.error("Mods fetch error:", error);
            }

            const uniqueMods = Array.from(new Map((mods || []).map((m: any) => [m?.id, m])).values());
            setAvailableMods(uniqueMods);
            
            // Default selection logic:
            let defaultMod: any = null;
            if (authUser) {
                defaultMod = uniqueMods.find(m => m.id === authUser.id);
            }
            if (!defaultMod && uniqueMods.length > 0) {
                defaultMod = uniqueMods.find(m => m.email === 'neoisneo07@gmail.com') || uniqueMods[0];
            }

            if (defaultMod) {
                const targetModId = defaultMod.unique_id || defaultMod.id;
                setSelectedModId(targetModId);
                // Trigger initial fetch directly to be faster
                await fetchModeratorData(targetModId, uniqueMods);
            } else {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        // Only trigger if mod list is ready and we want to change
        if (availableMods.length > 0 && selectedModId && !loading) {
            fetchModeratorData(selectedModId, availableMods);
        }
    }, [selectedModId, availableMods]);

    const fetchModeratorData = async (targetModId: string, modsToSearch: any[]) => {
        setLoading(true);
        try {
            let modProfile = modsToSearch.find(m => m.unique_id === targetModId || m.id === targetModId);

            if (!modProfile) {
                setStats(null);
                setAllChapters([]);
                setLoading(false);
                return;
            }

            // Always filter by the selected moderator's ID
            const { data: chapters, error } = await supabase
                .from('chapters')
                .select(`
                    id,
                    chapter_number,
                    published_at,
                    webtoon_id,
                    webtoons (id, title, image)
                `)
                .eq('translator_id', modProfile.id)
                .order('published_at', { ascending: false });

            if (error) throw new Error(`Moderator chapters fetch failed: ${error.message}`);
            setStats({ profile: modProfile });
            setAllChapters(chapters || []);
        } catch (err: any) {
            console.error("fetchModeratorData main error:", err);
            toast.error(`Дата татахад алдаа гарлаа: ${err?.message || 'Үл мэдэгдэх алдаа'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleResetAllStats = async () => {
        const confirmed = window.confirm("АНХААРУУЛГА: Та бүх модераторуудын статистикийг (нийт бүлгийн тоо) 0 болгож цэвэрлэхдээ итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.");
        
        if (!confirmed) return;

        setLoading(true);
        try {
            // Update all chapters to clear translator_id (which tracks who uploaded it)
            const { error } = await supabase
                .from('chapters')
                .update({ translator_id: null })
                .not('translator_id', 'is', null);

            if (error) throw error;

            toast.success("Бүх статистик амжилттай 0 боллоо.");
            
            // Refresh current data
            if (selectedModId) {
                await fetchModeratorData(selectedModId, availableMods);
            }
        } catch (err: any) {
            console.error("Reset stats error:", err);
            toast.error(`Reset хийхэд алдаа гарлаа: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Recalculate everything when "allChapters" or "filter" changes
    useEffect(() => {
        if (!allChapters.length && stats?.profile) {
            setStats((prev: any) => ({ ...prev, total: 0, today: 0, webtoons: 0 }));
            setDailyLogs([]);
            return;
        }
        if (!stats?.profile) return;

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');

        let filtered = allChapters;

        if (filter !== 'all') {
            filtered = allChapters.filter(c => {
                const pubDateRaw = c.published_at || new Date();
                const pubDate = new Date(pubDateRaw);
                const diffTime = Math.abs(now.getTime() - pubDate.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (filter === 'today') {
                    return pubDate.toLocaleDateString('en-CA') === todayStr;
                } else if (filter === 'week') {
                    return diffDays <= 7;
                } else if (filter === 'month') {
                    return diffDays <= 30;
                }
                return true;
            });
        }

        const totalChapters = filtered.length;
        const todayCount = allChapters.filter(c => {
            const pubDateRaw = c.published_at || new Date();
            return new Date(pubDateRaw).toLocaleDateString('en-CA') === todayStr;
        }).length;

        const webtoonSet = new Set(filtered.map(c => {
            const w: any = Array.isArray(c.webtoons) ? c.webtoons[0] : c.webtoons;
            return w?.id;
        }));
        webtoonSet.delete(undefined);
        const webtoonsCount = webtoonSet.size;

        // Daily Logs Grouping
        const dailyMap = new Map();
        filtered.forEach(ch => {
            const dateRaw = ch.published_at ? new Date(ch.published_at) : new Date();
            const dateStr = dateRaw.toLocaleDateString('en-CA');
            
            const w: any = Array.isArray(ch.webtoons) ? ch.webtoons[0] : ch.webtoons;
            const webtoonId = w?.id || ch.webtoon_id || 'unknown';
            
            const key = `${dateStr}_${webtoonId}`;

            if (!dailyMap.has(key)) {
                dailyMap.set(key, {
                    date: dateStr,
                    webtoon: w || { title: 'Олдоогүй вэбтүүн' },
                    count: 0,
                    chapters: [],
                });
            }
            const entry = dailyMap.get(key);
            entry.count += 1;
            entry.chapters.push(ch.chapter_number);
        });

        const sortedLogs = Array.from(dailyMap.values()).sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setStats((prev: any) => ({
            ...prev,
            total: filter === 'all' ? (prev?.totalOverride ?? totalChapters) : totalChapters,
            today: todayCount,
            webtoons: webtoonsCount
        }));
        
        setDailyLogs(sortedLogs);

    }, [allChapters, filter]);



    // Skeleton Component
    const Skeleton = ({ className }: { className: string }) => (
        <div className={cn("animate-pulse bg-white/5 rounded-2xl", className)} />
    );

    if (!loading && !stats?.profile) return (
        <div className="py-32 flex flex-col items-center justify-center bg-[#0A0A0A] border border-white/5 rounded-3xl">
            <User className="w-20 h-20 text-white/5 mb-6" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Мэдээлэл олдсонгүй</h3>
            <p className="text-muted mt-2">Одоогоор модератор олдсонгүй.</p>
        </div>
    );

    const profile = stats?.profile;

    return (
        <div className="space-y-8 pb-20">
            {/* Header Title & Moderator Switcher */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Модератор <span className="text-primary italic">Тайлан</span></h2>
                    <p className="text-muted mt-2">Модераторын бүлэг оруулалтын гүйцэтгэл ба статистик.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleResetAllStats}
                        className="flex items-center gap-2 px-5 py-3 bg-red-600/10 border border-red-600/20 rounded-2xl hover:bg-red-600/20 text-red-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/5 group"
                    >
                        <TrendingUp className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        Статистик Reset
                    </button>

                    {availableMods.length > 0 && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowModDropdown(!showModDropdown)}
                                className="flex items-center gap-3 px-5 py-3 bg-[#0A0A0A] border border-white/10 rounded-2xl hover:bg-white/5 transition-colors group"
                            >
                                <User className="w-4 h-4 text-primary" />
                                <div className="text-left flex-1 min-w-[150px]">
                                    <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-0.5">Модератор сонгох</p>
                                    <p className="text-sm font-bold text-white leading-none">
                                        {loading && !profile ? "Уншиж байна..." : (profile?.username || 'Тодорхойгүй')}
                                    </p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted group-hover:text-white transition-colors" />
                            </button>

                        {showModDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-[240px] bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
                                {availableMods.map(mod => (
                                    <button
                                        key={mod.id}
                                        onClick={() => {
                                            setSelectedModId(mod.unique_id || mod.id);
                                            setShowModDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                            (mod.unique_id === selectedModId || mod.id === selectedModId) 
                                                ? "bg-primary/10 border border-primary/20" 
                                                : "hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        {mod.avatar_url ? (
                                            <img src={mod.avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                <User className="w-3 h-3 text-muted" />
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                            <p className={cn(
                                                "text-xs font-bold truncate",
                                                (mod.unique_id === selectedModId || mod.id === selectedModId) ? "text-primary" : "text-white"
                                            )}>
                                                {mod.username || 'Тодорхойгүй'}
                                            </p>
                                            <p className="text-[10px] text-muted font-mono truncate">{mod.unique_id || 'No ID'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

            {/* Profile Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] border border-white/10 p-8 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <ShieldCheck className="w-64 h-64 text-white" />
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary/50 to-pink-600/50 p-1 shadow-2xl shadow-primary/20 shrink-0">
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden border-4 border-[#0A0A0A] bg-zinc-900">
                            {loading && !profile ? (
                                <div className="w-full h-full animate-pulse bg-white/5" />
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-12 h-12 text-white/20" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                            <Layers className="w-3 h-3" /> Тэргүүлэх Модератор
                        </div>
                        {loading && !profile ? (
                            <>
                                <Skeleton className="h-10 w-64 mb-3" />
                                <Skeleton className="h-4 w-48" />
                            </>
                        ) : (
                            <>
                                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">
                                    {profile?.username || 'Модератор'}
                                </h1>
                                <p className="text-muted font-bold text-sm">
                                    {profile?.email || 'Мэдээлэл байхгүй'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full md:w-auto mt-6 md:mt-0">
                        <div className="px-6 py-5 rounded-3xl bg-white/5 border border-white/5 text-center flex flex-col items-center justify-center transition-all">
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Бүлэг</p>
                            {loading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-black text-white tracking-tighter">{stats?.total || 0}</span>}
                        </div>
                        <div className="px-6 py-5 rounded-3xl bg-primary/10 border border-primary/20 text-center flex flex-col items-center justify-center transition-all">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Өнөөдөр</p>
                            {loading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-black text-primary tracking-tighter">{stats?.today || 0}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Timeline */}
            <div className="space-y-6 pt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3 ml-2">
                        <Clock className="w-6 h-6 text-primary" /> Өдөр тутмын Тайлан
                    </h3>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-[1.2rem] w-fit">
                        {[
                            { id: 'today', label: 'Өнөөдөр' },
                            { id: 'week', label: '7 Хоног' },
                            { id: 'month', label: '1 Сар' },
                            { id: 'all', label: 'Бүгд' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id as any)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                                    filter === f.id
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-muted hover:text-white hover:bg-white/5"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5 text-[11px] font-black text-muted uppercase tracking-widest w-[160px]">Огноо</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-muted uppercase tracking-widest">Вэбтүүн</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-muted uppercase tracking-widest text-center w-[120px]">Тоо</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-muted uppercase tracking-widest">Бүлгийн дугаар</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dailyLogs.map((log, i) => {
                                    const isToday = log.date === new Date().toLocaleDateString('en-CA');
                                    return (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className={cn("w-4 h-4", isToday ? "text-primary" : "text-muted")} />
                                                    <span className={cn(
                                                        "font-black text-sm",
                                                        isToday ? "text-primary" : "text-white"
                                                    )}>
                                                        {isToday ? "Өнөөдөр" : log.date}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    {log.webtoon?.image ? (
                                                        <img src={log.webtoon.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                                            <BookOpen className="w-4 h-4 text-muted" />
                                                        </div>
                                                    )}
                                                    <p className="text-white font-black text-sm uppercase tracking-tight line-clamp-2">
                                                        {log.webtoon?.title || 'Тодорхойгүй вэбтүүн'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest">
                                                    {log.count}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {log.chapters.sort((a:any,b:any)=>a-b).map((num: any, idx: number) => (
                                                        <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-muted group-hover:text-white transition-colors group-hover:border-white/20">
                                                            ch.{num}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {dailyLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-muted font-bold uppercase tracking-widest text-xs">
                                            Энэ хугацаанд бүлэг оруулаагүй байна
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
