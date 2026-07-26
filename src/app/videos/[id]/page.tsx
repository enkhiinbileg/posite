"use client";


import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVideoDetailAction, createManualPaymentRequestAction } from "@/app/actions/video-actions";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { 
    Gem, Ticket, Clock, Calendar, Eye, Share2, 
    ArrowLeft, Check, QrCode, CreditCard, Loader2, X, Copy 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

export default function VideoDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    
    const [video, setVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentType, setPaymentType] = useState<'purchase' | 'rental'>('rental');
    
    // Payment States
    const [paymentMethod, setPaymentMethod] = useState<'manual' | 'qpay' | null>(null);
    const [qpayData, setQpayData] = useState<any>(null);
    const [isCreatingPayment, setIsCreatingPayment] = useState(false);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);

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

    // Poll for payment status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (paymentMethod === 'qpay' && paymentId && !isCheckingPayment) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/payment/qpay/check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentId })
                    });
                    const data = await res.json();

                    if (data.success && data.status === 'completed') {
                        clearInterval(interval);
                        toast.success("Төлбөр амжилттай баталгаажлаа! Одоо үзэх боломжтой.");
                        setTimeout(() => window.location.reload(), 1500);
                    }
                } catch (e) {
                    console.error("Payment check error:", e);
                }
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [paymentMethod, paymentId, isCheckingPayment]);

    const handlePurchaseClick = (type: 'purchase' | 'rental') => {
        if (!user) {
            toast.error("Нэвтэрсэн байх шаардлагатай.");
            window.dispatchEvent(new Event('openAuth'));
            return;
        }
        setPaymentType(type);
        setShowPaymentModal(true);
    };

    const handleQPayCreate = async () => {
        setIsCreatingPayment(true);
        try {
            const amount = paymentType === 'purchase' ? video.price_purchase : video.price_rental;
            const res = await fetch('/api/payment/qpay/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: video.id,
                    accessType: paymentType,
                    amount: amount,
                    userId: user?.id,
                    description: `VIDEO ${paymentType === 'purchase' ? 'БҮРЭН' : 'ТҮРЭЭС'} - ${video.title} (${profile?.unique_id || profile?.username || user?.email || user?.id})`
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setQpayData(data);
            setPaymentId(data.paymentId);
            setPaymentMethod('qpay');
        } catch (err: any) {
            toast.error("Алдаа гарлаа: " + err.message);
        } finally {
            setIsCreatingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    const price = paymentType === 'purchase' ? video.price_purchase : video.price_rental;

    return (
        <div className="min-h-screen bg-[#050505] relative overflow-hidden">
            {/* Background Mesh Gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 pt-12 md:pt-24 pb-20">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.button 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all mb-8 group bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 w-fit"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Буцах</span>
                    </motion.button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                    {/* Left Column: Player & Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <VideoPlayer 
                            videoUrl={video.video_url}
                            hasAccess={video.hasAccess}
                            onPurchaseClick={handlePurchaseClick}
                            thumbnail={video.thumbnail_url}
                        />

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                                                {video.category || "Видео"}
                                            </span>
                                            {video.is_new && (
                                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                    Шинэ
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-[1.1]">
                                            {video.title}
                                        </h1>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">

                                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            <span className="text-[11px] font-black text-white/70 uppercase tracking-tight">{new Date(video.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button className="ml-auto p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5">
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50" />
                                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed whitespace-pre-wrap relative z-10">
                                        {video.description || "Энэхүү бичлэгт одоогоор тайлбар оруулаагүй байна."}
                                    </p>
                                </div>
                            </motion.div>
                    </div>

                    {/* Right Column: Sidebar / Purchase Card */}
                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            {!video.hasAccess ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 backdrop-blur-2xl sticky top-24"
                                >
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                            <Gem className="w-5 h-5 text-primary" />
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Бичлэг үзэх</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group hover:border-primary/30 transition-all text-center">
                                            <div className="flex flex-col items-center gap-2 mb-6">
                                                <Ticket className="w-10 h-10 text-primary mb-2" />
                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Видео түрээслэх</span>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl font-black text-white">{video.price_rental.toLocaleString()}₮</span>
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase mb-2">/ {video.rental_duration_hours}ц</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setPaymentType('rental');
                                                    setShowPaymentModal(true);
                                                }}
                                                className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-rose-600 transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)] active:scale-95"
                                            >
                                                Одоо түрээслэх
                                            </button>
                                        </div>
                                    </div>

                                    <p className="mt-6 text-[10px] text-center text-zinc-500 font-bold uppercase tracking-tighter">
                                        Төлбөр төлснөөр та манай үйлчилгээний нөхцөлийг зөвшөөрч буй хэрэг юм.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-2xl sticky top-24"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
                                        <Check className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-3 leading-tight">Танд үзэх эрх <br/>идэвхтэй байна</h3>
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-[11px] text-emerald-500 font-black uppercase tracking-widest leading-relaxed">
                                            {video.accessData?.access_type === 'purchase' 
                                                ? "Хугацаа хязгааргүй"
                                                : `Дуусах: ${new Date(video.accessData?.expires_at).toLocaleString()}`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Related Videos */}
                        {video.relatedVideos && video.relatedVideos.length > 0 && (
                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest px-2">Дараагийн ангиуд</h3>
                                <div className="space-y-3">
                                    {video.relatedVideos.map((rv: any, idx: number) => (
                                        <motion.button 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            key={rv.id}
                                            onClick={() => router.push(`/videos/${rv.id}`)}
                                            className="flex gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group text-left w-full border border-transparent hover:border-white/5"
                                        >
                                            <div className="relative w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 shadow-lg">
                                                <Image src={rv.thumbnail_url || "/images/placeholder-video.jpg"} alt={rv.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                                            </div>
                                            <div className="flex flex-col justify-center gap-1 min-w-0">
                                                <h4 className="text-[12px] font-black text-white line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{rv.title}</h4>

                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal (Simplified for Video) */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 relative shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                        >
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPaymentMethod(null);
                                    setQpayData(null);
                                }}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Видео Төлбөр</h3>
                                <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
                                    <span className="text-primary font-black">{video.title}</span> - Түрээслэх
                                </p>
                            </div>

                            {!paymentMethod ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleQPayCreate}
                                        disabled={isCreatingPayment}
                                        className="w-full p-6 bg-[#00adef] hover:bg-[#00adef]/90 text-white rounded-3xl flex items-center justify-between transition-all group shadow-xl shadow-cyan-500/10"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                                                <QrCode className="w-7 h-7 text-[#00adef]" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black uppercase text-sm tracking-widest">QPay</div>
                                                <div className="text-[10px] opacity-80 font-bold uppercase tracking-tight">QR Код уншуулаад шууд үзнэ</div>
                                            </div>
                                        </div>
                                        {isCreatingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('manual')}
                                        className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-3xl flex items-center justify-between transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                                <CreditCard className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black uppercase text-sm tracking-widest text-white">Шилжүүлэг хийх</div>
                                                <div className="text-[10px] opacity-40 font-bold uppercase tracking-tight">Баримтаа чатаар илгээнэ</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : paymentMethod === 'qpay' && qpayData ? (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="space-y-8"
                                >
                                    <div className="relative group mx-auto w-fit">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-[#00adef] to-primary blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                        <div className="relative bg-white p-6 rounded-[2.5rem] shadow-2xl overflow-hidden">
                                            <Image 
                                                src={qpayData.qrImage.startsWith('data:') ? qpayData.qrImage : `data:image/png;base64,${qpayData.qrImage}`} 
                                                alt="QPay QR" 
                                                width={200} 
                                                height={200} 
                                                className="relative z-10"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-r from-[#00adef] to-[#0085cf] text-[8px] font-black text-white text-center uppercase tracking-[0.3em]">
                                                QPay Payment Gateway
                                            </div>
                                        </div>
                                        
                                        {/* Status Indicator */}
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Төлбөр хүлээж байна...</span>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Банк сонгох</span>
                                            <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-tight">Автомат шалгалт идэвхтэй</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {qpayData.urls?.map((app: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={app.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex flex-col items-center gap-2 group/bank transition-all"
                                                >
                                                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/5 group-hover/bank:border-[#00adef]/50 group-hover/bank:scale-110 transition-all duration-300">
                                                        <Image src={app.logo} alt={app.name} fill className="object-cover" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover/bank:bg-black/5 transition-colors" />
                                                    </div>
                                                    <span className="text-[8px] font-bold text-zinc-500 group-hover/bank:text-white transition-colors text-center leading-tight line-clamp-1">
                                                        {app.description.split(' ')[0]}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#00adef]/10 flex items-center justify-center">
                                                    <QrCode className="w-4 h-4 text-[#00adef]" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Нийт төлөх</div>
                                                    <div className="text-sm font-black text-white">{price.toLocaleString()}₮</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setPaymentMethod(null)}
                                                className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                                            >
                                                Цуцлах
                                            </button>
                                        </div>

                                        <button 
                                            onClick={async () => {
                                                setIsCheckingPayment(true);
                                                try {
                                                    const res = await fetch('/api/payment/qpay/check', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ paymentId })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success && data.status === 'completed') {
                                                        toast.success("Төлбөр амжилттай баталгаажлаа!");
                                                        setTimeout(() => {
                                                            if (data.videoId) {
                                                                router.push(`/videos/${data.videoId}`);
                                                            } else {
                                                                window.location.reload();
                                                            }
                                                        }, 1500);
                                                    } else {
                                                        toast.error(`Төлбөр хараахан төлөгдөөгүй байна. (${data.currentStatus || 'ХҮЛЭЭГДЭЖ БУЙ'} | ${data.debug || ''})`);
                                                    }
                                                } catch (e) {
                                                    toast.error("Шалгахад алдаа гарлаа.");
                                                } finally {
                                                    setIsCheckingPayment(false);
                                                }
                                            }}
                                            disabled={isCheckingPayment}
                                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#ff1b5e] to-[#ff4b2b] text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isCheckingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "ТӨЛБӨР ШАЛГАХ"}
                                        </button>
                                    </div>
                                </motion.div>
                            ) : paymentMethod === 'manual' ? (
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                                        
                                        <div className="space-y-8">
                                            <div className="group cursor-pointer" onClick={() => {
                                                navigator.clipboard.writeText("480005005954613802");
                                                toast.success("Дансны дугаар хуулагдлаа");
                                            }}>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-primary transition-colors">Дансны дугаар (Хуулах)</p>
                                                <div className="flex items-center justify-center gap-3">
                                                    <h4 className="text-2xl font-black text-white tracking-tighter">480005005954613802</h4>
                                                    <Copy className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>

                                            <div className="group cursor-pointer" onClick={() => {
                                                const identifier = profile?.unique_id || profile?.username || user?.id?.slice(0, 4);
                                                const desc = `VIDEO RENT ${video.id.slice(0, 4)} ${identifier}`.toUpperCase();
                                                navigator.clipboard.writeText(desc);
                                                toast.success("Гүйлгээний утга хуулагдлаа");
                                            }}>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-primary transition-colors">Гүйлгээний утга (Хуулах)</p>
                                                <div className="flex items-center justify-center gap-3">
                                                    <h4 className="text-2xl font-black text-primary tracking-tighter uppercase">
                                                        VIDEO {video.id.slice(0, 4)} {profile?.unique_id || profile?.username || user?.id?.slice(0, 4)}
                                                    </h4>
                                                    <Copy className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-all" />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Төлөх дүн</p>
                                                <h4 className="text-3xl font-black text-white tracking-tighter">{price.toLocaleString()}₮</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        disabled={isCreatingPayment}
                                        onClick={async () => {
                                            setIsCreatingPayment(true);
                                            const res = await createManualPaymentRequestAction({
                                                userId: user!.id,
                                                videoId: video.id,
                                                amount: price,
                                                accessType: paymentType
                                            });
                                            if (res.success) {
                                                toast.success("Таны хүсэлт илгээгдлээ. Админ баталгаажуулсны дараа бичлэг нээгдэнэ.");
                                                setShowPaymentModal(false);
                                                setPaymentMethod(null);
                                            } else {
                                                toast.error(res.error);
                                            }
                                            setIsCreatingPayment(false);
                                        }}
                                        className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCreatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Шилжүүлэг хийсэн тухай мэдэгдэх
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod(null)}
                                        className="w-full text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Буцах
                                    </button>
                                </div>
                            ) : null}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
