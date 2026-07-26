"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { BookOpen, Layers, Users, Heart, Loader2, TrendingUp, Activity, Crown, MessageCircle, RefreshCw, Calendar } from "lucide-react";
import { syncAllWebtoonChapterCounts } from "@/app/actions/webtoon-actions";
import { toast } from "sonner";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { getSiteSettings, updateSiteSetting } from "@/app/actions/settings-actions";
import { ShieldCheck, ToggleLeft, ToggleRight, Sparkles as SparklesIcon } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        webtoons: 0,
        chapters: 0,
        users: 0,
        likes: 0,
        vipUsers: 0
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [genreData, setGenreData] = useState<any[]>([]);
    const [popularWebtoons, setPopularWebtoons] = useState<any[]>([]);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [todaySchedules, setTodaySchedules] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
        fetchSettings();
    }, []);

    async function fetchSettings() {
        const res = await getSiteSettings();
        if (res.success) {
            setSettings(res.settings || {});
        }
    }

    const toggleNsfwFreePeriod = async () => {
        const newValue = !settings.is_nsfw_free_period;
        setSettingsLoading(true);
        const res = await updateSiteSetting('is_nsfw_free_period', newValue);
        setSettingsLoading(false);
        
        if (res.success) {
            setSettings(prev => ({ ...prev, is_nsfw_free_period: newValue }));
            toast.success(newValue ? "+18 контент үнэгүй боллоо!" : "+18 контент VIP-р хязгаарлагдлаа.");
        } else {
            toast.error("Тохиргоог шинэчлэхэд алдаа гарлаа");
        }
    };

    async function fetchStats() {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        let isAdminUser = false;

        if (user) {
            const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
            isAdminUser = prof?.is_admin || false;
            setIsAdmin(isAdminUser);
        }
        try {
            // FIRE ALL INITIAL QUERIES CONCURRENTLY
            const [
                countsRes,
                { data: allWebtoons },
                { data: popular },
                { data: recentComments }
            ] = await Promise.all([
                fetch('/api/admin/stats'),
                supabase.from('webtoons').select('genres'),
                supabase.from('webtoons').select('title, follow_count').order('follow_count', { ascending: false }).limit(5),
                supabase.from('comments').select('*, profiles(full_name), webtoons(title)').order('created_at', { ascending: false }).limit(5)
            ]);

            const countsJson = countsRes.ok ? await countsRes.json() : {};
            
            // Bypass 1000 max_rows by parallel fetching all pages of User Profiles
            const totalUsers = countsJson.users || 0;
            const pagesCount = Math.ceil(totalUsers / 1000);
            const profilePromises = [];
            for (let i = 0; i < pagesCount; i++) {
                profilePromises.push(
                    supabase.from('profiles').select('created_at').order('created_at', { ascending: true }).range(i * 1000, (i + 1) * 1000 - 1)
                );
            }
            const profileResults = await Promise.all(profilePromises);
            const profiles = profileResults.flatMap(res => res.data || []);
            setStats({
                webtoons: countsJson.webtoons || 0,
                chapters: countsJson.chapters || 0,
                users: countsJson.users || 0,
                likes: countsJson.likes || 0,
                vipUsers: countsJson.vipUsers || 0
            });

            // Chart Data
            const tempMap: Record<string, number> = {};
            profiles?.forEach(p => {
                if (!p.created_at) return;
                const date = new Date(p.created_at).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
                tempMap[date] = (tempMap[date] || 0) + 1;
            });

            let cumulative = 0;
            const chart = Object.keys(tempMap).map(date => {
                cumulative += tempMap[date];
                return { date, users: cumulative };
            });

            const todayFormatted = new Date().toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
            if (chart.length === 0) {
                chart.push({ date: todayFormatted, users: countsJson.users || 0 });
            } else if (chart[chart.length - 1].date !== todayFormatted) {
                chart.push({ date: todayFormatted, users: countsJson.users || cumulative });
            }
            setChartData(chart);

            // Genre Distribution
            const genreCount: Record<string, number> = {};
            allWebtoons?.forEach(w => {
                w.genres?.forEach((g: string) => {
                    genreCount[g] = (genreCount[g] || 0) + 1;
                });
            });
            setGenreData(Object.keys(genreCount).map(g => ({ name: g, value: genreCount[g] })));

            // Popular and Comments
            setPopularWebtoons(popular || []);
            setRecentActivities(recentComments || []);
            // Today's Schedules
            const today = new Date().getDay(); // 0-6
            const { data: todayScheds } = await supabase
                .from('webtoon_schedules')
                .select('*, webtoons(title)')
                .eq('day_of_week', today);
            setTodaySchedules(todayScheds || []);

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    }



    const cards = [
        { label: "Нийт Вэбтүүн", value: stats.webtoons, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Хэрэглэгчид", value: stats.users, icon: Users, color: "text-green-500", bg: "bg-green-500/10", restricted: true },
        { label: "VIP Хэрэглэгч", value: stats.vipUsers, icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", restricted: true },
        { label: "Нийт Лайк", value: stats.likes, icon: Heart, color: "text-red-500", bg: "bg-red-500/10" },
    ].filter(card => !card.restricted || isAdmin);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Хяналтын самбар</h2>
                    <p className="text-muted">Системийн ерөнхий үзүүлэлтүүд</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={async () => {
                            if (!confirm("Бүх вэбтүүний бүлгийн тоог шинэчлэх үү?")) return;
                            setSyncing(true);
                            const res = await syncAllWebtoonChapterCounts();
                            setSyncing(false);
                            if (res.success) {
                                toast.success("Бүх бүлгийн тоог амжилттай шинэчиллээ!");
                                fetchStats();
                            } else {
                                toast.error("Алдаа гарлаа: " + res.error);
                            }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                        {syncing ? "Шинэчилж байна..." : "Бүлгийн тоог Синхрончлох"}
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm("Supabase-с Neon руу өгөгдөл синхрончлох уу? Энэ нь ISP block-той хүмүүст хэрэгтэй.")) return;
                            const { syncToNeonAction } = await import("@/app/actions/webtoon-actions");
                            setSyncing(true);
                            const res = await syncToNeonAction();
                            setSyncing(false);
                            if (res.success) {
                                toast.success(`Neon Sync амжилттай! (${res.webtoons} вэбтүүн, ${res.chapters} бүлэг)`);
                            } else {
                                toast.error("Sync алдаа: " + res.error);
                            }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl text-xs sm:text-sm font-bold text-primary transition-all disabled:opacity-50"
                    >
                        <Layers className={cn("w-4 h-4", syncing && "animate-spin")} />
                        {syncing ? "Neon Sync..." : "Neon DB Sync"}
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm("Бүх кэшийг цэвэрлэх үү?")) return;
                            setSyncing(true);
                            const { clearCacheAction } = await import("@/app/actions/webtoon-actions");
                            const res = await clearCacheAction();
                            setSyncing(false);
                            if (res.success) {
                                toast.success("Бүх кэш амжилттай цэвэрлэгдлээ!");
                                window.location.reload();
                            } else {
                                toast.error("Алдаа гарлаа");
                            }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-xs sm:text-sm font-bold text-red-500 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                        {syncing ? "Цэвэрлэж байна..." : "Кэш Цэвэрлэх"}
                    </button>
                </div>
            </div>

            {/* Global Settings Section */}
            {isAdmin && (
                <div className="bg-surface border border-primary/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Системийн Тохиргоо</h3>
                            <p className="text-muted text-xs">Аппликейшны глобал төлөвүүдийг удирдах</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-all",
                                    settings.is_nsfw_free_period ? "bg-red-500/20 text-red-500" : "bg-white/5 text-muted"
                                )}>
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm uppercase tracking-wide">+18 Үнэгүй Горим</h4>
                                    <p className="text-muted text-[10px]">Бүх +18 контентыг түр хугацаанд үнэгүй болгох</p>
                                </div>
                            </div>

                            <button
                                onClick={toggleNsfwFreePeriod}
                                disabled={settingsLoading}
                                className={cn(
                                    "p-2 rounded-2xl transition-all active:scale-90 disabled:opacity-50",
                                    settings.is_nsfw_free_period ? "text-red-500" : "text-muted"
                                )}
                            >
                                {settings.is_nsfw_free_period ? (
                                    <ToggleRight className="w-12 h-12" />
                                ) : (
                                    <ToggleLeft className="w-12 h-12" />
                                )}
                            </button>
                        </div>

                        {/* Schedule Quick Link */}
                        <div 
                            onClick={() => window.location.href = '/admin/schedule'}
                            className="flex items-center justify-between p-6 bg-primary/5 rounded-3xl border border-primary/10 hover:border-primary/50 transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm uppercase tracking-wide">Гарах Хуваарь</h4>
                                    <p className="text-muted text-[10px]">
                                        Өнөөдөр: {todaySchedules.length > 0 ? todaySchedules.map(s => s.webtoons?.title).join(', ') : 'Хуваарьгүй'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-primary text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                <TrendingUp className="w-4 h-4 rotate-45" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loader / Content */}
            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    </div>
                    <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Мэдээлэл нэгтгэж байна...</p>
                </div>
            ) : (
                <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-surface border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-primary/20 transition-all">
                        <div>
                            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">{card.label}</p>
                            <h3 className="text-3xl font-black">{card.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bg} ${card.color}`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Growth Chart - Only for Admins */}
                {isAdmin && (
                    <div className="lg:col-span-2 bg-surface border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary"><TrendingUp className="w-5 h-5" /></div>
                            <h3 className="font-bold text-lg">Хэрэглэгчийн өсөлт</h3>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Genre Distribution */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><Activity className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Төрлийн тархалт</h3>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genreData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genreData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Popular Webtoons */}
                <div className="lg:col-span-2 bg-surface border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><TrendingUp className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Хамгийн их дагагчтай</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={popularWebtoons} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="title" stroke="#666" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="follow_count" fill="#e50914" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><MessageCircle className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Сүүлийн сэтгэгдлүүд</h3>
                    </div>
                    <div className="space-y-4">
                        {recentActivities.map((activity, i) => (
                            <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <MessageCircle className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                                        {activity.profiles?.full_name || "Хэрэглэгч"}
                                    </p>
                                    <p className="text-xs text-muted truncate">
                                        {activity.webtoons?.title || "Webtoon"} - {activity.content}
                                    </p>
                                    <p className="text-[10px] text-muted/50 mt-1">
                                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
}
