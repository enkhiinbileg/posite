"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { 
    ShieldCheck, ToggleLeft, ToggleRight, Sparkles as SparklesIcon, 
    RefreshCw, Layers, Loader2, TrendingUp, Users, Crown, 
    Activity, Database, ShieldAlert, Zap
} from "lucide-react";
import { syncAllWebtoonChapterCounts, syncToNeonAction, clearCacheAction } from "@/app/actions/webtoon-actions";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSiteSettings, updateSiteSetting } from "@/app/actions/settings-actions";

export default function AdminControlPage() {
    const [stats, setStats] = useState({
        users: 0,
        vipUsers: 0,
        nsfwVipUsers: 0,
        totalLikes: 0,
        webtoons: 0
    });
    const [packageBreakdown, setPackageBreakdown] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [settingsLoading, setSettingsLoading] = useState(false);

    useEffect(() => {
        const cachedData = localStorage.getItem('admin_stats_cache');
        if (cachedData) {
            try {
                const { stats: cachedStats, chartData: cachedChart, packageBreakdown: cachedPackages, timestamp } = JSON.parse(cachedData);
                // Cache for 5 minutes
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    setStats(cachedStats);
                    setChartData(cachedChart);
                    setPackageBreakdown(cachedPackages || []);
                    setLoading(false);
                    setChartLoading(false);
                    // Still fetch fresh data in background
                    fetchAdminData(true);
                    return;
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }
        fetchAdminData();
    }, []);

    async function fetchAdminData(isBackground = false) {
        if (!isBackground) {
            setLoading(true);
            setChartLoading(true);
        }
        try {
            const [settingsRes, statsRes] = await Promise.all([
                getSiteSettings(),
                fetch('/api/admin/stats').then(res => res.json())
            ]);

            if (settingsRes.success) setSettings(settingsRes.settings || {});
            
            if (statsRes) {
                const newStats = {
                    users: statsRes.users || 0,
                    vipUsers: statsRes.vipUsers || 0,
                    nsfwVipUsers: statsRes.nsfwVipUsers || 0,
                    totalLikes: statsRes.likes || 0,
                    webtoons: statsRes.webtoons || 0
                };
                const newChart = statsRes.userGrowth || [];
                const newPackages = statsRes.packageBreakdown || [];
                
                setStats(newStats);
                setChartData(newChart);
                setPackageBreakdown(newPackages);

                // Update cache
                localStorage.setItem('admin_stats_cache', JSON.stringify({
                    stats: newStats,
                    chartData: newChart,
                    packageBreakdown: newPackages,
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            if (!isBackground) toast.error("Мэдээлэл авахад алдаа гарлаа");
        } finally {
            setLoading(false);
            setChartLoading(false);
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
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded uppercase tracking-widest">Админ удирдлага</span>
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Системийн хяналт</h2>
                    <p className="text-muted">Аппликейшны чухал тохиргоо болон системийн төлөвүүд</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={async () => {
                            if (!confirm("Бүх кэшийг цэвэрлэх үү?")) return;
                            setSyncing(true);
                            const res = await clearCacheAction();
                            setSyncing(false);
                            if (res.success) toast.success("Кэш цэвэрлэгдлээ!");
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-xs font-bold text-red-500 transition-all"
                    >
                        <Zap className="w-4 h-4" />
                        Кэш Цэвэрлэх
                    </button>
                    
                    <button
                        onClick={async () => {
                            setSyncing(true);
                            const res = await syncToNeonAction();
                            setSyncing(false);
                            if (res.success) toast.success("Neon Sync амжилттай!");
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold transition-all"
                    >
                        <Database className="w-4 h-4" />
                        DB Sync
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Нийт Хэрэглэгч", value: stats.users, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "VIP Хэрэглэгч", value: stats.vipUsers, icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                    { label: "+18 VIP", value: stats.nsfwVipUsers, icon: Crown, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Системийн Төлөв", value: "Online", icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
                    { label: "Вэбтүүний тоо", value: stats.webtoons, icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((card, i) => (
                    <div key={i} className="bg-surface border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-primary/20 transition-all group">
                        <div>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{card.label}</p>
                            {loading ? (
                                <div className="h-9 w-20 bg-white/5 animate-pulse rounded-lg mt-1" />
                            ) : (
                                <h3 className="text-3xl font-black group-hover:text-primary transition-colors">{card.value}</h3>
                            )}
                        </div>
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", card.bg, card.color)}>
                            <card.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Settings & Maintenance */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface border border-primary/20 rounded-3xl p-6 shadow-lg shadow-primary/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg">Системийн тохиргоо</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <h4 className="font-bold text-sm">+18 Үнэгүй Горим</h4>
                                    <p className="text-[10px] text-muted">Түр хугацаанд үнэгүй болгох</p>
                                </div>
                                <button
                                    onClick={toggleNsfwFreePeriod}
                                    disabled={settingsLoading}
                                    className={cn(
                                        "p-1 rounded-xl transition-all",
                                        settings.is_nsfw_free_period ? "text-red-500" : "text-muted"
                                    )}
                                >
                                    {settings.is_nsfw_free_period ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                </button>
                            </div>

                            <button
                                onClick={async () => {
                                    setSyncing(true);
                                    const res = await syncAllWebtoonChapterCounts();
                                    setSyncing(false);
                                    if (res.success) toast.success("Бүлгийн тоо синхрончлогдлоо");
                                }}
                                disabled={syncing}
                                className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                            >
                                <div className="text-left">
                                    <h4 className="font-bold text-sm">Бүлгийн тоо</h4>
                                    <p className="text-[10px] text-muted">Webtoon бүрийн тоог шинэчлэх</p>
                                </div>
                                <RefreshCw className={cn("w-5 h-5 text-primary", syncing && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-surface border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                <Database className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg">DB Health</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted">Supabase Storage</span>
                                <span className="font-bold text-green-500">Healthy</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted">Neon Mirroring</span>
                                <span className="font-bold text-green-500">Active</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                <span className="text-muted">API Latency</span>
                                <span className="font-bold text-yellow-500">45ms</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Growth Chart */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-surface border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg">Хэрэглэгчийн өсөлт (Cumulative)</h3>
                            </div>
                        </div>
                        
                        <div className="h-[350px] w-full flex items-center justify-center">
                            {chartLoading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="w-8 h-8 text-primary/40 animate-spin" />
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">График ачаалж байна...</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '16px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Package Breakdown */}
                    <div className="bg-surface border border-white/5 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-500">
                                <Crown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Багц ашиглалт</h3>
                                <p className="text-muted text-xs">Ямар багцыг хэдэн хүн авсан статистик</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl" />
                                ))
                            ) : packageBreakdown.length > 0 ? (
                                packageBreakdown.map((pkg, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                                                {pkg.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white uppercase text-sm">{pkg.name}</h4>
                                                <p className="text-muted text-[10px]">{pkg.active} хэрэглэгч идэвхтэй байна</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-white">{pkg.active}</p>
                                            <p className="text-[10px] text-muted uppercase font-bold tracking-tighter">Идэвхтэй эрхтэй</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-muted text-xs uppercase font-bold">Багцын мэдээлэл олдсонгүй</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
