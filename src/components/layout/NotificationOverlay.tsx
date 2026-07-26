"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Info, Zap, Star, ChevronRight, Sparkles, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface NotificationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    link?: string;
    created_at: string;
}

const getIconForType = (type: string) => {
    switch (type) {
        case 'update': return { icon: Zap, color: "text-blue-400", glow: "shadow-blue-500/20", bg: "bg-blue-500/10" };
        case 'reward': return { icon: Star, color: "text-yellow-400", glow: "shadow-yellow-500/20", bg: "bg-yellow-500/10" };
        case 'system': return { icon: Info, color: "text-purple-400", glow: "shadow-purple-500/20", bg: "bg-purple-500/10" };
        case 'social': return { icon: Sparkles, color: "text-emerald-400", glow: "shadow-emerald-500/20", bg: "bg-emerald-500/10" };
        default: return { icon: Info, color: "text-gray-400", glow: "shadow-gray-500/20", bg: "bg-gray-500/10" };
    }
};

export function NotificationOverlay({ isOpen, onClose }: NotificationOverlayProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            fetchNotifications();
        } else {
            document.body.style.overflow = "auto";
        }
    }, [isOpen]);

    useEffect(() => {
        /* DISABLED FOR PERFORMANCE
        // Real-time listener
        const channel = supabase
            .channel('realtime_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    // Play a subtle sound? (Later)
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        */
    }, []);

    const fetchNotifications = async () => {
        if (!user) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
        }
        setLoading(false);
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new Event('refreshNotifications'));
            toast.success("Бүх мэдэгдлийг уншсан болголоо.");
        } else {
            toast.error("Алдаа гарлаа: " + error.message);
        }
    };

    const markAsRead = async (id: number) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            // Revert on error if necessary, but for read status, it's usually fine to just log
            console.error("Error marking as read:", error);
        } else {
            window.dispatchEvent(new Event('refreshNotifications'));
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMins / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffMins < 60) return `${diffMins} минутын өмнө`;
        if (diffHours < 24) return `${diffHours} цагийн өмнө`;
        return `${diffDays} хоногийн өмнө`;
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Dark Backdrop with heavy blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-[#050505]/40 backdrop-blur-xl"
                    />

                    {/* Notification Sidebar */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] z-[101] bg-[#0a0a0a]/90 backdrop-blur-[50px] border-l border-white/5 shadow-[-20px_0_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                    >
                        {/* Interactive Mesh Gradients */}
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.1, 0.2, 0.1],
                                    x: [0, 50, 0],
                                    y: [0, -30, 0]
                                }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-[10%] -right-[10%] w-[350px] h-[350px] bg-primary/20 blur-[120px] rounded-full"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.05, 0.15, 0.05],
                                    x: [0, -50, 0],
                                    y: [0, 100, 0]
                                }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute top-[40%] -left-[20%] w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full"
                            />
                        </div>

                        {/* Floating Shapes Background */}
                        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                            <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-white animate-pulse" />
                            <div className="absolute top-1/2 right-10 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            <div className="absolute bottom-40 left-1/4 w-1 h-1 rounded-full bg-blue-400 animate-bounce" />
                        </div>

                        {/* Header */}
                        <div className="relative z-10 px-8 py-10 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                                    Мэдэгдэл
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 mt-2">
                                    Personal Activity Feed
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-4 rounded-full bg-white/5 hover:bg-primary hover:text-black transition-all duration-300 transform active:scale-90 group shadow-lg"
                            >
                                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {loading && notifications.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {notifications.map((notif, index) => {
                                        const ui = getIconForType(notif.type);
                                        return (
                                            <motion.div
                                                key={notif.id}
                                                initial={{ opacity: 0, x: 40, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                                transition={{ delay: index * 0.05, duration: 0.4, ease: "circOut" }}
                                                whileHover={{ x: -5 }}
                                                onClick={async () => {
                                                    await markAsRead(notif.id);
                                                    if (notif.link) {
                                                        onClose();
                                                        window.location.href = notif.link;
                                                    }
                                                }}
                                                className={cn(
                                                    "group p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden cursor-pointer",
                                                    !notif.is_read
                                                        ? "bg-white/[0.04] border-primary/20 hover:border-primary/40 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                                                        : "bg-surface/30 border-white/5 hover:bg-surface/50 hover:border-white/10"
                                                )}
                                            >
                                                <div className="flex gap-5 relative z-10">
                                                    {/* Advanced Icon Container */}
                                                    <div className={cn(
                                                        "w-14 h-14 shrink-0 rounded-[1.3rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                                                        ui.bg,
                                                        ui.glow
                                                    )}>
                                                        <ui.icon className={cn("w-7 h-7", ui.color)} />
                                                    </div>

                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-black text-white text-[15px] group-hover:text-primary transition-colors">
                                                                {notif.title}
                                                            </h3>
                                                            <div className="flex items-center gap-1 text-[9px] font-black text-white/30 uppercase tracking-tighter">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTime(notif.created_at)}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted/80 leading-relaxed font-medium">
                                                            {notif.message}
                                                        </p>

                                                        <div className="pt-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {!notif.is_read && (
                                                                    <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                                                                        Шинэ
                                                                    </div>
                                                                )}
                                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest">
                                                                    {notif.type}
                                                                </span>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <ArrowRight className="w-4 h-4 text-primary" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dynamic Border Gradient on Hover */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}

                            {!loading && notifications.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-center"
                                >
                                    <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                                        <Bell className="w-16 h-16 text-muted/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black text-white uppercase tracking-tighter">Одоогоор мэдэгдэл байхгүй</p>
                                        <p className="text-xs text-muted font-medium max-w-[200px] mx-auto">Шинэ зохиол, урамшуулал орох үед танд энд харагдах болно.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="relative z-10 p-10 bg-gradient-to-t from-black to-transparent">
                            <button
                                onClick={markAllAsRead}
                                className="w-full py-5 rounded-[2rem] bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                <Sparkles className="w-4 h-4 group-hover:animate-spin-slow" />
                                Бүгдийг уншсан болгох
                            </button>
                            <p className="text-center text-[9px] font-black text-muted/30 uppercase tracking-[0.3em] mt-6">
                                Powered by Webtoon Engine
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
