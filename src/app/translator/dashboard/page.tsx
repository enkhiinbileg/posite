'use client';

import { useState, useEffect } from 'react';
import {
    TrendingUp, DollarSign, Eye, BookOpen,
    ArrowUpRight, Clock, CheckCircle2, AlertCircle,
    Download, Calendar, ChevronRight, BarChart3, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Stats {
    total_views: number;
    total_earnings: number;
    current_balance: number;
    total_chapters: number;
    total_followers: number;
}

interface Chapter {
    id: number;
    title: string;
    chapter_number: number;
    published_at: string;
    views: number; // This would ideally come from a joined view_count table
    webtoon: { title: string; image?: string };
}

interface DailyStat {
    date: string;
    views: number;
}

export default function TranslatorDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        total_views: 0,
        total_earnings: 0,
        current_balance: 0,
        total_chapters: 0,
        total_followers: 0
    });
    const [recentChapters, setRecentChapters] = useState<Chapter[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const [monthlyStats, setMonthlyStats] = useState({ views: 0, earnings: 0 });
    const [thisMonthTotalViews, setThisMonthTotalViews] = useState(0);

    // Transparency Stats (Global)
    const [poolStats, setPoolStats] = useState({
        totalPool: 0,
        totalReads: 0,
        currentRate: 0
    });

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            // 1. Load Lifetime Stats
            const { data: statData } = await supabase
                .from('translator_stats')
                .select('*')
                .eq('translator_id', user.id)
                .single();

            if (statData) {
                setStats({
                    total_views: statData.total_views_generated || 0,
                    total_earnings: statData.total_earnings || 0,
                    current_balance: statData.current_balance || 0,
                    total_chapters: statData.total_chapters_translated || 0,
                    total_followers: statData.total_followers || 0
                });
            }

            // 1.5 Load THIS MONTH Stats (VIP & Total)
            const now = new Date();
            // Start of current month (e.g. 2026-02-01)
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // A. VIP & Earnings from Monthly Table
            // STRICTLY query for records created >= 1st of this month
            const { data: monthData } = await supabase
                .from('translator_monthly_stats')
                .select('vip_reads, total_earnings')
                .eq('translator_id', user.id)
                .gte('month_date', startOfMonth.toISOString().slice(0, 10))
                .order('month_date', { ascending: false })
                .limit(1)
                .single();

            if (monthData) {
                setMonthlyStats({
                    views: monthData.vip_reads || 0,
                    earnings: monthData.total_earnings || 0
                });
            } else {
                // No record for this month -> Show 0
                setMonthlyStats({ views: 0, earnings: 0 });
            }

            // B. Total Reads (All Users) for This Month - Real-time Calculation
            const { count: totalMonthCount } = await supabase
                .from('reading_progress')
                .select('chapters!inner(translator_id)', { count: 'exact', head: true })
                .eq('chapters.translator_id', user.id)
                .gte('last_read_at', startOfMonth.toISOString());

            setThisMonthTotalViews(totalMonthCount || 0);

            // 2. Load Recent Chapters & Top Performers
            const { data: chapters } = await supabase
                .from('chapters')
                .select('id, title, chapter_number, published_at, created_at, views, webtoons(title, image)')
                .eq('translator_id', user.id)
                .order('published_at', { ascending: false })
                .limit(10); // Fetch more for local sorting if needed

            if (chapters) {
                setRecentChapters(chapters.map((c: any) => {
                    const webtoonData = Array.isArray(c.webtoons) ? c.webtoons[0] : c.webtoons;
                    return {
                        ...c,
                        webtoon: webtoonData || { title: 'Unknown Webtoon' },
                        published_at: c.published_at || c.created_at,
                        views: c.views || 0 // Use REAL views from DB
                    };
                }));
            }

            // 3. Load Daily Views (Mock/Real Hybrid)
            // Real query: Fetch reading_progress linked to my chapters in last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: viewsData } = await supabase
                .from('reading_progress')
                .select('last_read_at, chapters!inner(translator_id)')
                .eq('chapters.translator_id', user.id)
                .gte('last_read_at', sevenDaysAgo.toISOString());

            // Process Daily Stats
            const dayMap: Record<string, number> = {};
            // Initialize last 7 days
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                dayMap[k] = 0;
            }

            // Fill with data using locale string key
            if (viewsData) {
                viewsData.forEach((v: any) => {
                    const d = new Date(v.last_read_at);
                    const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (dayMap[k] !== undefined) dayMap[k]++;
                });
            }

            // Convert to array
            const chartData = Object.keys(dayMap).map(date => ({
                date,
                views: dayMap[date] // + Math.floor(Math.random() * 10) // Uncomment for demo data if DB is empty
            }));

            setDailyStats(chartData);
            // 2. Fetch Global Transparency Stats (Live calculation)
            // A. Get Total VIP Revenue from Grants for this month
            const { data: vipGrants } = await supabase
                .from('vip_grants')
                .select('price')
                .gte('granted_at', startOfMonth.toISOString());

            const totalRevenue = vipGrants?.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) || 0;
            const poolSize = totalRevenue * 0.3; // 30%

            // B. Get Total VIP Reads from ALL translators
            const { data: globalReads } = await supabase
                .from('translator_monthly_stats')
                .select('vip_reads')
                .gte('month_date', startOfMonth.toISOString().slice(0, 10));

            const totalGlobalReads = globalReads?.reduce((acc, curr) => acc + (curr.vip_reads || 0), 0) || 0;

            // C. Calculate Rate
            const rate = totalGlobalReads > 0 ? (poolSize / totalGlobalReads) : 0;

            setPoolStats({
                totalPool: poolSize,
                totalReads: totalGlobalReads,
                currentRate: Math.round(rate)
            });


            setIsLoading(false);
        }

        loadData();
    }, [router]);

    const handleRequestPayout = async () => {
        if (stats.current_balance < 50000) {
            toast.error('Доод тал нь 50,000₮ хүрсэн үед татах боломжтой.');
            return;
        }

        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1000)), // Simulate API
            {
                loading: 'Хүсэлт илгээж байна...',
                success: 'Татан авах хүсэлт амжилттай илгээгдлээ!',
                error: 'Алдаа гарлаа'
            }
        );
    };

    if (isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white"><ArrowUpRight className="animate-spin" /> Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Миний Самбар</h1>
                        <p className="text-muted text-sm font-bold">Орчуулагчийн Санхүүгийн Төв</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin/webtoons')} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                            Вэбтүүнүүд
                        </button>
                        <button onClick={() => router.push('/admin/imagetrans')} className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20">
                            Infinite Editor
                        </button>
                    </div>
                </div>

                {/* ANALYTICS CHART SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-surface border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Уншилтын Түүх</h3>
                                <p className="text-xs text-muted font-bold uppercase tracking-widest">Сүүлийн 7 хоног</p>
                            </div>
                            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-xl">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-black">+24%</span>
                            </div>
                        </div>

                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyStats}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Balance Card (Moved here) */}
                    <div className="bg-gradient-to-br from-primary to-purple-900 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-primary/20 flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                        <div className="relative z-10">
                            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Боломжит Үлдэгдэл</p>
                            <h2 className="text-4xl font-black text-white tracking-tight">{stats.current_balance.toLocaleString()}₮</h2>
                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between text-xs text-white/80 font-medium">
                                    <span>Энэ сарын орлого</span>
                                    <span className="font-bold text-green-400">+{monthlyStats.earnings.toLocaleString()}₮</span>
                                </div>
                                <div className="flex justify-between text-xs text-white/80 font-medium">
                                    <span>Нийт орлого</span>
                                    <span className="font-bold">{stats.total_earnings.toLocaleString()}₮</span>
                                </div>
                                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-3/4" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRequestPayout}
                            className="mt-6 w-full py-3 bg-white text-primary hover:bg-gray-100 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4" /> Татан Авах
                        </button>
                    </div>
                </div>

                {/* ALERT: Transparency Banner */}
                <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Live Royalty Pool Stats</h3>
                            <p className="text-sm text-muted">
                                Орлого хуваарилалт бүрэн ил тод.
                                <span className="text-blue-400 font-medium ml-1">
                                    Таны хувь: {poolStats.totalReads > 0 ? ((monthlyStats.views / poolStats.totalReads) * 100).toFixed(2) : 0}%
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <div className="text-center min-w-[100px]">
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Total Pool</p>
                            <p className="text-xl font-black text-white">{poolStats.totalPool.toLocaleString()}₮</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center min-w-[100px]">
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Total VIP Reads</p>
                            <p className="text-xl font-black text-white">{poolStats.totalReads.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center min-w-[100px]">
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Current Rate</p>
                            <p className="text-xl font-black text-emerald-400">≈{poolStats.currentRate}₮</p>
                            <p className="text-[8px] text-muted">per read</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: "Энэ Сар (Нийт)", value: thisMonthTotalViews.toLocaleString(), icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { label: "Энэ Сар (VIP)", value: monthlyStats.views.toLocaleString(), icon: Calendar, color: "text-green-500", bg: "bg-green-500/10" },
                        { label: "Нийт Бүлэг", value: stats.total_chapters, icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        { label: "Дагагчид", value: stats.total_followers?.toLocaleString() || "0", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
                    ].map((item, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted font-black uppercase tracking-widest">{item.label}</p>
                                <h4 className="text-xl font-bold text-white">{item.value}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Activity & Top Chapters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Uploads */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" /> Сүүлийн нийтлэлүүд
                            </h3>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden">
                            {recentChapters.slice(0, 5).map((chapter, i) => (
                                <div key={chapter.id} className="p-4 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                    <div className="w-12 h-16 bg-black/40 rounded-lg overflow-hidden shrink-0">
                                        {/* Placeholder for image if available */}
                                        {chapter.webtoon.image ? <img src={chapter.webtoon.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{chapter.webtoon.title}</h4>
                                        <p className="text-xs text-muted">Chapter {chapter.chapter_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                                            <Eye className="w-3 h-3 text-muted" /> {chapter.views}
                                        </div>
                                        <div className="text-[10px] text-muted">{new Date(chapter.published_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            ))}
                            {recentChapters.length === 0 && <div className="p-8 text-center text-muted text-sm">Одоогоор нийтлэл алга.</div>}
                        </div>
                    </div>

                    {/* Top Performers (Mocked/Sorted Locally) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-yellow-500" /> Шилдэг Бүлгүүд
                            </h3>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden">
                            {[...recentChapters].sort((a, b) => b.views - a.views).slice(0, 5).map((chapter, i) => (
                                <div key={chapter.id} className="p-4 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-xs">
                                        #{i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-white truncate">{chapter.title || 'Untitled'}</h4>
                                        <p className="text-[10px] text-muted uppercase tracking-widest">{chapter.webtoon.title}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-white">{chapter.views}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase">Views</div>
                                    </div>
                                </div>
                            ))}
                            {recentChapters.length === 0 && <div className="p-8 text-center text-muted text-sm">Одоогоор мэдээлэл алга.</div>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
