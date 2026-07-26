"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart3, Users, BookOpen, CheckCircle2,
    ArrowUpRight, ArrowDownRight, Loader2,
    TrendingUp, Calendar, Search, Filter,
    ChevronRight, Eye
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatsData {
    totalViews: number;
    uniqueReaders: number;
    completionRate: number;
    dailyStats: any[];
    webtoonStats: any[];
    recentActivity: any[];
}

export default function AdminStats() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [timeRange, setTimeRange] = useState("30"); // days

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    async function fetchStats() {
        setLoading(true);
        try {
            // 1. Fetch reading progress data
            const { data: progress, error: progressError } = await supabase
                .from('reading_progress')
                .select(`
                    *,
                    webtoons (title, image),
                    chapters (title)
                `)
                .order('last_read_at', { ascending: false });

            if (progressError) throw progressError;

            // 2. Aggregate Data
            const totalViews = progress?.length || 0;
            const uniqueReadersSet = new Set(progress?.map(p => p.user_id));
            const uniqueReaders = uniqueReadersSet.size;
            const finishedCount = progress?.filter(p => p.is_finished).length || 0;
            const completionRate = totalViews > 0 ? (finishedCount / totalViews) * 100 : 0;

            // 3. Daily Stats (Last N days)
            const daysToFetch = parseInt(timeRange);
            const dailyMap: Record<string, { date: string, views: number, unique: number }> = {};

            // Initialize last N days
            for (let i = daysToFetch - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateKey = d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
                dailyMap[dateKey] = { date: dateKey, views: 0, unique: 0 };
            }

            const dailyUniqueMap: Record<string, Set<string>> = {};

            progress?.forEach(p => {
                const date = new Date(p.last_read_at);
                const dateKey = date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });

                if (dailyMap[dateKey]) {
                    dailyMap[dateKey].views += 1;
                    if (!dailyUniqueMap[dateKey]) dailyUniqueMap[dateKey] = new Set();
                    dailyUniqueMap[dateKey].add(p.user_id);
                }
            });

            Object.keys(dailyUniqueMap).forEach(key => {
                if (dailyMap[key]) dailyMap[key].unique = dailyUniqueMap[key].size;
            });

            const dailyStats = Object.values(dailyMap);

            // 4. Webtoon Performance
            const webtoonMap: Record<number, any> = {};
            progress?.forEach(p => {
                if (!p.webtoon_id) return;
                if (!webtoonMap[p.webtoon_id]) {
                    webtoonMap[p.webtoon_id] = {
                        id: p.webtoon_id,
                        title: p.webtoons?.title || "Unknown",
                        image: p.webtoons?.image,
                        views: 0,
                        uniqueReaders: new Set(),
                        finished: 0
                    };
                }
                webtoonMap[p.webtoon_id].views += 1;
                webtoonMap[p.webtoon_id].uniqueReaders.add(p.user_id);
                if (p.is_finished) webtoonMap[p.webtoon_id].finished += 1;
            });

            const webtoonStats = Object.values(webtoonMap)
                .map(w => ({
                    ...w,
                    uniqueReaders: w.uniqueReaders.size,
                    completionRate: (w.finished / w.views) * 100
                }))
                .sort((a, b) => b.views - a.views);

            // 5. Recent Activity
            const recentActivity = progress?.slice(0, 10).map(p => ({
                id: p.id,
                user: p.profiles?.full_name || "Зочин",
                webtoon: p.webtoons?.title,
                chapter: p.chapters?.title,
                time: p.last_read_at,
                is_finished: p.is_finished
            })) || [];

            setStats({
                totalViews,
                uniqueReaders,
                completionRate,
                dailyStats,
                webtoonStats,
                recentActivity
            });

        } catch (error: any) {
            console.error("Error fetching stats details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert("Error: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
    }

    const cards = [
        { label: "Нийт Үзэлт", value: stats?.totalViews.toLocaleString(), icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+12%" },
        { label: "Уншигчид", value: stats?.uniqueReaders.toLocaleString(), icon: Users, color: "text-green-500", bg: "bg-green-500/10", trend: "+5%" },
        { label: "Дуусгалт", value: `${stats?.completionRate.toFixed(1)}%`, icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10", trend: "+2%" },
        { label: "Идэвхтэй Вэбтүүн", value: stats?.webtoonStats.length, icon: BookOpen, color: "text-orange-500", bg: "bg-orange-500/10", trend: "0%" },
    ];

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Нарийн Статистик</h2>
                    <p className="text-muted">Уншилтын дэлгэрэнгүй мэдээлэл болон хэрэглэгчийн зан төлөв</p>
                </div>

                <div className="flex items-center gap-2 bg-surface p-1 rounded-2xl border border-white/5">
                    {[
                        { label: "7 хоног", value: "7" },
                        { label: "30 хоног", value: "30" },
                        { label: "90 хоног", value: "90" },
                    ].map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                timeRange === range.value
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-muted hover:text-white"
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-surface border border-white/5 p-6 rounded-3xl group hover:border-primary/20 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.bg, card.color)}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                                <ArrowUpRight className="w-3 h-3" />
                                {card.trend}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">{card.label}</p>
                            <h3 className="text-3xl font-black">{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-surface border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><TrendingUp className="w-5 h-5" /></div>
                            <h3 className="font-bold text-xl text-white">Уншилтын Идэвх</h3>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.dailyStats}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e50914" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '16px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="views" name="Нийт үзэлт" stroke="#e50914" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="unique" name="Уншигчид" stroke="#22c55e" strokeWidth={4} fillOpacity={1} fill="url(#colorUnique)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Popular Performance (Top 5) */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8">
                    <h3 className="font-bold text-xl text-white mb-6">Шилдэг Вэбтүүн</h3>
                    <div className="space-y-6">
                        {stats?.webtoonStats.slice(0, 5).map((w, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                                    <img src={w.image} className="w-full h-full object-cover" />
                                    <div className="absolute top-0 left-0 w-5 h-5 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-br-lg shadow-lg">
                                        {i + 1}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{w.title}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted">
                                            <Eye className="w-3 h-3" />
                                            {w.views}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-green-500">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {w.completionRate.toFixed(0)}%
                                        </div>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${w.completionRate}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detailed Stats Table */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-xl text-white">Бүх Вэбтүүний Үзүүлэлт</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            placeholder="Вэбтүүн хайх..."
                            className="bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-primary/50 outline-none w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                                <th className="px-8 py-4">Вэбтүүн</th>
                                <th className="px-8 py-4 text-center">Нийт Үзэлт</th>
                                <th className="px-8 py-4 text-center">Уншигчид</th>
                                <th className="px-8 py-4 text-center">Дуусгалт</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats?.webtoonStats.map((w, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={w.image} className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                                            <span className="font-bold text-sm">{w.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center font-bold">{w.views.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-center text-muted">{w.uniqueReaders.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-bold text-green-500">{w.completionRate.toFixed(1)}%</span>
                                            <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500" style={{ width: `${w.completionRate}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted hover:text-white">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface border border-white/5 rounded-3xl p-8">
                <h3 className="font-bold text-xl text-white mb-6">Сүүлийн үеийн уншилт</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats?.recentActivity.map((act, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                act.is_finished ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                            )}>
                                {act.is_finished ? <CheckCircle2 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-bold text-sm truncate">{act.webtoon}</h4>
                                    <span className="text-[10px] text-muted whitespace-nowrap">
                                        {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted truncate">{act.user} - {act.chapter}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
