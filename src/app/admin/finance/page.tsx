"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    DollarSign, TrendingUp, Users, Wallet,
    ArrowUpRight, ArrowDownRight, Loader2,
    CreditCard, Calendar, CheckCircle2, AlertCircle,
    Crown
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface FinanceStats {
    translator: {
        totalEarnings: number;
        pendingBalance: number;
        totalTranslators: number;
        topEarner: any;
    };
    youtuber: {
        totalEarnings: number;
        pendingBalance: number;
        totalYoutubers: number;
        topEarner: any;
    };
}

export default function AdminFinancePage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [translators, setTranslators] = useState<any[]>([]);
    const [monthlyPoolData, setMonthlyPoolData] = useState({ totalVipReads: 0, autoRevenue: 0, vipGrantCount: 0 });
    const [revenueInput, setRevenueInput] = useState<number>(0);
    const [useAutoRevenue, setUseAutoRevenue] = useState(true);
    const [recentVipGrants, setRecentVipGrants] = useState<any[]>([]);

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Translator Stats
            const { data: transStats, error: transError } = await supabase
                .from('translator_stats')
                .select(`
                    *,
                    profile:profiles!translator_stats_profiles_fkey(full_name, avatar_url, email)
                `)
                .order('total_earnings', { ascending: false });

            if (transError) {
                console.error("Translator Stats Error:", transError);
                throw transError;
            }

            // 2. Fetch YouTuber Stats (Commissions)
            const { data: commissions, error: commError } = await supabase
                .from('commissions')
                .select('amount, commission_amount, status, youtuber_id');

            if (commError) throw commError;

            // --- PROCESS TRANSLATOR DATA ---
            const totalTransEarnings = transStats?.reduce((acc, curr) => acc + (curr.total_earnings || 0), 0) || 0;
            const pendingTransBalance = transStats?.reduce((acc, curr) => acc + (curr.current_balance || 0), 0) || 0;
            const topTrans = transStats?.[0];

            setTranslators(transStats || []);

            // --- PROCESS YOUTUBER DATA ---
            const totalYoutuberEarnings = commissions?.reduce((acc, curr) => acc + (Number(curr.commission_amount) || 0), 0) || 0;
            const pendingYoutuberBalance = commissions
                ?.filter(c => c.status === 'pending')
                .reduce((acc, curr) => acc + (Number(curr.commission_amount) || 0), 0) || 0;

            const uniqueYoutubers = new Set(commissions?.map(c => c.youtuber_id)).size;

            setStats({
                translator: {
                    totalEarnings: totalTransEarnings,
                    pendingBalance: pendingTransBalance,
                    totalTranslators: transStats?.length || 0,
                    topEarner: topTrans
                },
                youtuber: {
                    totalEarnings: totalYoutuberEarnings,
                    pendingBalance: pendingYoutuberBalance,
                    totalYoutubers: uniqueYoutubers,
                    topEarner: null
                }
            });

            // 3. Fetch THIS MONTH's VIP reads
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const monthStr = startOfMonth.toISOString().slice(0, 10);

            const { data: monthlyStats } = await supabase
                .from('translator_monthly_stats')
                .select('vip_reads')
                .gte('month_date', monthStr);

            const totalVipReads = monthlyStats?.reduce((acc, curr) => acc + (curr.vip_reads || 0), 0) || 0;

            // 4. Fetch VIP Grants for auto revenue
            const { data: vipGrants } = await supabase
                .from('vip_grants')
                .select('price')
                .gte('granted_at', startOfMonth.toISOString());

            const autoRevenue = vipGrants?.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) || 0;
            const vipGrantCount = vipGrants?.length || 0;

            setMonthlyPoolData({ totalVipReads, autoRevenue, vipGrantCount });
            setRevenueInput(autoRevenue);

            // 5. Fetch Recent VIP Grants
            const { data: recentGrants } = await supabase
                .from('vip_grants')
                .select('*, profiles!vip_grants_user_id_fkey(full_name, unique_id)')
                .order('granted_at', { ascending: false })
                .limit(10);

            setRecentVipGrants(recentGrants || []);

        } catch (error: any) {
            console.error("Finance fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    const totalSystemPayout = (stats?.translator.totalEarnings || 0) + (stats?.youtuber.totalEarnings || 0);
    const totalPendingLiability = (stats?.translator.pendingBalance || 0) + (stats?.youtuber.pendingBalance || 0);

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Санхүүгийн Хяналт</h1>
                <p className="text-muted text-sm font-bold uppercase tracking-widest">Системийн нийт мөнгөн урсгал</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/30 p-8 rounded-[2.5rem] relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-8 opacity-10"><DollarSign className="w-32 h-32" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-400 mb-2">Нийт Түгээгдсэн Орлого</p>
                    <h2 className="text-5xl font-black text-white tracking-tight">{totalSystemPayout.toLocaleString()}₮</h2>
                    <div className="mt-4 flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-widest bg-green-500/10 w-fit px-3 py-1 rounded-lg">
                        <TrendingUp className="w-4 h-4" /> Lifetime Payout
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-orange-500/20 to-red-900/20 border border-orange-500/30 p-8 rounded-[2.5rem] relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-8 opacity-10"><Wallet className="w-32 h-32" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Хүлээгдэж буй өр төлбөр</p>
                    <h2 className="text-5xl font-black text-white tracking-tight">{totalPendingLiability.toLocaleString()}₮</h2>
                    <div className="mt-4 flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-widest bg-orange-500/10 w-fit px-3 py-1 rounded-lg">
                        <AlertCircle className="w-4 h-4" /> Pending Payouts
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Royalty Distribution */}
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-900/20 border border-indigo-500/30 rounded-3xl p-8 space-y-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Royalty Distribution</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted font-bold uppercase tracking-widest">Monthly Creator Pool</p>
                                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => { setUseAutoRevenue(true); setRevenueInput(monthlyPoolData.autoRevenue); }}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${useAutoRevenue ? 'bg-indigo-500 text-white' : 'text-muted hover:text-white'}`}
                                        >
                                            Auto (VIP)
                                        </button>
                                        <button
                                            onClick={() => { setUseAutoRevenue(false); setRevenueInput(0); }}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${!useAutoRevenue ? 'bg-indigo-500 text-white' : 'text-muted hover:text-white'}`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-900/10 border border-green-500/20 rounded-xl p-4">
                            <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-1">Энэ сарын VIP уншилт</p>
                            <div className="text-2xl font-black text-green-400">{monthlyPoolData.totalVipReads.toLocaleString()}</div>
                            <p className="text-[9px] text-muted mt-1">Бүх орчуулагчдын нийт</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted">
                                {useAutoRevenue ? 'VIP Revenue (Auto-Calculated)' : 'Manual Platform Revenue (MNT)'}
                            </label>
                            <div className="relative">
                                <DollarSign className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={revenueInput || ''}
                                    onChange={(e) => {
                                        setRevenueInput(Number(e.target.value));
                                        if (useAutoRevenue) setUseAutoRevenue(false);
                                    }}
                                    readOnly={useAutoRevenue}
                                    className={`w-full border rounded-xl py-3 pl-10 pr-4 font-bold focus:outline-none focus:border-indigo-500 transition-colors ${useAutoRevenue ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 cursor-not-allowed' : 'bg-black/40 border-white/10 text-white'}`}
                                />
                                {useAutoRevenue && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-bold uppercase bg-indigo-500/20 px-2 py-0.5 rounded">
                                        {monthlyPoolData.vipGrantCount} Grants
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Translator Pool (30%)</p>
                            <div className="text-xl font-black text-indigo-400">{(revenueInput * 0.3).toLocaleString()}₮</div>
                            {revenueInput > 0 && monthlyPoolData.totalVipReads > 0 && (
                                <p className="text-[9px] text-emerald-400 mt-1">
                                    ≈ {Math.round((revenueInput * 0.3) / monthlyPoolData.totalVipReads).toLocaleString()}₮/read
                                </p>
                            )}
                        </div>

                        <button
                            onClick={async () => {
                                if (!revenueInput || revenueInput <= 0) return alert('Please enter valid revenue');
                                const confirmDist = window.confirm(`Are you sure you want to distribute ${revenueInput.toLocaleString()} MNT?`);
                                if (!confirmDist) return;

                                try {
                                    const rpcName = useAutoRevenue ? 'distribute_monthly_royalties_auto' : 'distribute_monthly_royalties';
                                    const params = useAutoRevenue
                                        ? { target_month: new Date().toISOString().slice(0, 7) + '-01' }
                                        : { target_month: new Date().toISOString().slice(0, 7) + '-01', input_revenue: revenueInput };

                                    const { error } = await supabase.rpc(rpcName, params);
                                    if (error) throw error;
                                    alert('✅ Distribution Complete!');
                                    window.location.reload();
                                } catch (e: any) {
                                    alert('Error: ' + e.message);
                                }
                            }}
                            className="h-[50px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <CreditCard className="w-4 h-4" /> {useAutoRevenue ? 'Auto Distribute' : 'Distribute Now'}
                        </button>
                    </div>
                </div>

                {/* TRANSLATORS FUND */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Орчуулагчийн Сан</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest">Creator Fund</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-5">
                            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Нийт Орлого</p>
                            <h4 className="text-2xl font-black text-white">{stats?.translator.totalEarnings.toLocaleString()}₮</h4>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-5">
                            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Үлдэгдэл</p>
                            <h4 className="text-2xl font-black text-orange-500">{stats?.translator.pendingBalance.toLocaleString()}₮</h4>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Top Performers</h4>
                        <div className="space-y-4">
                            {translators.slice(0, 3).map((t: any) => (
                                <div key={t.translator_id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 relative overflow-hidden">
                                        {t.profile?.avatar_url && <Image src={t.profile.avatar_url} alt="Av" fill className="object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{t.profile?.full_name || 'N/A'}</div>
                                        <div className="text-[10px] text-muted uppercase font-bold">{t.total_views_generated?.toLocaleString()} Views</div>
                                    </div>
                                    <div className="text-sm font-black text-green-500">
                                        {t.total_earnings?.toLocaleString()}₮
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* YOUTUBERS FUND */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">YouTuber Сан</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest">Affiliate Program</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-5">
                            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Нийт Орлого</p>
                            <h4 className="text-2xl font-black text-white">{stats?.youtuber.totalEarnings.toLocaleString()}₮</h4>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-5">
                            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Үлдэгдэл</p>
                            <h4 className="text-2xl font-black text-orange-500">{stats?.youtuber.pendingBalance.toLocaleString()}₮</h4>
                        </div>
                    </div>

                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl mt-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-white text-sm">Active Partners</h5>
                                <p className="text-xs text-muted mt-1 leading-relaxed">
                                    Current active YouTubers driving traffic: <span className="text-white font-black">{stats?.youtuber.totalYoutubers}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RECENT VIP GRANTS */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-xl text-white uppercase tracking-tight">Сүүлийн VIP Гүйлгээнүүд</h3>
                        <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Шинээр олгогдсон VIP эрхүүд</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <Crown className="w-5 h-5" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                                <th className="px-8 py-4">Хэрэглэгч (ID)</th>
                                <th className="px-8 py-4 text-center">Багц</th>
                                <th className="px-8 py-4 text-center">Үнэ</th>
                                <th className="px-8 py-4 text-center">Хугацаа (Хоног)</th>
                                <th className="px-8 py-4 text-right">Огноо</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentVipGrants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-muted font-bold uppercase tracking-widest text-xs">
                                        Гүйлгээ олдсонгүй
                                    </td>
                                </tr>
                            ) : (
                                recentVipGrants.map((grant) => (
                                    <tr key={grant.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div>
                                                <div className="font-bold text-white text-sm">
                                                    {grant.profiles?.full_name || 'System'}
                                                </div>
                                                <div className="text-[10px] text-yellow-500 font-mono">
                                                    #{grant.profiles?.unique_id || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider 
                                                ${grant.package_type === 'diamond' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                                                    grant.package_type === 'silver' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                        grant.package_type === 'bronze' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                                                            'bg-white/5 text-muted border border-white/5'}`}>
                                                {grant.package_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-center font-black text-green-500">
                                            {grant.price?.toLocaleString()}₮
                                        </td>
                                        <td className="px-8 py-4 text-center text-muted font-bold">
                                            {grant.duration_days}
                                        </td>
                                        <td className="px-8 py-4 text-right font-medium text-white/60 text-xs">
                                            {new Date(grant.granted_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FULL TABLE TRANSLATORS */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-white/5">
                    <h3 className="font-black text-xl text-white uppercase tracking-tight">Бүх Орчуулагчид</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                                <th className="px-8 py-4">Орчуулагч</th>
                                <th className="px-8 py-4 text-center">Нийт Уншилт</th>
                                <th className="px-8 py-4 text-center">Орчуулсан Бүлэг</th>
                                <th className="px-8 py-4 text-right text-green-500">Нийт Орлого</th>
                                <th className="px-8 py-4 text-right text-orange-500">Үлдэгдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {translators.map((t) => (
                                <tr key={t.translator_id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 relative overflow-hidden">
                                                {t.profile?.avatar_url && <Image src={t.profile.avatar_url} alt="Av" fill className="object-cover" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{t.profile?.full_name || 'Unknown'}</div>
                                                <div className="text-[10px] text-muted">{t.profile?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center font-bold text-white">{t.total_views_generated?.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-center text-muted font-bold">{t.total_chapters_translated}</td>
                                    <td className="px-8 py-4 text-right font-black text-green-500">
                                        {t.total_earnings?.toLocaleString()}₮
                                    </td>
                                    <td className="px-8 py-4 text-right font-black text-orange-500">
                                        {t.current_balance?.toLocaleString()}₮
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
