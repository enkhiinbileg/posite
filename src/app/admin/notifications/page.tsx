"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    Send,
    Zap,
    Star,
    Info,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Layout
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NOTIFICATION_TYPES = [
    { id: 'info', name: 'Мэдээлэл', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'update', name: 'Шинэчлэлт', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { id: 'reward', name: 'Урамшуулал', icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'system', name: 'Систем', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

export default function AdminNotificationsPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");
    const [link, setLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    async function checkPermission() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_admin) {
                router.push("/admin");
                toast.error("Танд энэ хэсэгт хандах эрх байхгүй!");
            }
        }
    }

    const handleBroadcast = async () => {
        if (!title || !message) {
            toast.error("Гарчиг болон агуулга заавал байх ёстой.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.rpc('broadcast_notification', {
                p_title: title,
                p_message: message,
                p_type: type,
                p_link: link || null
            });

            if (error) throw error;

            toast.success("Мэдэгдэл бүх хэрэглэгчдэд амжилттай илгээгдлээ!");
            setTitle("");
            setMessage("");
            setLink("");
            setShowConfirm(false);
        } catch (error: any) {
            toast.error("Алдаа гарлаа: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedTypeData = NOTIFICATION_TYPES.find(t => t.id === type) || NOTIFICATION_TYPES[0];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-4">
                    <Bell className="w-10 h-10 text-primary" />
                    Мэдэгдэл Илгээх
                </h1>
                <p className="text-muted font-medium mt-2">Бүх хэрэглэгчдэд нэгэн зэрэг мэдэгдэл (Announcement) илгээх.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Compose Form */}
                <div className="space-y-6 bg-surface/30 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Төрөл сонгох</label>
                        <div className="grid grid-cols-2 gap-3">
                            {NOTIFICATION_TYPES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300",
                                        type === t.id
                                            ? "bg-white/10 border-primary/50 text-white"
                                            : "bg-black/20 border-white/5 text-muted hover:border-white/10"
                                    )}
                                >
                                    <t.icon className={cn("w-5 h-5", type === t.id ? t.color : "text-muted")} />
                                    <span className="text-sm font-bold">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Гарчиг</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Мэдэгдлийн гарчиг..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 transition-colors font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Агуулга</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Мэдэгдлийн дэлгэрэнгүй агуулга..."
                            rows={4}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 transition-colors font-medium resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted">Линк (Заавал биш)</label>
                        <input
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="/leaderboard эсвэл https://..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Send className="w-5 h-5" />
                            Мэдэгдэл илгээх
                        </button>
                    ) : (
                        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-4">
                            <div className="flex items-center gap-3 text-red-500">
                                <AlertTriangle className="w-6 h-6" />
                                <p className="font-bold text-sm">Та итгэлтэй байна уу?</p>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                                Энэ мэдэгдэл нь системийн **бүх хэрэглэгчдэд** нэгэн зэрэг очих болно. Буцаах боломжгүй.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleBroadcast}
                                    disabled={loading}
                                    className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Тийм, илгээ
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-4 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
                                >
                                    Цуцлах
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                    <label className="text-xs font-black uppercase tracking-widest text-muted">Preview (Хэрэглэгчид ингэж харагдана)</label>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Layout className="w-3 h-3" />
                                Мэдэгдлийн цонхны харагдац
                            </p>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="group p-6 rounded-[2rem] border bg-white/[0.04] border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden transition-all">
                                <div className="flex gap-5 relative z-10">
                                    <div className={cn(
                                        "w-14 h-14 shrink-0 rounded-[1.3rem] flex items-center justify-center shadow-lg",
                                        selectedTypeData.bg
                                    )}>
                                        <selectedTypeData.icon className={cn("w-7 h-7", selectedTypeData.color)} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-white text-[15px] group-hover:text-primary transition-colors">
                                                {title || "Гарчиг энд харагдана"}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-muted/80 leading-relaxed font-medium">
                                            {message || "Мэдэгдлийн агуулга энд харагдах болно..."}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4">
                        <Info className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-xs text-primary/80 leading-relaxed font-medium">
                            **Зөвлөгөө**: Мэдэгдэл илгээхээсээ өмнө гарчиг болон агуулгыг дахин нэг нягталж шалгаарай. Аль болох товч бөгөөд тодорхой байх нь хэрэглэгчдэд илүү ойлгомжтой байдаг.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
