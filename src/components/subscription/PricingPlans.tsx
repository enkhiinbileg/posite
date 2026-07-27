import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Zap, Star, X, Copy, Layout, List, Sparkles, Loader2, QrCode, CreditCard, Gem, Ghost, Film, ArrowLeft, Gift, Ticket, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getUser8DigitId } from "@/lib/user-id";

const ICONS = { Zap, Crown, Star, Layout, List, Sparkles, Gem, Ghost, Film };

interface PricingPlan {
    id: string;
    title: string;
    price: number | string;
    duration_value: number;
    duration_unit: string;
    features: string[];
    is_recommended?: boolean;
    is_nsfw?: boolean;
    icon_name: string;
    color_preset: string;
}

const DEFAULT_PLANS: PricingPlan[] = [
    {
        id: 'monthly',
        title: "1 Сар",
        price: 5000,
        duration_value: 1,
        duration_unit: "months",
        features: ["Бүх VIP бүлгүүдийг унших", "Гайхалтай дүрсний чанар", "Зар сурталчилгаагүй", "Тогтмол шинэчлэлт"],
        icon_name: "Zap",
        color_preset: "from-blue-500 to-cyan-500"
    },
    {
        id: 'quarterly',
        title: "3 Сар",
        price: 13500,
        duration_value: 3,
        duration_unit: "months",
        features: ["10% хэмнэлт", "Бүх VIP бүлгүүдийг унших", "Тэргүүн ээлжинд унших", "Баджийн тэмдэг", "Дэмжлэг үзүүлэх"],
        is_recommended: true,
        icon_name: "Crown",
        color_preset: "from-pink-500 to-rose-500"
    },
    {
        id: 'annually',
        title: "1 Жил",
        price: 50000,
        duration_value: 1,
        duration_unit: "years",
        features: ["20% их хэмнэлт", "Бүх давуу талууд", "Тусгай бэлэг", "Нэвтрүүлэгчээр ажиллах эрх (заавартай)", "Нэмэлт бонус"],
        icon_name: "Star",
        color_preset: "from-yellow-500 to-amber-500"
    },
    {
        id: 'nsfw_monthly',
        title: "18+ VIP (1 Сар)",
        price: 10000,
        duration_value: 1,
        duration_unit: "months",
        features: ["Бүх +18 контентыг унших", "Тусгай нууц хэсэгт нэвтрэх", "Зөвхөн насанд хүрэгчдэд"],
        icon_name: "Sparkles",
        color_preset: "from-purple-600 to-red-600"
    }
];

export function PricingPlans() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [uniqueId, setUniqueId] = useState<string | null>(null);
    const [isReferred, setIsReferred] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // 2-Step States
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedCategory, setSelectedCategory] = useState<'standard' | 'nsfw'>('standard');
    
    // QPay States
    const [paymentMethod, setPaymentMethod] = useState<'manual' | 'qpay' | null>(null);
    const [qpayData, setQpayData] = useState<any>(null);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);

    // Fetch user Info
    useEffect(() => {
        if (user) {
            setUserId(user.id);
            if (profile?.unique_id) {
                setUniqueId(profile.unique_id);
            }
        } else {
            setUserId(null);
            setUniqueId(null);
        }
    }, [user, profile]);

    useEffect(() => {
        const stored = localStorage.getItem('referred_by_code');
        if (stored) {
            try {
                const { expires } = JSON.parse(stored);
                if (new Date().getTime() <= expires) {
                    setIsReferred(true);
                }
            } catch (e) { }
        }

        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) {
                console.error("Fetch plans error:", error);
            }

            if (data && data.length > 0) {
                setPlans(data);
            }
        } catch (err) {
            console.error("Unexpected error fetching plans:", err);
        }
    }

    const getDiscountedPrice = (price: number) => {
        if (!isReferred) return `${price.toLocaleString()}₮`;
        const discounted = Math.floor(price * 0.9 / 100) * 100; // Round to nearest 100
        return `${discounted.toLocaleString()}₮`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Хуулагдлаа!");
    };

    const handleSelectPlan = (plan: PricingPlan) => {
        if (!userId) {
            toast.error("VIP эрх авахын тулд эхлээд нэвтэрнэ үү!", {
                description: "Нэвтэрсний дараа таны төлбөр өөрийн бүртгэлд тань холбогдох болно.",
                action: {
                    label: "Нэвтрэх",
                    onClick: () => window.location.href = '/?auth=true'
                }
            });
            return;
        }
        setSelectedPlan(plan);
    };

    const getPaymentMemo = () => {
        const id8 = getUser8DigitId(user, profile);
        return `PM ${id8}`;
    };

    const formatDuration = (val: number, unit: string) => {
        if (unit === 'months') return `${val} сар`;
        if (unit === 'days') return `${val} хоног`;
        if (unit === 'years') return `${val} жил`;
        return `${val} ${unit}`;
    };

    const handleQPayCheckout = async () => {
        if (!selectedPlan || !userId) return;
        
        setLoading(true);
        try {
            const price = isReferred ? Math.floor(Number(selectedPlan.price) * 0.9 / 100) * 100 : Number(selectedPlan.price);
            
            const res = await fetch('/api/payment/qpay/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    amount: price,
                    userId: userId,
                    description: `${selectedPlan.title} VIP Сунгалт - ${getPaymentMemo()}`
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setQpayData(data);
            setPaymentId(data.paymentId);
            setPaymentMethod('qpay');
        } catch (err: any) {
            toast.error("QPay нэхэмжлэх үүсгэхэд алдаа гарлаа: " + err.message);
        } finally {
            setLoading(false);
        }
    };

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
                        setTimeout(() => {
                            if (data.videoId) {
                                router.push(`/videos/${data.videoId}`);
                            } else {
                                window.location.reload();
                            }
                        }, 1500);
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

    const filteredPlans = plans.filter(plan => {
        if (selectedCategory === 'nsfw') return plan.is_nsfw;
        return !plan.is_nsfw;
    });

    const categories = [
        { 
            id: 'standard', 
            title: 'VIP БАГЦ', 
            icon: Gem, 
            features: ['Бүх VIP бүлгүүдийг унших', 'Зар сурталчилгаагүй', 'HD дүрсний чанар', 'Тогтмол шинэчлэлт'],
            color: 'from-pink-500 to-rose-500',
            image: '/images/subscription/standard_bg.jpg'
        },
        { 
            id: 'nsfw', 
            title: '18+ VIP БАГЦ', 
            icon: Ghost, 
            features: ['Бүх +18 контентыг унших', 'Нууц хэсэгт нэвтрэх', 'Зар сурталчилгаагүй', 'Тусгай контент'],
            color: 'from-purple-500 to-indigo-500',
            image: '/images/subscription/nsfw_bg.jpg'
        }
    ];

    return (
        <div className="w-full relative py-12 min-h-screen overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="flex flex-col items-center"
                        >
                            <div className="text-center mb-16 relative z-10 px-4">
                                <h2 className="text-4xl md:text-6xl font-black text-white/90 mb-4 tracking-tight">
                                    Эрх сунгах багцаа сонгоно уу
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                                {categories.map((cat: any) => (
                                    <div
                                        key={cat.id}
                                        className={cn(
                                            "relative group rounded-[2.5rem] p-10 border transition-all duration-500 flex flex-col items-center text-center overflow-hidden",
                                            "bg-[#0a0a0a]/60 backdrop-blur-2xl border-white/5 hover:border-white/20 hover:scale-[1.02]"
                                        )}
                                    >
                                        {/* Background Image for NSFW */}
                                                <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                                                    {/* Blurred background to fill edges */}
                                                    <Image 
                                                        src={cat.image} 
                                                        alt="" 
                                                        fill 
                                                        className="object-cover opacity-40 blur-sm scale-110"
                                                    />
                                                    {/* Main focused image (Contain) */}
                                                    <Image 
                                                        src={cat.image} 
                                                        alt={cat.title} 
                                                        fill 
                                                        className="object-contain opacity-60 transition-all duration-700"
                                                        style={{ objectPosition: 'center' }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/40 opacity-90" />
                                                </div>

                                        <div className="relative z-10 w-full flex flex-col items-center">
                                            {!cat.image && (
                                                <div className="mb-10 p-6 rounded-3xl bg-white/5 group-hover:bg-white/10 transition-colors">
                                                    <cat.icon className="w-16 h-16 text-primary group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            )}

                                            {cat.image && (
                                                <div className="h-24" /> // Spacer for where the icon was
                                            )}

                                            <h3 className="text-3xl font-black text-white mb-8 uppercase tracking-tight drop-shadow-lg">
                                                {cat.title}
                                            </h3>

                                            <div className="space-y-4 mb-10 w-full">
                                                {cat.features.map((feature: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 text-sm font-black text-white uppercase tracking-tight drop-shadow-md">
                                                        <Check className="w-4 h-4 text-white" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedCategory(cat.id as any);
                                                    setStep(2);
                                                }}
                                                className={cn(
                                                    "w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] transition-all relative overflow-hidden",
                                                    "bg-gradient-to-r from-[#ff1b5e] to-[#ff4b2b] text-white shadow-xl shadow-red-500/20 active:scale-95"
                                                )}
                                            >
                                                Сонгох
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <div className="flex items-center gap-4 mb-12">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                >
                                    <ArrowLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
                                    {selectedCategory === 'standard' ? 'VIP БАГЦ' : '18+ VIP БАГЦ'} /ХЭТЭВЧНЭЭС СУНГАХ/
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredPlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={cn(
                                            "relative group rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col h-full",
                                            "bg-[#0a0a0a]/60 backdrop-blur-2xl border-white/5 hover:border-white/10 shadow-2xl",
                                            plan.is_recommended && "ring-2 ring-primary/40 ring-offset-4 ring-offset-[#0a0a0a]"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-5xl font-black text-white tracking-tighter">
                                                    {(Number(plan.price)).toLocaleString()}
                                                </span>
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center translate-y-2">
                                                    <Gem className="w-5 h-5 text-white/40" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-white/40 text-sm font-bold uppercase tracking-widest mb-8">
                                            {formatDuration(plan.duration_value, plan.duration_unit)}
                                        </div>

                                        <div className="h-px bg-white/5 w-full mb-8" />

                                        <div className="space-y-4 mb-10 flex-1">
                                            {plan.features?.map((feature, i) => (
                                                <div key={i} className="flex items-center gap-3 text-xs font-black text-white uppercase tracking-tight drop-shadow-md">
                                                    <Check className="w-4 h-4 text-white" />
                                                    <span className="leading-none">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleSelectPlan(plan)}
                                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff1b5e] to-[#ff4b2b] text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                            >
                                                Эрх авах
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* Payment Modal */}
            <AnimatePresence>
            {selectedPlan && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 relative shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                    >
                        <button
                            onClick={() => {
                                setSelectedPlan(null);
                                setPaymentMethod(null);
                                setQpayData(null);
                            }}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Төлбөр төлөх</h3>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
                                <span className="text-primary font-black">{selectedPlan.title}</span> багц сонгосон байна
                            </p>
                        </div>

                        {!paymentMethod ? (
                            <div className="space-y-4">
                                <button
                                    onClick={handleQPayCheckout}
                                    disabled={loading}
                                    className="w-full p-6 bg-[#00adef] hover:bg-[#00adef]/90 text-white rounded-3xl flex items-center justify-between transition-all group shadow-xl shadow-cyan-500/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                                            <QrCode className="w-7 h-7 text-[#00adef]" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-black uppercase text-sm tracking-widest">QPay (Автомат)</div>
                                            <div className="text-[10px] opacity-80 font-bold uppercase tracking-tight">QR Код уншуулаад шууд идэвхжинэ</div>
                                        </div>
                                    </div>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#00adef] transition-all"><Check className="w-5 h-5" /></div>}
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
                                            <div className="font-black uppercase text-sm tracking-widest text-white">Банкны шилжүүлэг</div>
                                            <div className="text-[10px] opacity-40 font-bold uppercase tracking-tight">Шилжүүлээд баримтаа илгээнэ</div>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all"><Check className="w-5 h-5" /></div>
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
                                                <div className="text-sm font-black text-white">{getDiscountedPrice(Number(selectedPlan.price))}</div>
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
                                                    toast.error("Төлбөр хараахан төлөгдөөгүй байна.");
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
                        ) : paymentMethod === 'manual' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div className="bg-white/5 rounded-3xl p-6 space-y-6 border border-white/5">
                                    <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard('480005005954613802')}>
                                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Дансны дугаар</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-white text-lg tracking-tight">480005005954613802</span>
                                            <Copy className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    <div className="flex justify-between items-center">
                                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Хүлээн авагч</span>
                                        <span className="font-bold text-white text-sm uppercase tracking-tight">Нямдорж Энхийнбилэг</span>
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(getPaymentMemo())}>
                                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Гүйлгээний утга</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-yellow-500 text-lg uppercase tracking-wider">{getPaymentMemo()}</span>
                                            <Copy className="w-4 h-4 text-white/30 group-hover:text-yellow-500 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    <div className="flex justify-between items-center">
                                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Төлөх дүн</span>
                                        <div className="flex flex-col items-end">
                                            {isReferred && <span className="text-xs text-white/20 line-through">{(Number(selectedPlan.price)).toLocaleString()}₮</span>}
                                            <span className="font-black text-white text-3xl tracking-tighter">
                                                {getDiscountedPrice(Number(selectedPlan.price))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] text-center text-white/20 leading-relaxed font-bold uppercase tracking-widest">
                                        Төлбөр шилжүүлээд баримтаа илгээнэ үү. <br/>
                                        Бид 5-30 минутын дотор идэвхжүүлнэ.
                                    </p>
                                    <button
                                        onClick={() => {
                                            const finalPrice = getDiscountedPrice(Number(selectedPlan.price));
                                            const message = `Төлбөр шалгах: ${getPaymentMemo()} - ${finalPrice}`;
                                            navigator.clipboard.writeText(message);
                                            toast.info("Текст хуулагдлаа! Мессенжерт paste хийнэ үү.", { duration: 3000 });
                                            setTimeout(() => {
                                                window.open('https://www.facebook.com/profile.php?id=61587051845756', '_blank');
                                            }, 500);
                                        }}
                                        className="w-full py-5 rounded-2xl bg-[#0066ff] hover:bg-[#1a75ff] text-white font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                                    >
                                        Баримт илгээх (Messenger)
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod(null)}
                                        className="w-full py-2 text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors tracking-widest"
                                    >
                                        Буцах
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </div>
    );
}
