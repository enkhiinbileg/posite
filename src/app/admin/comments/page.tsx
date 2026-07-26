"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Trash2, MessageCircle, Loader2, ExternalLink, Reply, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { deleteCommentAdminAction } from "@/app/actions/comment-actions";

export default function AdminCommentsPage() {
    const { user: adminUser } = useAuth();
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    useEffect(() => {
        fetchComments();
    }, []);

    async function fetchComments() {
        setLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles (username, full_name, avatar_url, email),
                chapters (id, title, webtoon_id)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error("Error fetching comments:", error);
            toast.error(`Сэтгэгдэл татахад алдаа гарлаа: ${error.message}`);
        } else {
            const mappedData = data?.map((item: any) => ({
                ...item,
                profile: item.profiles,
                chapter: item.chapters
            })) || [];

            setComments(mappedData);
        }
        setLoading(false);
    }

    async function submitReply(parentComment: any) {
        if (!replyContent.trim()) return;
        if (!adminUser) return;

        setIsSubmittingReply(true);
        const { data, error } = await supabase
            .from('comments')
            .insert({
                content: replyContent.trim(),
                user_id: adminUser.id,
                chapter_id: parentComment.chapter_id,
                parent_id: parentComment.id
            })
            .select(`
                *,
                profiles (username, full_name, avatar_url, email),
                chapters (id, title, webtoon_id)
            `)
            .single();

        if (error) {
            console.error("Error replying:", error);
            toast.error("Хариу бичиж чадсангүй: " + error.message);
        } else {
            toast.success("Хариу сэтгэгдэл нэмэгдлээ");
            setReplyContent("");
            setReplyingCommentId(null);
            // Optionally refresh or add local
            fetchComments();
        }
        setIsSubmittingReply(false);
    }

    async function navigateToComment(comment: any) {
        if (comment.chapter?.webtoon_id && comment.chapter?.id) {
            window.open(`/webtoon/${comment.chapter.webtoon_id}/read/${comment.chapter.id}`, '_blank');
        }
    }

    async function deleteComment(id: string) {
        if (!confirm("Та энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу?")) return;

        setDeletingId(id);
        const res = await deleteCommentAdminAction(id);

        if (!res.success) {
            console.error("Error deleting comment:", res.error);
            toast.error("Устгаж чадсангүй: " + res.error);
        } else {
            toast.success("Сэтгэгдэл устгагдлаа");
            setComments(comments.filter(c => c.id !== id));
        }
        setDeletingId(null);
    }

    const filteredComments = comments.filter(c =>
        (c.content || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.profile?.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.profile?.full_name || "").toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Сэтгэгдлүүд</h2>
                <p className="text-muted">Хэрэглэгчдийн бичсэн бүх сэтгэгдлийг хянах</p>
            </div>

            {/* Search */}
            <div className="bg-surface border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Сэтгэгдэл, Хэрэглэгчийн нэрээр хайх..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {filteredComments.map((comment) => (
                    <div key={comment.id} className="bg-surface border border-white/5 p-6 rounded-3xl flex flex-col gap-6 hover:border-white/10 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* User Info */}
                            <div className="flex items-start gap-4 md:w-64 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0">
                                    {comment.profile?.avatar_url ? (
                                        <img src={comment.profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{comment.profile?.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted truncate">@{comment.profile?.username || "username"}</p>
                                    {comment.profile?.email && (
                                        <p className="text-[10px] text-muted/50 truncate font-mono">{comment.profile.email}</p>
                                    )}
                                    <p className="text-[10px] text-muted/50 mt-1 font-mono">
                                        {new Date(comment.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 text-xs text-primary/80 font-bold uppercase tracking-wide">
                                    <span>{comment.chapter?.webtoon_id ? "Webtoon ID: " + comment.chapter.webtoon_id : "Unknown Webtoon"}</span>
                                    <span className="text-white/20">•</span>
                                    <span>{comment.chapter?.title || "Unknown Chapter"}</span>
                                    {comment.parent_id && (
                                        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded text-[9px] uppercase tracking-widest font-black">Хариу</span>
                                    )}

                                    <button
                                        onClick={() => navigateToComment(comment)}
                                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-white"
                                        title="Вэбтүүн рүү очих"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>

                                <p className="text-white/80 leading-relaxed text-sm break-words">
                                    {comment.content}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center md:items-start justify-end gap-3 md:pl-6 md:border-l border-white/5">
                                {!comment.parent_id && (
                                    <button
                                        onClick={() => setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id)}
                                        className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                                        title="Хариу бичих"
                                    >
                                        <Reply className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteComment(comment.id)}
                                    disabled={deletingId === comment.id}
                                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                    title="Устгах"
                                >
                                    {deletingId === comment.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Reply Area */}
                        {replyingCommentId === comment.id && (
                            <div className="mt-4 pl-6 border-l-2 border-primary/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="relative">
                                    <textarea
                                        autoFocus
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Хариу бичих..."
                                        className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-all resize-none placeholder:text-muted/50 text-white"
                                    />
                                    <div className="absolute top-2 right-2">
                                        <button 
                                            onClick={() => setReplyingCommentId(null)}
                                            className="p-1 hover:bg-white/10 rounded-full text-muted transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setReplyingCommentId(null)}
                                        className="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-muted hover:text-white transition-colors"
                                    >
                                        Цуцлах
                                    </button>
                                    <button
                                        onClick={() => submitReply(comment)}
                                        disabled={isSubmittingReply || !replyContent.trim()}
                                        className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Илгээх
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {filteredComments.length === 0 && !loading && (
                    <div className="text-center py-20 text-muted">
                        Сэтгэгдэл олдсонгүй
                    </div>
                )}
            </div>
        </div>
    );
}

