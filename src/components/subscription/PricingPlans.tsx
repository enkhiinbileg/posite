import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Check, Crown, Zap, Star, X, Copy, Layout, List, Sparkles, 
    Loader2, QrCode, CreditCard, Gem, Ghost, Film, ArrowLeft, Gift, Ticket, Lock 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getUser8DigitId } from "@/lib/user-id";
import { getPricingPlansAction } from "@/app/actions/vip-actions";

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
        id: 'vip-1-month',
        title: "VIP 1 Сар",
        price: 19900,
        duration_value: 1,
        duration_unit: "months",
        features: [
            "Бүх VIP бичлэгүүдийг хязгааргүй үзэх",
            "HD ба 4K дүрсний чанар",
            "Зар сурталчилгаагүй"
        ],
        is_recommended: true,
        is_nsfw: false,
        icon_name: "Crown",
        color_preset: "from-amber-500 to-yellow-500"
    },
    {
        id: 'nsfw-1-month',
        title: "18+ VIP 1 Сар",
        price: 29900,
        duration_value: 1,
        duration_unit: "months",
        features: [
            "18+ тусгай бүх эксклюзив видеонууд",
            "Хязгааргүй шууд үзэх",
            "4K Ultra HD чанар"
        ],
        is_recommended: false,
        is_nsfw: true,
        icon_name: "Sparkles",
        color_preset: "from-rose-500 to-red-500"
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
        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            const res = await getPricingPlansAction();
            if (res.success && res.data && res.data.length > 0) {
                setPlans(res.data);
            }
        } catch (err) {
            console.error("Error fetching VIP plans:", err);
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Хуулагдлаа!");
    };

    const handleSelectPlan = (plan: PricingPlan) => {
        if (!userId) {
            toast.error("VIP эрх авахын тулд эхлээд нэвтэрнэ үү!");
            return;
        }
        setSelectedPlan(plan);
        setPaymentMethod(null);
        setQpayData(null);
    };

    const handleQPayCreate = async () => {
        if (!selectedPlan || !user) return;
        setLoading(true);
        setPaymentMethod('qpay');

        const memoText = `PM ${getUser8DigitId(user, profile)}`;

        try {
            const res = await fetch("/api/payment/qpay/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(selectedPlan.price),
                    description: memoText,
                    planId: selectedPlan.id,
                    userId: user.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа");

            setQpayData(data);
            setPaymentId(data.payment_id);
            toast.success("QPay нэхэмжлэх амжилттай үүслээ!");
        } catch (err: any) {
            toast.error(err.message || "Сүлжээний алдаа гарлаа");
            setPaymentMethod(null);
        } finally {
            setLoading(false);
        }
    };

    const checkQPayStatus = async () => {
        if (!paymentId || !qpayData?.invoice_id) return;
        setIsCheckingPayment(true);

        try {
            const res = await fetch("/api/payment/qpay/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentId,
                    invoiceId: qpayData.invoice_id
                })
            });

            const data = await res.json();
            if (data.paid) {
                toast.success("Төлбөр амжилттай баталгаажлаа! VIP эрх идэвхжлээ 🎉");
                setSelectedPlan(null);
                setQpayData(null);
                router.push("/profile");
            } else {
                toast.info("Төлбөр хараахан тохироогүй байна. Гүйлгээгээ хийсний дараа дахин шалгана уу.");
            }
        } catch (err: any) {
            toast.error("Төлбөр шалгахад алдаа гарлаа");
        } finally {
            setIsCheckingPayment(false);
        }
    };

    const getPaymentMemo = () => {
        const id8 = getUser8DigitId(user, profile);
        return `PM ${id8}`;
    };

    const formatDuration = (val: number, unit: string) => {
        if (unit === 'years') return `${val} Жил`;
        if (unit === 'months') return `${val} Сар`;
        return `${val} Хоног`;
    };

    const categories = [
        { 
            id: 'standard', 
            title: 'VIP БАГЦ', 
            icon: Crown, 
            features: [
                'Бүх VIP бичлэгүүдийг хязгааргүй үзэх',
                'HD ба 4K дүрсний чанар',
                'Зар сурталчилгаагүй',
                'Шинэ бичлэгүүд шууд үзэх'
            ],
            color: 'from-amber-500 to-yellow-500'
        },
        { 
            id: 'nsfw', 
            title: '18+ VIP БАГЦ', 
            icon: Sparkles, 
            features: [
                '18+ тусгай бүх эксклюзив видеонууд',
                'Хязгааргүй шууд үзэх',
                '4K Ultra HD чанар',
                'Тусгай эксклюзив агуулга'
            ],
            color: 'from-rose-500 to-red-500'
        }
    ];

    const filteredPlans = plans.filter(p => {
        if (selectedCategory === 'nsfw') return p.is_nsfw;
        return !p.is_nsfw;
    });

    return (
        <div className="w-full relative py-12 min-h-screen overflow-hidden text-white bg-[#0a0610]">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

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
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight uppercase">
                                    Эрх сунгах багцаа сонгоно уу
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                                {categories.map((cat: any) => (
                                    <div
                                        key={cat.id}
                                        className="relative group rounded-3xl p-8 border border-white/10 transition-all duration-500 flex flex-col items-center text-center bg-zinc-900/80 backdrop-blur-2xl hover:border-red-600/50 hover:scale-[1.02] shadow-2xl"
                                    >
                                        <div className="relative z-10 w-full flex flex-col items-center">
                                            <div className="mb-8 p-6 rounded-3xl bg-white/5 border border-white/10 group-hover:border-red-600/30 transition-all">
                                                <cat.icon className="w-14 h-14 text-amber-400 group-hover:scale-110 transition-transform duration-500" />
                                            </div>

                                            <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
                                                {cat.title}
                                            </h3>

                                            <div className="space-y-3.5 mb-10 w-full">
                                                {cat.features.map((feature: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-zinc-300 uppercase tracking-tight">
                                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedCategory(cat.id as any);
                                                    setStep(2);
                                                }}
                                                className="w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs transition-all bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 cursor-pointer"
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
                                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer"
                                >
                                    <ArrowLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
                                    {selectedCategory === 'standard' ? '👑 VIP БАГЦ' : '🔥 18+ VIP БАГЦ'} /ТӨЛБӨР ТӨЛӨХ/
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                                {filteredPlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={cn(
                                            "relative group rounded-3xl p-8 border transition-all duration-500 flex flex-col h-full",
                                            "bg-zinc-900/80 backdrop-blur-2xl border-white/10 hover:border-red-600/50 shadow-2xl",
                                            plan.is_recommended && "ring-2 ring-amber-500/50 border-amber-500/30"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase mb-1">{plan.title}</h3>
                                                <p className="text-xs text-zinc-400 font-bold uppercase">{formatDuration(plan.duration_value, plan.duration_unit)}</p>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-xs">
                                                {(Number(plan.price)).toLocaleString()}₮
                                            </div>
                                        </div>

                                        <div className="space-y-3 my-6 flex-1">
                                            {plan.features.map((feat, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                                                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handleSelectPlan(plan)}
                                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 hover:scale-105 transition-all cursor-pointer"
                                        >
                                            Төлбөр төлөх
                                        </button>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 text-white shadow-2xl"
                        >
                            <button 
                                onClick={() => { setSelectedPlan(null); setPaymentMethod(null); setQpayData(null); }}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase">{selectedPlan.title}</h3>
                                <p className="text-sm text-amber-400 font-bold font-mono">{(Number(selectedPlan.price)).toLocaleString()}₮</p>
                            </div>

                            {/* QPay Section */}
                            {!paymentMethod && (
                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={handleQPayCreate}
                                        disabled={loading}
                                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg cursor-pointer"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                                        <span>QPay-ээр төлөх</span>
                                    </button>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                        <p className="text-xs font-bold text-zinc-400 uppercase">Банкны дансаар төлөх (Гүйлгээний утга):</p>
                                        <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/10">
                                            <span className="font-mono font-black text-amber-400 text-sm">{getPaymentMemo()}</span>
                                            <button onClick={() => copyToClipboard(getPaymentMemo())} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer">
                                                <Copy className="w-3.5 h-3.5" /> Хуулах
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active QPay QR Screen */}
                            {paymentMethod === 'qpay' && qpayData && (
                                <div className="space-y-4 pt-2 text-center">
                                    <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center border-4 border-amber-400 shadow-xl">
                                        {qpayData.qr_image ? (
                                            <img src={`data:image/png;base64,${qpayData.qr_image}`} alt="QPay QR" className="w-full h-full object-contain" />
                                        ) : (
                                            <QrCode className="w-24 h-24 text-black" />
                                        )}
                                    </div>

                                    <p className="text-xs text-zinc-400 font-bold">QPay эсвэл Банкны апп-аараа уншуулж төлнө үү</p>

                                    <button
                                        onClick={checkQPayStatus}
                                        disabled={isCheckingPayment}
                                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                                    >
                                        {isCheckingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Төлбөр шалгах"}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
