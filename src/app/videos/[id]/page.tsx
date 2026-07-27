"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVideoDetailAction, getVideosAction } from "@/app/actions/video-actions";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { 
    Crown, Clock, Calendar, Eye, Share2, ThumbsUp, ThumbsDown,
    ArrowLeft, Check, Loader2, Heart, Download, Flag, Plus,
    ChevronDown, ChevronUp, PlayCircle, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";

// Extract clean description and category tags from description
function parseDescription(desc: string) {
    if (!desc) return { clean: "", tags: [] };
    const tagMatches = [...desc.matchAll(/\[Category:\s*([^\]]+)\]/gi)];
    const tags = tagMatches.map(m => m[1].trim()).filter(Boolean);
    const clean = desc.replace(/\[Category:[^\]]*\]/gi, "").trim();
    return { clean, tags };
}

export default function VideoDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    
    const [video, setVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
    const [liked, setLiked] = useState(false);
    const [disliked, setDisliked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);

    const isVipUser = profile?.is_admin || profile?.is_vip || profile?.is_nsfw_vip || false;

    useEffect(() => {
        async function fetchDetail() {
            const res = await getVideoDetailAction(id as string, user?.id);
            if (res.success) {
                setVideo(res.data);
                // Fetch related videos
                const allRes = await getVideosAction();
                if (allRes.success && allRes.data) {
                    const others = allRes.data.filter((v: any) => v.id !== id);
                    setRelatedVideos(others.slice(0, 12));
                }
            } else {
                toast.error("Видео мэдээлэл авахад алдаа гарлаа.");
                router.push('/videos');
            }
            setLoading(false);
        }
        fetchDetail();
    }, [id, user?.id]);

    const handleVipRedirect = () => {
        if (!user) {
            toast.error("Нэвтэрсэн байх шаардлагатай.");
            window.dispatchEvent(new Event('openAuth'));
            return;
        }
        router.push('/vip');
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Холбоос хуулагдлаа!");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[#ff9000] animate-spin" />
                    <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Ачаалж байна...</p>
                </div>
            </div>
        );
    }

    const hasAccess = video.is_free || isVipUser || video.hasAccess;
    const { clean: cleanDesc, tags } = parseDescription(video.description || "");
    const views = video.views || Math.floor(Math.random() * 9000000) + 100000;
    const likes = Math.floor(views * 0.12);
    const dislikes = Math.floor(views * 0.015);
    const likePercent = Math.round((likes / (likes + dislikes)) * 100);
    const videoDate = video.created_at ? new Date(video.created_at) : new Date();
    const is4K = (video.id?.charCodeAt(0) || 0) % 2 === 0;
    const qualityTag = is4K ? "4K" : "HD";

    const formatViews = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
        if (n >= 1000) return (n / 1000).toFixed(0) + "K";
        return n.toLocaleString();
    };

    // Combined tags from DB + from description
    const allTags = [...new Set([...tags, ...(video.genres || [])])];
    if (allTags.length === 0) allTags.push("HD", "18+", "Amateur");

    return (
        <div className="min-h-screen bg-[#1b1b1b] text-white font-sans">
            {/* Main Content */}
            <div className="pt-[60px] max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-8 py-5">

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 text-sm group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-semibold">Буцах</span>
                </button>

                {/* Main Layout: Player + Sidebar */}
                <div className="flex flex-col xl:flex-row gap-6">

                    {/* LEFT: Player + Info */}
                    <div className="flex-1 min-w-0 space-y-0">

                        {/* ======================== VIDEO PLAYER ======================== */}
                        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl">
                            <VideoPlayer 
                                videoUrl={video.video_url}
                                hasAccess={hasAccess}
                                onPurchaseClick={handleVipRedirect}
                                thumbnail={video.thumbnail_url}
                            />
                        </div>

                        {/* ======================== TITLE + BADGES ======================== */}
                        <div className="pt-4 pb-2 border-b border-white/10 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {video.is_free ? (
                                    <span className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">ҮНЭГҮЙ</span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded bg-[#ff9000] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Crown className="w-3 h-3 fill-black" /> VIP
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded bg-zinc-700 text-zinc-200 text-[10px] font-black uppercase">{qualityTag}</span>
                            </div>

                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                                {video.title}
                            </h1>

                            {/* Stats Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                                <span className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    <span className="font-semibold text-white">{formatViews(views)}</span> үзэлт
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        {videoDate.toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-zinc-400 text-xs">{formatDistanceToNow(videoDate, { addSuffix: true, locale: mn })}</span>
                            </div>
                        </div>

                        {/* ======================== ACTIONS BAR ======================== */}
                        <div className="py-3 border-b border-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-3">

                                {/* Like/Dislike */}
                                <div className="flex items-center gap-0">
                                    <button
                                        onClick={() => { setLiked(!liked); if (disliked) setDisliked(false); }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-l-full text-sm font-bold transition-all cursor-pointer border border-r-0 ${liked ? 'bg-[#ff9000] text-black border-[#ff9000]' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'}`}
                                    >
                                        <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-black' : ''}`} />
                                        <span>{formatViews(likes + (liked ? 1 : 0))}</span>
                                    </button>
                                    <div className="w-px h-8 bg-zinc-600" />
                                    <button
                                        onClick={() => { setDisliked(!disliked); if (liked) setLiked(false); }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-r-full text-sm font-bold transition-all cursor-pointer border border-l-0 ${disliked ? 'bg-zinc-600 text-white border-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'}`}
                                    >
                                        <ThumbsDown className={`w-4 h-4 ${disliked ? 'fill-white' : ''}`} />
                                    </button>
                                </div>

                                {/* Other Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSaved(!saved)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer border ${saved ? 'bg-red-600 text-white border-red-600' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                                        <span className="hidden sm:inline">{saved ? 'Хадгалсан' : 'Хадгалах'}</span>
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold border border-zinc-700 transition-all cursor-pointer"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Хуваалцах</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold border border-zinc-700 transition-all cursor-pointer">
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Жагсаалт</span>
                                    </button>
                                    <button className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-all cursor-pointer">
                                        <Flag className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Rating Bar (PornHub style) */}
                            <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                                    <span className="flex items-center gap-1 text-zinc-300"><ThumbsUp className="w-3 h-3" /> {likePercent}%</span>
                                    <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {100 - likePercent}%</span>
                                </div>
                                <div className="h-1 w-full bg-zinc-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#ff9000] to-[#ffb347] rounded-full transition-all"
                                        style={{ width: `${likePercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ======================== TAGS ======================== */}
                        {allTags.length > 0 && (
                            <div className="py-4 border-b border-white/10">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mr-1">Тэмдэглэгээ:</span>
                                    {allTags.map((tag, i) => (
                                        <Link
                                            key={i}
                                            href={`/category/${encodeURIComponent(tag.toLowerCase())}`}
                                            className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-[#ff9000] hover:text-black text-zinc-300 text-xs font-semibold border border-zinc-700 hover:border-[#ff9000] transition-all capitalize"
                                        >
                                            {tag}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ======================== DESCRIPTION ======================== */}
                        {cleanDesc && (
                            <div className="py-4 border-b border-white/10">
                                <div className="relative">
                                    <p className={`text-zinc-400 text-sm leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}>
                                        {cleanDesc}
                                    </p>
                                    {cleanDesc.length > 200 && (
                                        <button
                                            onClick={() => setDescExpanded(!descExpanded)}
                                            className="mt-2 flex items-center gap-1 text-[#ff9000] text-xs font-bold hover:underline cursor-pointer"
                                        >
                                            {descExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Хураах</> : <><ChevronDown className="w-3.5 h-3.5" /> Дэлгэрэнгүй</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ======================== RELATED VIDEOS (below on mobile) ======================== */}
                        {relatedVideos.length > 0 && (
                            <div className="pt-6 xl:hidden">
                                <h2 className="text-base font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4 text-[#ff9000]" />
                                    Дараагийн бичлэгүүд
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {relatedVideos.slice(0, 6).map((rv) => (
                                        <RelatedCard key={rv.id} video={rv} onClick={() => router.push(`/videos/${rv.id}`)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ======================== RIGHT SIDEBAR ======================== */}
                    <div className="hidden xl:flex flex-col gap-5 w-[340px] flex-shrink-0">

                        {/* VIP Upsell or Access Badge */}
                        <AnimatePresence mode="wait">
                            {!hasAccess ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl bg-gradient-to-br from-[#ff9000]/20 via-zinc-900 to-zinc-950 border border-[#ff9000]/30 p-5 space-y-4 sticky top-20"
                                >
                                    <div className="text-center space-y-3">
                                        <div className="w-14 h-14 rounded-full bg-[#ff9000]/20 border border-[#ff9000]/40 flex items-center justify-center mx-auto">
                                            <Crown className="w-7 h-7 text-[#ff9000] fill-[#ff9000]" />
                                        </div>
                                        <h3 className="text-lg font-black text-white uppercase">VIP Гишүүнчлэл</h3>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            Бүх бичлэгийг хязгааргүй үзэх, 4K чанар, рекламгүй туршлага.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {['4K Ultra HD чанар', 'Хязгааргүй бичлэг', 'Реклам байхгүй', 'Офлайн хадгалах'].map((f) => (
                                            <div key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                                                <Check className="w-3.5 h-3.5 text-[#ff9000] flex-shrink-0" />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleVipRedirect}
                                        className="w-full py-3.5 rounded-xl bg-[#ff9000] hover:bg-[#e08000] text-black font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-[#ff9000]/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Crown className="w-4 h-4 fill-black" />
                                        VIP Эрх Авах — 19,900₮/сар
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">VIP Эрх Идэвхтэй</p>
                                        <p className="text-xs text-emerald-400">Хязгааргүй үзэх боломжтой</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Related Videos Sidebar */}
                        {relatedVideos.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4 text-[#ff9000]" />
                                    Дараагийн бичлэгүүд
                                </h2>
                                <div className="space-y-2.5">
                                    {relatedVideos.map((rv) => (
                                        <RelatedSidebarCard key={rv.id} video={rv} onClick={() => router.push(`/videos/${rv.id}`)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Related video card (grid, mobile) ----
function RelatedCard({ video, onClick }: { video: any; onClick: () => void }) {
    const views = video.views || Math.floor(Math.random() * 900000) + 10000;
    const formatViews = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toString();

    return (
        <div onClick={onClick} className="group cursor-pointer space-y-1.5">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900">
                <img 
                    src={video.thumbnail_url || "/images/placeholder-video.jpg"} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    12:45
                </div>
                {!video.is_free && (
                    <div className="absolute top-1 right-1 bg-[#ff9000] text-black text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Crown className="w-2 h-2 fill-black" /> VIP
                    </div>
                )}
            </div>
            <p className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-[#ff9000] transition-colors">{video.title}</p>
            <p className="text-[10px] text-zinc-500">{formatViews(views)} үзэлт</p>
        </div>
    );
}

// ---- Related video card (sidebar, desktop) ----
function RelatedSidebarCard({ video, onClick }: { video: any; onClick: () => void }) {
    const views = video.views || Math.floor(Math.random() * 900000) + 10000;
    const formatViews = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toString();

    return (
        <div onClick={onClick} className="flex gap-3 group cursor-pointer rounded-lg p-1.5 hover:bg-white/5 transition-colors">
            <div className="relative w-36 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
                <img 
                    src={video.thumbnail_url || "/images/placeholder-video.jpg"} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">12:45</div>
                {!video.is_free && (
                    <div className="absolute top-1 right-1 bg-[#ff9000] text-black text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Crown className="w-2 h-2 fill-black" /> VIP
                    </div>
                )}
            </div>
            <div className="flex flex-col justify-center gap-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-[#ff9000] transition-colors">{video.title}</p>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(views)} үзэлт
                </p>
            </div>
        </div>
    );
}
