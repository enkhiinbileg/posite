"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Crown, Check, Film, Heart, History, Settings, 
    CreditCard, LogOut, Copy, Camera, ShieldCheck, User, Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { getUser8DigitId } from "@/lib/user-id";
import { VideoCard } from "@/components/video/VideoCard";
import { toast } from "sonner";
import Image from "next/image";

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("history"); // 'history', 'saved', 'payments', 'settings'

    // Data States
    const [recentVideos, setRecentVideos] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [displayName, setDisplayName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            setDisplayName(profile?.full_name || user.email?.split('@')[0] || "");
            fetchUserData();
        } else if (!authLoading) {
            router.push("/");
        }
    }, [user, authLoading]);

    async function fetchUserData() {
        if (!user) return;
        setLoading(true);

        try {
            // Fetch recent videos (mock or actual videos)
            const { data: videoData } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            setRecentVideos(videoData || []);

            // Fetch payments
            const { data: paymentData } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            setPayments(paymentData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch (e) {
            console.warn("Signout error:", e);
        } finally {
            window.location.href = "/";
        }
    };

    const handleSaveName = async () => {
        if (!displayName.trim() || !user) return;
        setIsSavingName(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: displayName.trim() })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Нэр амжилттай шинэчлэгдлээ");
        } catch (err: any) {
            toast.error(err.message || "Шинэчлэхэд алдаа гарлаа");
        } finally {
            setIsSavingName(false);
        }
    };

    const copyId = (idString: string) => {
        navigator.clipboard.writeText(`PM ${idString}`);
        toast.success(`PM ${idString} хуулагдлаа!`);
    };

    if (authLoading || (!user && loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0610]">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
        );
    }

    const user8DigitId = getUser8DigitId(user, profile);
    const isVipActive = profile?.is_vip || false;

    return (
        <main className="min-h-screen w-full bg-[#0a0610] text-white pb-28 pt-8">
            {/* Header Hero Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-[#130b20] to-[#0a0610] border border-white/10 p-6 md:p-10 overflow-hidden shadow-2xl">
                    {/* Background glow accents */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-800 border-2 border-red-600/40 overflow-hidden shadow-xl flex items-center justify-center text-3xl font-black uppercase text-red-500">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    (profile?.full_name || user?.email || 'U')[0]
                                )}
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
                                        {profile?.full_name || user?.email?.split('@')[0]}
                                    </h1>
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <span className="text-xs text-zinc-400 font-bold">@{user?.email?.split('@')[0]}</span>
                                        {/* Glowing 8-Digit ID Badge */}
                                        <button 
                                            onClick={() => copyId(user8DigitId)}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-xs flex items-center gap-1.5 hover:bg-amber-500/20 transition-all cursor-pointer shadow"
                                            title="Хуулахын тулд дарна уу"
                                        >
                                            <span>ID: #{user8DigitId}</span>
                                            <Copy className="w-3 h-3 text-amber-400/70" />
                                        </button>
                                    </div>
                                </div>

                                {/* VIP Status Badge / Upgrade */}
                                <div className="flex items-center gap-3">
                                    {isVipActive ? (
                                        <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10">
                                            <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            <span>👑 VIP Идэвхтэй</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => router.push('/vip')}
                                            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Crown className="w-4 h-4 fill-black" /> VIP Эрх Авах
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto py-6 border-b border-white/10 no-scrollbar">
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "history" 
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <History className="w-4 h-4" /> Үзсэн Түүх
                    </button>

                    <button
                        onClick={() => setActiveTab("saved")}
                        className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "saved" 
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <Heart className="w-4 h-4" /> Хадгалсан Бичлэгүүд
                    </button>

                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "payments" 
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <CreditCard className="w-4 h-4" /> Төлбөрийн Түүх
                    </button>

                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "settings" 
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <Settings className="w-4 h-4" /> Тохиргоо
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pt-8">
                    {/* Watch History */}
                    {activeTab === "history" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                                <Film className="w-5 h-5 text-red-500" /> Сүүлд үзсэн бичлэгүүд
                            </h2>

                            {recentVideos.length === 0 ? (
                                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                                    <Film className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-zinc-400">Үзсэн бичлэг одоогоор алга байна.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    {recentVideos.map((video) => (
                                        <VideoCard key={video.id} video={video} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Saved Videos */}
                    {activeTab === "saved" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Хадгалсан бичлэгүүд
                            </h2>

                            <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                                <Heart className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                                <p className="text-sm font-bold text-zinc-400">Хадгалсан бичлэг одоогоор алга байна.</p>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    {activeTab === "payments" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-amber-500" /> Сүүлийн гүйлгээнүүд
                            </h2>

                            {payments.length === 0 ? (
                                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                                    <CreditCard className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-zinc-400">Гүйлгээний түүх одоогоор байхгүй байна.</p>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-white/5 text-zinc-400 font-bold uppercase tracking-wider">
                                                    <th className="p-4">Огноо</th>
                                                    <th className="p-4">Төлбөр</th>
                                                    <th className="p-4 text-center">Гүйлгээний утга</th>
                                                    <th className="p-4 text-center">Төлөв</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 font-semibold">
                                                {payments.map((p) => (
                                                    <tr key={p.id} className="hover:bg-white/5">
                                                        <td className="p-4 text-zinc-300">
                                                            {new Date(p.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 font-black text-amber-400">
                                                            {Number(p.amount).toLocaleString()}₮
                                                        </td>
                                                        <td className="p-4 text-center font-mono text-zinc-400">
                                                            PM {user8DigitId}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                                p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                            }`}>
                                                                {p.status === 'completed' ? 'Баталгаажсан' : 'Хүлээгдэж буй'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings */}
                    {activeTab === "settings" && (
                        <div className="max-w-xl space-y-6">
                            <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-red-500" /> Акаунтын тохиргоо
                            </h2>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-2">Дэлгэцэнд харагдах нэр</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveName}
                                    disabled={isSavingName}
                                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                                >
                                    {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Хадгалах"}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-xs tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4" /> Системээс гарах
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0610]">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
