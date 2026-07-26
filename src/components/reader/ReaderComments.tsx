"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, User, Loader2, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getCDNUrl } from "@/lib/storage-utils";

interface ReaderCommentsProps {
    chapterId: string;
    user: any;
}

export function ReaderComments({ chapterId, user }: ReaderCommentsProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" }
        );

        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isVisible) fetchComments();
    }, [chapterId, isVisible]);

    async function fetchComments() {
        setLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles (
                    username,
                    full_name,
                    avatar_url,
                    is_admin,
                    is_moderator
                )
            `)
            .eq('chapter_id', Number(chapterId))
            .order('created_at', { ascending: true }); // Ascending to help with threading logic

        if (error) {
            console.error("Fetch Comments Error:", error);
        }

        setComments(data || []);
        setLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert("Нэвтэрсний дараа сэтгэгдэл үлдээх боломжтой.");
            return;
        }
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        const { data, error } = await supabase
            .from('comments')
            .insert({
                chapter_id: Number(chapterId),
                user_id: user.id,
                content: newComment.trim()
            })
            .select(`
                *,
                profiles (
                    username,
                    full_name,
                    avatar_url,
                    is_admin,
                    is_moderator
                )
            `)
            .single();

        if (error) {
            console.error("Comment Error:", error);
            toast.error("Сэтгэгдэл бичихэд алдаа гарлаа");
        } else if (data) {
            setComments([...comments, data]);
            setNewComment("");
            toast.success("Сэтгэгдэл нэмэгдлээ");
        }
        setIsSubmitting(false);
    };

    const handleReplySubmit = async (parentId: number) => {
        if (!user) {
            alert("Нэвтэрсний дараа хариу бичих боломжтой.");
            return;
        }
        if (!replyText.trim()) return;

        setIsSubmitting(true);
        const { data, error } = await supabase
            .from('comments')
            .insert({
                chapter_id: Number(chapterId),
                user_id: user.id,
                content: replyText.trim(),
                parent_id: parentId
            })
            .select(`
                *,
                profiles (
                    username,
                    full_name,
                    avatar_url,
                    is_admin,
                    is_moderator
                )
            `)
            .single();

        if (error) {
            console.error("Reply Error:", error);
            toast.error("Хариу илгээхэд алдаа гарлаа");
        } else if (data) {
            setComments([...comments, data]);
            setReplyText("");
            setReplyingToId(null);
            toast.success("Хариу нэмэгдлээ");
        }
        setIsSubmitting(false);
    };

    const deleteComment = async (id: number) => {
        if (!confirm('Та энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу?')) return;

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id)
            .eq('user_id', user?.id);

        if (!error) {
            setComments(comments.filter(c => c.id !== id));
            toast.success('Сэтгэгдэл устгагдлаа');
        } else {
            toast.error('Устгахад алдаа гарлаа');
        }
    };

    // Threading Logic: Group replies under parents
    const parentComments = comments.filter(c => !c.parent_id).reverse(); // Main list newest first
    const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

    const CommentCard = ({ comment, isReply = false }: { comment: any, isReply?: boolean }) => {
        const isAdmin = comment.profiles?.is_admin;
        const isModerator = comment.profiles?.is_moderator;
        const isStaff = isAdmin || isModerator;

        return (
            <div className="space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "bg-surface border border-white/5 rounded-3xl p-6 space-y-3 relative group transition-all",
                        isReply && "ml-8 lg:ml-12 border-l-primary/30 bg-white/[0.02]"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-white/5 overflow-hidden">
                                {isStaff ? (
                                    <img src="/logo.png" className="w-full h-full object-contain p-1" />
                                ) : comment.profiles?.avatar_url ? (
                                    <img src={getCDNUrl(comment.profiles.avatar_url, { width: 64, quality: 80 })} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-4 h-4 text-muted" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs font-bold",
                                        isAdmin ? "text-primary" : "text-white"
                                    )}>
                                        {isAdmin ? "Admin" : isModerator ? "Moderator" : (comment.profiles?.full_name || comment.profiles?.username || "Хэрэглэгч")}
                                    </span>
                                    {isAdmin && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-widest border border-primary/20">
                                            <ShieldCheck className="w-3 h-3" />
                                            Admin
                                        </span>
                                    )}
                                    {isModerator && !isAdmin && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Staff
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-muted/50 font-bold uppercase tracking-widest">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isReply && user && (
                                <button
                                    onClick={() => setReplyingToId(comment.id === replyingToId ? null : comment.id)}
                                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                >
                                    Хариулах
                                </button>
                            )}
                            {user?.id === comment.user_id && (
                                <button
                                    onClick={() => deleteComment(comment.id)}
                                    className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                        {comment.content}
                    </p>
                </motion.div>

                {/* Reply Form */}
                {replyingToId === comment.id && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="ml-8 lg:ml-12 bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3"
                    >
                        <textarea
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Хариу бичих..."
                            className="w-full h-20 bg-transparent text-sm text-white resize-none focus:outline-none placeholder:text-muted/50"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setReplyingToId(null);
                                    setReplyText("");
                                }}
                                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-white transition-all"
                            >
                                Цуцлах
                            </button>
                            <button
                                onClick={() => handleReplySubmit(comment.id)}
                                disabled={isSubmitting || !replyText.trim()}
                                className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                Илгээх
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        );
    };

    return (
        <section ref={containerRef} className="w-full max-w-2xl mx-auto px-4 py-12 border-t border-white/5 space-y-8 min-h-[400px]">
            {!isVisible ? (
                <div className="flex justify-center items-center py-20 text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Сэтгэгдэл ({comments.length})</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="relative group">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={user ? "Сэтгэгдэл үлдээх..." : "Сэтгэгдэл бичихийн тулд нэвтэрнэ үү"}
                            disabled={!user || isSubmitting}
                            className="w-full h-32 bg-surface border border-white/5 rounded-3xl p-6 text-sm focus:outline-none focus:border-primary/50 transition-all resize-none placeholder:text-muted"
                        />
                        <button
                            type="submit"
                            disabled={!user || isSubmitting || !newComment.trim()}
                            className="absolute bottom-4 right-4 p-3 bg-primary text-white rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="space-y-8">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 rounded-3xl bg-surface animate-pulse" />
                                ))}
                            </div>
                        ) : parentComments.length > 0 ? (
                            parentComments.map((parent) => (
                                <div key={parent.id} className="space-y-4">
                                    <CommentCard comment={parent} />
                                    {getReplies(parent.id).map(reply => (
                                        <CommentCard key={reply.id} comment={reply} isReply />
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-surface/50 rounded-3xl border border-dashed border-white/5">
                                <p className="text-muted text-sm font-bold uppercase tracking-widest">Одоогоор сэтгэгдэл байхгүй байна</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

