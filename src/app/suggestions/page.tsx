"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, Plus, Filter, Clock, CheckCircle2,
    AlertCircle, Sparkles, ChevronRight, Send, X,
    Search, Lightbulb, Bug, MessageCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";

interface Suggestion {
    id: string;
    title: string;
    description: string;
    type: 'bug' | 'suggestion' | 'translation_error' | 'other';
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    admin_note: string | null;
    created_at: string;
    user_id: string;
}

export default function SuggestionsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // const [user, setUser] = useState<any>(null); // Replaced by useAuth


    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<Suggestion['type']>('suggestion');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            fetchSuggestions(user?.id, profile?.is_admin);
        }
    }, [user, profile, authLoading]);

    async function fetchSuggestions(userId?: string, userIsAdmin?: boolean) {
        setLoading(true);

        let query = supabase
            .from('suggestions')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin, restrict visibility
        if (!userIsAdmin) {
            if (userId) {
                // Show ONLY my own suggestions
                query = query.eq('user_id', userId);
            } else {
                // Not logged in -> Show nothing (or maybe public ones if we had a flag, but safer to show nothing)
                setSuggestions([]);
                setLoading(false);
                return;
            }
        }

        const { data, error } = await query;

        if (error) {
            toast.error("Саналуудыг уншихад алдаа гарлаа");
        } else {
            setSuggestions(data || []);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) {
            toast.error("Та нэвтэрсний дараа санал илгээх боломжтой");
            return;
        }

        setSubmitting(true);
        const { error } = await supabase
            .from('suggestions')
            .insert({
                user_id: user.id,
                title,
                description,
                type,
                status: 'pending'
            });

        if (error) {
            toast.error("Санал илгээхэд алдаа гарлаа: " + error.message);
        } else {
            toast.success("Таны саналыг хүлээн авлаа. Баярлалаа!");
            setTitle("");
            setDescription("");
            setIsModalOpen(false);
            fetchSuggestions();
        }
        setSubmitting(false);
    }

    const getStatusStyle = (status: Suggestion['status']) => {
        switch (status) {
            case 'pending': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case 'processing': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 'completed': return "bg-green-500/10 text-green-500 border-green-500/20";
            case 'rejected': return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-muted/10 text-muted border-muted/20";
        }
    };

    const getStatusLabel = (status: Suggestion['status']) => {
        switch (status) {
            case 'pending': return "Хүлээгдэж буй";
            case 'processing': return "Хийгдэж буй";
            case 'completed': return "Шийдэгдсэн";
            case 'rejected': return "Татгалзсан";
        }
    };

    const getTypeIcon = (type: Suggestion['type']) => {
        switch (type) {
            case 'bug': return <Bug className="w-4 h-4" />;
            case 'suggestion': return <Lightbulb className="w-4 h-4" />;
            case 'translation_error': return <MessageSquare className="w-4 h-4" />;
            default: return <MessageCircle className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            Community Driven
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-white leading-none">
                            Сайжруулах <br /> <span className="text-primary">Санал Хүсэлт</span>
                        </h1>
                        <p className="text-muted text-sm md:text-lg max-w-xl font-medium">
                            Манай платформыг илүү сайн болгоход таны оролцоо хамгийн чухал.
                            Алдаа болон сайжруулах санаагаа энд хуваалцаарай.
                        </p>
                    </div>

                    <button
                        onClick={() => user ? setIsModalOpen(true) : toast.error("Та эхлээд нэвтэрнэ үү")}
                        className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(229,9,20,0.3)] hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Санал илгээх
                    </button>
                </div>

                {/* Suggestions List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-64 bg-surface/50 rounded-[2.5rem] animate-pulse border border-white/5" />
                        ))
                    ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                            <motion.div
                                key={suggestion.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-surface hover:bg-surface/80 border border-white/5 hover:border-primary/20 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-500 shadow-xl shadow-black/20"
                            >
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "p-3 rounded-2xl bg-white/5 text-muted group-hover:text-primary transition-colors",
                                            suggestion.type === 'bug' && "group-hover:text-red-500"
                                        )}>
                                            {getTypeIcon(suggestion.type)}
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                            getStatusStyle(suggestion.status)
                                        )}>
                                            {getStatusLabel(suggestion.status)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-tight truncate">
                                            {suggestion.title}
                                        </h3>
                                        <p className="text-muted text-sm leading-relaxed line-clamp-3 font-medium">
                                            {suggestion.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                    {suggestion.admin_note && (
                                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                            <p className="text-[10px] font-black text-primary uppercase mb-1">Админы хариу:</p>
                                            <p className="text-xs text-white/80 italic font-medium">{suggestion.admin_note}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-widest">
                                        <span>{formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: mn })}</span>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Update Coming</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center space-y-6">
                            <div className="inline-flex p-6 bg-white/5 rounded-full mb-4">
                                <MessageSquare className="w-12 h-12 text-muted/20" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase italic">Одоогоор санал алга</h2>
                            <p className="text-muted max-w-md mx-auto">Анхны саналыг та гаргаарай!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal - Premium Form */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-surface border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 md:p-12 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Шинэ санал <span className="text-primary italic">илгээх</span></h2>
                                        <p className="text-muted text-[10px] font-black uppercase tracking-widest">What's on your mind?</p>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all flex items-center justify-center"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-2">
                                            <Filter className="w-3 h-3" /> Төрөл сонгох
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {['suggestion', 'bug', 'translation_error', 'other'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setType(t as any)}
                                                    className={cn(
                                                        "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                        type === t ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 text-muted hover:border-white/20"
                                                    )}
                                                >
                                                    {t === 'suggestion' ? 'Санал' : t === 'bug' ? 'Алдаа' : t === 'translation_error' ? 'Орчуулга' : 'Бусад'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Гарчиг</label>
                                        <input
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Жишээ: Хайлтын хэсгийг сайжруулах"
                                            className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-4 px-6 rounded-2xl text-white outline-none transition-all placeholder:text-muted/20 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Дэлгэрэнгүй тайлбар</label>
                                        <textarea
                                            required
                                            rows={5}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Санал хүсэлтээ энд дэлгэрэнгүй бичнэ үү..."
                                            className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-4 px-6 rounded-2xl text-white outline-none transition-all placeholder:text-muted/20 font-medium resize-none"
                                        />
                                    </div>

                                    <button
                                        disabled={submitting}
                                        type="submit"
                                        className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? (
                                            <Clock className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                        {submitting ? "Илгээж байна..." : "Санал илгээх"}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
