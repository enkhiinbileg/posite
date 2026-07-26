"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare, CheckCircle2, Clock,
    AlertCircle, Search, Filter, Trash2,
    ChevronDown, ExternalLink, User as UserIcon,
    Save, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { mn } from "date-fns/locale";

interface Suggestion {
    id: string;
    title: string;
    description: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    admin_note: string | null;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        username: string;
    }
}

export default function AdminSuggestionsPage() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    async function fetchSuggestions() {
        setLoading(true);
        const { data, error } = await supabase
            .from('suggestions')
            .select('*, profiles(full_name, username)')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Саналуудыг уншихад алдаа гарлаа: " + error.message);
        } else {
            setSuggestions(data || []);
        }
        setLoading(false);
    }

    async function updateStatus(id: string, newStatus: string) {
        setUpdatingId(id);
        const { error } = await supabase
            .from('suggestions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error("Төлөв өөрчлөхөд алдаа гарлаа");
        } else {
            toast.success("Төлөв шинэчлэгдлээ");
            setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any } : s));
        }
        setUpdatingId(null);
    }

    async function updateAdminNote(id: string, note: string) {
        const { error } = await supabase
            .from('suggestions')
            .update({ admin_note: note })
            .eq('id', id);

        if (error) {
            toast.error("Хариу хадгалахад алдаа гарлаа");
        } else {
            toast.success("Хариу хадгалагдлаа");
        }
    }

    const filteredSuggestions = suggestions.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || s.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'rejected': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Санал <span className="text-primary italic">хүсэлтүүд</span></h1>
                    <p className="text-muted text-xs font-bold uppercase tracking-widest mt-1">Manage community feedback</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-black text-primary">
                        {suggestions.length} НИЙТ
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Хайх..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-white/5 focus:border-primary/50 py-3 pl-12 pr-4 rounded-2xl text-white outline-none transition-all placeholder:text-muted/30 font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'processing', 'completed', 'rejected'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cn(
                                "flex-1 px-3 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                filterStatus === s ? "bg-primary text-white border-primary" : "bg-surface border-white/5 text-muted hover:border-white/20"
                            )}
                        >
                            {s === 'all' ? 'Бүгд' : s === 'pending' ? 'Хүлээгдэж буй' : s === 'processing' ? 'Хийгдэж буй' : s === 'completed' ? 'Дууссан' : 'Татгалзсан'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-32 bg-surface rounded-3xl animate-pulse border border-white/5" />
                    ))
                ) : filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((s) => (
                        <div key={s.id} className="bg-surface border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-white/10 transition-all group">
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-muted uppercase tracking-widest">
                                            {s.type}
                                        </span>
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                            <UserIcon className="w-3.5 h-3.5" />
                                            {s.profiles?.full_name || s.profiles?.username || 'Unknown User'}
                                        </div>
                                        <span className="text-[10px] text-muted font-medium">
                                            {format(new Date(s.created_at), 'yyyy/MM/dd HH:mm')}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors mb-2">{s.title}</h3>
                                        <p className="text-muted text-sm leading-relaxed font-medium">{s.description}</p>
                                    </div>
                                </div>

                                <div className="lg:w-80 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Төлөв солих</label>
                                        <div className="relative">
                                            <select
                                                value={s.status}
                                                onChange={(e) => updateStatus(s.id, e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-primary transition-all text-white"
                                            >
                                                <option value="pending">Хүлээгдэж буй</option>
                                                <option value="processing">Хийгдэж буй</option>
                                                <option value="completed">Шийдэгдсэн</option>
                                                <option value="rejected">Татгалзсан</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                {updatingId === s.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Админы хариу</label>
                                        <div className="relative group/note">
                                            <textarea
                                                defaultValue={s.admin_note || ""}
                                                onBlur={(e) => updateAdminNote(s.id, e.target.value)}
                                                placeholder="Хариу бичих..."
                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-medium text-white/80 focus:border-primary/50 outline-none transition-all placeholder:text-muted/20 resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-surface border border-dashed border-white/10 rounded-[3rem] py-20 text-center">
                        <MessageSquare className="w-12 h-12 text-muted/10 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white/20 uppercase italic">Санал хүсэлт олдсонгүй</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
