"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Youtube, Users, Wallet, Copy, ExternalLink, Clock, CheckCircle2, TrendingUp, BarChart3, Star, Award } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function YoutuberDashboard() {
    const [profile, setProfile] = useState<any>(null);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalEarned: 0,
        pendingBalance: 0,
        totalReferrals: 0,
        totalClicks: 0,
        conversionRate: 0
    });
    const [topWebtoons, setTopWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        setProfile(profile);

        // 2. Fetch Commissions
        const { data: commissionsData } = await supabase
            .from('commissions')
            .select(`
                *,
                buyer:profiles!commissions_buyer_id_fkey(full_name, avatar_url)
            `)
            .eq('youtuber_id', user.id)
            .order('created_at', { ascending: false });

        if (commissionsData) {
            setCommissions(commissionsData);

            const total = commissionsData.reduce((acc, curr) => acc + Number(curr.commission_amount), 0);
            const pending = commissionsData
                .filter(c => c.status === 'pending')
                .reduce((acc, curr) => acc + Number(curr.commission_amount), 0);

            // 3. Fetch Total Referrals Count
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by', user.id);

            setStats({
                totalEarned: total,
                pendingBalance: pending,
                totalReferrals: count || 0,
                totalClicks: profile.referral_clicks || 0,
                conversionRate: profile.referral_clicks > 0 ? ((count || 0) / profile.referral_clicks) * 100 : 0
            });

            // 4. Fetch Top Webtoons read by referred users
            const { data: topData } = await supabase
                .from('reading_progress')
                .select(`
                    webtoon_id,
                    webtoons (title, image)
                `)
                .in('user_id', await (async () => {
                    const { data } = await supabase.from('profiles').select('id').eq('referred_by', user.id);
                    return data?.map(d => d.id) || [];
                })())
                .limit(20);

            if (topData) {
                // Group by webtoon_id and count
                const counts = topData.reduce((acc: any, curr: any) => {
                    const id = curr.webtoon_id;
                    if (!acc[id]) acc[id] = { count: 0, title: curr.webtoons.title, image: curr.webtoons.image };
                    acc[id].count++;
                    return acc;
                }, {});

                const sorted = Object.values(counts)
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 3);
                setTopWebtoons(sorted);
            }
        }
        setLoading(false);
    }

    const copyRefLink = () => {
        if (!profile?.referral_code) {
            toast.error("Танд referral код тохируулаагүй байна. Админтай холбогдоно уу.");
            return;
        }
        const link = `${window.location.origin}/?ref=${profile.referral_code}`;
        navigator.clipboard.writeText(link);
        toast.success("Referral холбоос хуулагдлаа!");
    };

    if (loading) return <div className="p-8 text-white uppercase font-black">Уншиж байна...</div>;

    if (!profile?.is_youtuber) {
        return <div className="p-10 text-white bg-red-500/10 border border-red-500/20 rounded-2xl">
            Танд энэ хуудсыг үзэх эрх байхгүй байна.
        </div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Youtube className="w-8 h-8 text-red-600" />
                        YouTuber Dashboard
                    </h1>
                    <p className="text-muted font-medium mt-1">Орлого болон бүртгэлээ эндээс хянах боломжтой</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Таны Урамшуулал</span>
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-tighter",
                            profile.affiliate_tier === 'gold' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                profile.affiliate_tier === 'silver' ? "bg-gray-300/10 border-gray-300/20 text-gray-300" :
                                    "bg-orange-500/10 border-orange-500/20 text-orange-500"
                        )}>
                            <Award className="w-4 h-4" />
                            {profile.affiliate_tier || 'bronze'} Tier
                            <span className="opacity-50 ml-2">
                                ({profile.affiliate_tier === 'gold' ? '30%' : profile.affiliate_tier === 'silver' ? '25%' : '20%'})
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Таны Referral холбоос</span>
                        <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                            <code className="px-3 text-sm text-primary font-bold">{profile.referral_code || 'Тохируулаагүй'}</code>
                            <button
                                onClick={copyRefLink}
                                className="p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface border border-white/5 p-6 rounded-[32px] space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-black uppercase tracking-widest">Нийт хэрэглэгч</p>
                        <h3 className="text-3xl font-black text-white">{stats.totalReferrals}</h3>
                        <p className="text-[10px] text-muted font-bold mt-1">Clicks: {stats.totalClicks}</p>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-[32px] space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-black uppercase tracking-widest">Conversion</p>
                        <h3 className="text-3xl font-black text-white">{stats.conversionRate.toFixed(1)}%</h3>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-[32px] space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-black uppercase tracking-widest">Нийт орлого</p>
                        <h3 className="text-3xl font-black text-white">{stats.totalEarned.toLocaleString()}₮</h3>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-[32px] space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-black uppercase tracking-widest">Хүлээгдэж буй</p>
                        <h3 className="text-3xl font-black text-white">{stats.pendingBalance.toLocaleString()}₮</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Webtoons */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Төрөлх хитүүд
                    </h2>
                    <div className="space-y-4">
                        {topWebtoons.map((w: any, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="w-12 h-16 rounded-lg bg-white/10 overflow-hidden shrink-0">
                                    <img src={w.image} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-sm truncate">{w.title}</h4>
                                    <p className="text-[10px] text-muted font-black uppercase tracking-widest">{w.count} уншигч</p>
                                </div>
                                <div className="text-2xl font-black text-white/10 italic">#{i + 1}</div>
                            </div>
                        ))}
                        {topWebtoons.length === 0 && (
                            <div className="p-8 text-center text-muted font-bold italic bg-white/5 rounded-2xl">
                                Мэдээлэл цугларч байна...
                            </div>
                        )}
                    </div>
                </div>

                {/* Commissions Table */}
                <section className="lg:col-span-2 bg-surface border border-white/5 rounded-[40px] overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Сүүлийн гүйлгээнүүд</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted border-b border-white/5">
                                    <th className="px-8 py-6">Хэрэглэгч</th>
                                    <th className="px-8 py-6">Дүн</th>
                                    <th className="px-8 py-6 text-primary">Таны Хувь</th>
                                    <th className="px-8 py-6">Огноо</th>
                                    <th className="px-8 py-6">Төлөв</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {commissions.map((c) => (
                                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden">
                                                    <img
                                                        src={c.buyer?.avatar_url || `https://ui-avatars.com/api/?name=${c.buyer?.full_name}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <span className="text-sm font-bold text-white">{c.buyer?.full_name || 'Нууц хэрэглэгч'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-medium text-muted">{Number(c.amount).toLocaleString()}₮</td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-primary">+{Number(c.commission_amount).toLocaleString()}₮</span>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-muted">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            {c.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1.5 text-green-500 font-bold text-xs">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Төлөгдсөн
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-yellow-500/50 font-bold text-xs uppercase tracking-widest">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Хүлээгдэж буй
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {commissions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-muted font-bold italic">
                                            Одоогоор гүйлгээ байхгүй байна.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
