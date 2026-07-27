"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVideoDetailAction } from "@/app/actions/video-actions";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { 
    Crown, Clock, Calendar, Eye, Share2, 
    ArrowLeft, Check, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

export default function VideoDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    
    const [video, setVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isVipUser = profile?.is_admin || profile?.is_vip || profile?.is_nsfw_vip || false;

    useEffect(() => {
        async function fetchDetail() {
            const res = await getVideoDetailAction(id as string, user?.id);
            if (res.success) {
                setVideo(res.data);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
        );
    }

    const hasAccess = video.is_free || isVipUser || video.hasAccess;

    return (
        <div className="min-h-screen bg-[#0a0610] text-white relative overflow-hidden">
            {/* Background Mesh Gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-amber-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 pt-12 md:pt-24 pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <motion.button 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all mb-6 group bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 w-fit cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Буцах</span>
                    </motion.button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                        {/* Left Column: Player & Info */}
                        <div className="lg:col-span-2 space-y-8">
                            <VideoPlayer 
                                videoUrl={video.video_url}
                                hasAccess={hasAccess}
                                onPurchaseClick={handleVipRedirect}
                                thumbnail={video.thumbnail_url}
                            />

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            {video.is_free ? (
                                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                    ҮНЭГҮЙ БИЧЛЭГ
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Crown className="w-3 h-3 fill-amber-400" /> VIP БИЧЛЭГ
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                                            {video.title}
                                        </h1>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <Calendar className="w-4 h-4 text-red-500" />
                                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-tight">
                                                {new Date(video.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button className="ml-auto p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 cursor-pointer">
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-60" />
                                    <p className="text-zinc-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap relative z-10">
                                        {video.description || "Энэхүү бичлэгт одоогоор тайлбар оруулаагүй байна."}
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column: VIP Paywall Sidebar */}
                        <div className="space-y-6">
                            <AnimatePresence mode="wait">
                                {!hasAccess ? (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-zinc-900 to-black border border-amber-500/30 backdrop-blur-2xl sticky top-24 space-y-6 shadow-2xl text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/40">
                                            <Crown className="w-8 h-8 fill-amber-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">👑 VIP Гишүүнчлэл</h3>
                                            <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
                                                Энэхүү бичлэг нь зөвхөн VIP гишүүдэд зориулагдсан. Та VIP эрх аван бүх бичлэгийг хязгааргүй үзээрэй!
                                            </p>
                                        </div>
                                        <button 
                                            onClick={handleVipRedirect}
                                            className="w-full py-4 rounded-xl bg-amber-500 text-black font-extrabold uppercase text-xs tracking-wider hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Crown className="w-4 h-4 fill-black" />
                                            👑 VIP Эрх Авах (19,900₮ / сар)
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-2xl sticky top-24 space-y-3"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                            <Check className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">VIP Эрх Идэвхтэй</h3>
                                        <p className="text-xs text-emerald-400 font-semibold leading-relaxed">
                                            Та VIP гишүүн тул бүх бичлэгийг хязгааргүй үзэх боломжтой байна.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Related Videos */}
                            {video.relatedVideos && video.relatedVideos.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Дараагийн бичлэгүүд</h3>
                                    <div className="space-y-3">
                                        {video.relatedVideos.map((rv: any, idx: number) => (
                                            <div 
                                                key={rv.id}
                                                onClick={() => router.push(`/videos/${rv.id}`)}
                                                className="flex gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all group text-left w-full border border-transparent hover:border-white/10 cursor-pointer"
                                            >
                                                <div className="relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 shadow">
                                                    <Image src={rv.thumbnail_url || "/images/placeholder-video.jpg"} alt={rv.title} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                                </div>
                                                <div className="flex flex-col justify-center gap-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-500 transition-colors">{rv.title}</h4>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
