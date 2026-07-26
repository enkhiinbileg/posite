'use client';

import { useEffect, useState, useActionState, useRef } from "react";
import { fetchSocialPosts, publishSocialPost, deleteSocialPostAction, updateSocialPostAction } from "@/app/actions/social";
import { uploadSocialImage } from "@/app/actions/upload-social-image";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";
import { Loader2, RefreshCw, Send, Image as ImageIcon, Facebook, Copy, ExternalLink, Trash2, Globe, UploadCloud, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Submit Button Component
function SubmitBtn() {
    const { pending } = useFormStatus();
    return (
        <button
            disabled={pending}
            type="submit"
            className="w-full bg-[#E50914] hover:bg-[#b20710] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-900/20 active:scale-[0.98] group"
        >
            {pending ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Нийтэлж байна...</span>
                </>
            ) : (
                <>
                    <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span>Facebook-д нийтлэх</span>
                </>
            )}
        </button>
    );
}

export default function SocialDashboard() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State for Posting
    const [state, formAction] = useActionState(publishSocialPost, null);

    // Controlled inputs for easy "Clone" functionality
    const [caption, setCaption] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Editing State
    const [editingPost, setEditingPost] = useState<any>(null);
    const [editMessage, setEditMessage] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message);
            setCaption(""); // Clear form
            setImageUrl("");
            loadPosts(); // Refresh list
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state]);

    async function loadPosts() {
        setLoading(true);
        const res = await fetchSocialPosts();
        if (res.success && res.data) {
            setPosts(res.data);
        } else {
            toast.error("Постуудыг татаж чадсангүй: " + res.error);
        }
        setLoading(false);
    }

    function handleClone(post: any) {
        setCaption(post.message || "");
        setImageUrl(post.full_picture || "");
        toast.info("Постын агуулгыг хууллаа! Та одоо засаад нийтлэх боломжтой.");
    }

    async function handleDelete(postId: string) {
        if (!confirm("Та энэ постыг устгахдаа итгэлтэй байна уу?")) return;

        const toastId = toast.loading("Устгаж байна...");
        const res = await deleteSocialPostAction(postId);

        if (res.success) {
            toast.success("Пост устгагдлаа", { id: toastId });
            setPosts(prev => prev.filter(p => p.id !== postId));
        } else {
            toast.error("Устгахад алдаа гарлаа: " + res.error, { id: toastId });
        }
    }

    function startEdit(post: any) {
        setEditingPost(post);
        setEditMessage(post.message || "");
    }

    async function saveEdit() {
        if (!editingPost) return;
        setIsUpdating(true);

        const res = await updateSocialPostAction(editingPost.id, editMessage);

        if (res.success) {
            toast.success("Пост шинэчлэгдлээ");
            setEditingPost(null);
            loadPosts(); // Reload to get updated data
        } else {
            toast.error("Шинэчлэхэд алдаа гарлаа: " + res.error);
        }
        setIsUpdating(false);
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const res = await uploadSocialImage(formData);

        if (res.success && res.url) {
            setImageUrl(res.url);
            toast.success("Зураг амжилттай хуулагдлаа!");
        } else {
            toast.error("Зураг хуулахад алдаа гарлаа: " + res.error);
        }
        setUploading(false);

        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Edit Modal / Overlay */}
            {editingPost && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Пост засах</h3>
                        <textarea
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            rows={6}
                            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                        />
                        <div className="flex gap-3 mt-6 justify-end">
                            <button
                                onClick={() => setEditingPost(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                            >
                                Болих
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={isUpdating}
                                className="px-4 py-2 bg-[#E50914] hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Хадгалах
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#E50914] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 rotate-3 transition-transform hover:rotate-0">
                            <Facebook className="w-7 h-7 text-white" />
                        </div>
                        Сошиал Медиа Удирдлага
                    </h1>
                    <p className="text-gray-400 mt-2 ml-[60px] text-sm">Facebook бүлгэм болон хуудсаа нэг дороос удирдах</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={loadPosts}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-white/5 rounded-xl text-sm text-gray-300 transition-all hover:border-white/10 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Шинэчлэх
                    </button>
                    <a
                        href={`https://facebook.com/${process.env.NEXT_PUBLIC_FB_PAGE_ID || ''}`}
                        target="_blank"
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914]/10 hover:bg-[#E50914]/20 border border-[#E50914]/20 rounded-xl text-sm text-[#E50914] transition-all hover:scale-105 active:scale-95"
                    >
                        <Globe className="w-4 h-4" />
                        Хуудас руу очих
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* LEFT: Compose Box */}
                <div className="xl:col-span-4 relative">
                    <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl shadow-2xl sticky top-8 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1.5 h-6 bg-[#E50914] rounded-full" />
                            <h2 className="text-lg font-bold text-white tracking-wide">Шинэ пост бичих</h2>
                        </div>

                        <form action={formAction} className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Тайлбар</label>
                                <div className="relative group">
                                    <textarea
                                        name="message"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        rows={8}
                                        className="w-full bg-[#111] border border-white/5 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#E50914] focus:border-transparent outline-none resize-none transition-all duration-200"
                                        placeholder="Өнөөдөр юу болсон бэ? Уншигчдадаа сонирхолтой зүйл бичээрэй..."
                                        required
                                    />
                                    <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 font-mono bg-[#111] px-2 py-1 rounded-md border border-white/5">
                                        {caption.length} тэмдэгт
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Зураг</label>
                                <div className="space-y-3">
                                    {/* Upload Trigger */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#E50914]/50 hover:bg-[#E50914]/5 group",
                                            uploading && "opacity-50 pointer-events-none"
                                        )}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />

                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mb-2" />
                                        ) : (
                                            <UploadCloud className="w-8 h-8 text-gray-500 group-hover:text-[#E50914] transition-colors mb-2" />
                                        )}

                                        <p className="text-xs font-medium text-gray-400 group-hover:text-[#E50914] transition-colors">
                                            {uploading ? "Хуулж байна..." : "Зураг оруулах бол энд дарна уу"}
                                        </p>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-400">
                                            <ImageIcon className="w-4 h-4" />
                                        </div>
                                        <input
                                            name="imageUrl"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            type="url"
                                            className="w-full bg-[#111] border border-white/5 rounded-2xl py-3.5 pl-14 pr-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#E50914] focus:border-transparent outline-none transition-all text-xs"
                                            placeholder="Эсвэл шууд линк хуулж болно..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {imageUrl && (
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/50 group animate-in fade-in zoom-in-95 duration-300">
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        fill
                                        className="object-contain"
                                        onError={() => toast.error("Зураг уншихад алдаа гарлаа")}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl("")}
                                            className="px-4 py-2 bg-red-500/90 hover:bg-red-500 rounded-xl text-white font-medium flex items-center gap-2 shadow-xl transform scale-95 group-hover:scale-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Зургийг устгах
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Нийтлэх цаг (Сонголттой)</label>
                                <div className="relative group">
                                    <input
                                        type="datetime-local"
                                        name="scheduledTime"
                                        className="w-full bg-[#111] border border-white/5 rounded-2xl py-3.5 px-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#E50914] focus:border-transparent outline-none transition-all text-xs"
                                        min={new Date(Date.now() + 10 * 60000).toISOString().slice(0, 16)}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 ml-1">
                                        * Хоосон орхивол шууд нийтлэгдэнэ. Эсвэл дор хаяж 10 минутын дараах цагийг сонгоно уу.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <SubmitBtn />
                            </div>
                        </form>
                    </div>
                </div>

                {/* RIGHT: Live Feed */}
                <div className="xl:col-span-8">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                        <h2 className="text-lg font-bold text-white tracking-wide">Facebook Feed</h2>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                            Live
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl flex gap-6 animate-pulse">
                                    <div className="w-40 h-40 bg-white/5 rounded-2xl shrink-0" />
                                    <div className="flex-1 space-y-4 py-2">
                                        <div className="h-4 bg-white/5 rounded w-1/4" />
                                        <div className="h-4 bg-white/5 rounded w-3/4" />
                                        <div className="h-4 bg-white/5 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar pb-20">
                            {posts.map((post) => (
                                <div key={post.id} className="bg-[#0A0A0A] border border-white/5 p-5 rounded-3xl flex gap-6 hover:border-white/10 transition-all group relative overflow-hidden">
                                    {/* Hover Effect Background */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#E50914]/0 via-[#E50914]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    {/* Thumbnail */}
                                    <div className="shrink-0 w-32 h-32 md:w-40 md:h-40 bg-black/40 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
                                        {post.full_picture ? (
                                            <Image
                                                src={post.full_picture}
                                                alt="Post"
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 gap-2 bg-[#111]">
                                                <ImageIcon className="w-8 h-8 opacity-50" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Зураггүй</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col z-10 py-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium justify-between">
                                            <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                {formatDistanceToNow(new Date(post.created_time), { addSuffix: true, locale: mn })}
                                            </span>

                                            {/* Action Buttons */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(post)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                    title="Засах"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Устгах"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-300 line-clamp-3 mb-6 leading-relaxed font-light">
                                            {post.message || <span className="text-gray-600">Тайлбаргүй пост</span>}
                                        </p>

                                        <div className="mt-auto flex flex-wrap gap-3">
                                            <a
                                                href={post.permalink_url}
                                                target="_blank"
                                                className="group/btn flex items-center justify-center w-8 h-8 rounded-lg bg-[#E50914]/10 hover:bg-[#E50914] text-[#E50914] hover:text-white transition-all border border-[#E50914]/20"
                                                title="Facebook дээр үзэх"
                                            >
                                                <Facebook className="w-4 h-4" />
                                            </a>

                                            <button
                                                onClick={() => handleClone(post)}
                                                className="group/btn flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-green-500/10 text-gray-400 hover:text-green-500 transition-all border border-white/5 hover:border-green-500/20 text-xs font-medium ml-auto"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                Хуулж авах
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
