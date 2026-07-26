"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, CheckCircle2, Clock, Search, Filter, Youtube, User, Languages, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PayoutManagement() {
    const [activeTab, setActiveTab] = useState<'youtuber' | 'translator'>('youtuber');
    const [commissions, setCommissions] = useState<any[]>([]);
    const [translatorPayouts, setTranslatorPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [search, setSearch] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'translator'>('admin');

    useEffect(() => {
        checkUserRole();
    }, []);

    useEffect(() => {
        if (activeTab === 'youtuber') {
            fetchCommissions();
        } else {
            fetchTranslatorPayouts();
        }
    }, [activeTab]);

    async function checkUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin, is_translator')
                .eq('id', user.id)
                .single();

            if (profile?.is_translator && !profile?.is_admin) {
                setCurrentUserRole('translator');
                setActiveTab('translator'); // Auto switch for translators
            }
        }
    }

    async function fetchCommissions() {
        setLoading(true);
        const { data, error } = await supabase
            .from('commissions')
            .select(`
                *,
                youtuber:profiles!commissions_youtuber_id_fkey(full_name, avatar_url, email),
                buyer:profiles!commissions_buyer_id_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Дата татахад алдаа гарлаа");
        } else {
            setCommissions(data || []);
        }
        setLoading(false);
    }

    async function fetchTranslatorPayouts() {
        setLoading(true);
        // 1. Fetch Payouts
        const { data: payouts, error } = await supabase
            .from('translator_payouts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            setTranslatorPayouts([]);
            setLoading(false);
            return;
        }

        if (!payouts || payouts.length === 0) {
            setTranslatorPayouts([]);
            setLoading(false);
            return;
        }

        // 2. Manually fetch profiles for these payouts
        const userIds = Array.from(new Set(payouts.map(p => p.translator_id)));
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
        }, {});

        // 3. Combine data
        const joinedData = payouts.map(p => ({
            ...p,
            translator: profileMap[p.translator_id] || { full_name: 'Unknown', email: '' }
        }));

        setTranslatorPayouts(joinedData);
        setLoading(false);
    }

    async function markCommissionPaid(id: string) {
        if (!confirm("Та энэ шимтгэлийг төлсөн гэж тэмдэглэхдээ итгэлтэй байна уу?")) return;

        const { error } = await supabase
            .from('commissions')
            .update({ status: 'paid' })
            .eq('id', id);

        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            setCommissions(commissions.map(c => c.id === id ? { ...c, status: 'paid' } : c));
            toast.success("Төлөгдсөн төлөвт шилжлээ!");
        }
    }

    async function markTranslatorPaid(id: string) {
        if (!confirm("Та энэ цалинг шилжүүлсэн гэж тэмдэглэхдээ итгэлтэй байна уу?")) return;

        const { error } = await supabase
            .from('translator_payouts')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            setTranslatorPayouts(translatorPayouts.map(p => p.id === id ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p));
            toast.success("Төлөгдсөн төлөвт шилжлээ!");
        }
    }

    // Filter Logic
    const currentList = activeTab === 'youtuber' ? commissions : translatorPayouts;
    const filtered = currentList.filter(item => {
        const matchesFilter = filter === 'all' || item.status === filter;

        let matchesSearch = false;
        if (activeTab === 'youtuber') {
            matchesSearch = (item.youtuber?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
                (item.youtuber?.email || "").toLowerCase().includes(search.toLowerCase());
        } else {
            const name = item.translator?.full_name || "Unknown";
            const email = item.translator?.email || "";
            matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                email.toLowerCase().includes(search.toLowerCase());
        }

        return matchesFilter && matchesSearch;
    });

    const pendingTotal = currentList
        .filter(c => c.status === 'pending')
        .reduce((acc, curr) => acc + Number(curr.amount || curr.commission_amount), 0);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-primary" />
                        Payout Management
                    </h1>
                    <p className="text-muted font-medium mt-1">Санхүү болон төлбөр тооцооны удирдлага</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl min-w-[200px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Нийт хүлээгдэж буй ({activeTab === 'youtuber' ? 'YouTubers' : 'Translators'})</p>
                    <h3 className="text-2xl font-black text-white">{pendingTotal.toLocaleString()}₮</h3>
                </div>
            </header>

            {/* Role/Type Tabs (Only for Admins) */}
            {currentUserRole === 'admin' && (
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
                    <button
                        onClick={() => setActiveTab('youtuber')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === 'youtuber' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-muted hover:text-white"
                        )}
                    >
                        <Youtube className="w-4 h-4" /> YouTubers
                    </button>
                    <button
                        onClick={() => setActiveTab('translator')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === 'translator' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-muted hover:text-white"
                        )}
                    >
                        <Languages className="w-4 h-4" /> Translators
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Нэр эсвэл и-мэйлээр хайх..."
                        className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-4 pl-12 pr-4 rounded-2xl text-white focus:outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    {(['all', 'pending', 'paid'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                filter === t ? "bg-primary text-white shadow-lg" : "text-muted hover:text-white"
                            )}
                        >
                            {t === 'all' ? 'Бүгд' : t === 'pending' ? 'Хүлээгдэж буй' : 'Төлөгдсөн'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-surface border border-white/5 rounded-[40px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted border-b border-white/5">
                                <th className="px-8 py-6">{activeTab === 'youtuber' ? 'Partner' : 'Translator'}</th>
                                <th className="px-8 py-6">{activeTab === 'youtuber' ? 'Source' : 'Details'}</th>
                                <th className="px-8 py-6">{activeTab === 'youtuber' ? 'Commission' : 'Amount'}</th>
                                <th className="px-8 py-6">Date</th>
                                <th className="px-8 py-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((item) => (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                    {/* COL 1: User Info */}
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                activeTab === 'youtuber' ? "bg-red-600/10 text-red-600" : "bg-purple-600/10 text-purple-600"
                                            )}>
                                                {activeTab === 'youtuber' ? <Youtube className="w-5 h-5" /> : <Languages className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">
                                                    {activeTab === 'youtuber' ? item.youtuber?.full_name : item.translator?.full_name || "Me"}
                                                </p>
                                                <p className="text-[10px] text-muted font-medium">
                                                    {activeTab === 'youtuber' ? item.youtuber?.email : item.translator?.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* COL 2: Source/Details */}
                                    <td className="px-8 py-6">
                                        {activeTab === 'youtuber' ? (
                                            <div className="flex items-center gap-2 text-muted">
                                                <User className="w-4 h-4" />
                                                <span className="text-sm font-medium">{item.buyer?.full_name}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-xs font-medium">Revenue Share Payout</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* COL 3: Amount */}
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">
                                                {Number(activeTab === 'youtuber' ? item.commission_amount : item.amount).toLocaleString()}₮
                                            </span>
                                            {activeTab === 'youtuber' && (
                                                <span className="text-[10px] text-muted font-bold tracking-tighter">20% of {Number(item.amount).toLocaleString()}₮</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* COL 4: Date */}
                                    <td className="px-8 py-6 text-sm text-muted">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>

                                    {/* COL 5: Action */}
                                    <td className="px-8 py-6">
                                        {item.status === 'paid' ? (
                                            <div className="flex items-center gap-1.5 text-green-500 font-bold text-xs">
                                                <CheckCircle2 className="w-4 h-4" />
                                                ТӨЛӨГДСӨН
                                            </div>
                                        ) : currentUserRole === 'admin' ? (
                                            <button
                                                onClick={() => activeTab === 'youtuber' ? markCommissionPaid(item.id) : markTranslatorPaid(item.id)}
                                                className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all"
                                            >
                                                Төлөх
                                            </button>
                                        ) : (
                                            <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest">
                                                ХҮЛЭЭГДЭЖ БУЙ
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-muted font-bold italic">
                                        Гүйлгээ олдсонгүй.
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
