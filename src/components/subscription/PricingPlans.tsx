"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Check, Crown, Zap, Star, X, Copy, Sparkles, 
    Loader2, QrCode, CreditCard, Film, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getUser8DigitId } from "@/lib/user-id";
import { getPricingPlansAction } from "@/app/actions/vip-actions";

interface PricingPlan {
    id: string;
    title: string;
    price: number | string;
    duration_value: number;
    duration_unit: string;
    features: string[];
    is_recommended?: boolean;
    order_index?: number;
}

const DEFAULT_PLANS: PricingPlan[] = [
    {
        id: 'vip-1-month',
        title: "VIP 1 Сар",
        price: 19900,
        duration_value: 1,
        duration_unit: "months",
        features: [
            "Бүх 18+ видеонуудыг хязгааргүй үзэх",
            "4K Ultra HD & 1080p Full HD чанар",
            "Шууд тоглох хурдан сервэрүүд",
            "Зар сурталчилгаагүй"
        ],
        is_recommended: false
    },
    {
        id: 'vip-3-months',
        title: "VIP 3 Сар",
        price: 49900,
        duration_value: 3,
        duration_unit: "months",
        features: [
            "15% Хэмнэлттэй багц",
            "Бүх 18+ видеонуудыг хязгааргүй үзэх",
            "4K Ultra HD & 1080p Full HD чанар",
            "Шууд тоглох хурдан сервэрүүд",
            "Зар сурталчилгаагүй"
        ],
        is_recommended: true
    },
    {
        id: 'vip-1-year',
        title: "VIP 1 Жил",
        price: 159900,
        duration_value: 1,
        duration_unit: "years",
        features: [
            "35% Өндөр хэмнэлттэй багц",
            "Бүх 18+ эксклюзив контент үзэх",
            "4K Ultra HD ба VIP тусгай сервер",
            "БҮХ шинэ бичлэгүүд шууд үзэх",
            "Зар сурталчилгаагүй"
        ],
        is_recommended: false
    }
];

export function PricingPlans() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
    const [loading, setLoading] = useState(false);
    
    // QPay States
    const [paymentMethod, setPaymentMethod] = useState<'manual' | 'qpay' | null>(null);
    const [qpayData, setQpayData] = useState<any>(null);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);

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
        if (!user) {
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

    return (
        <div className="w-full relative py-12 min-h-screen overflow-hidden text-white bg-[#0a0610]">
            {/* Background glow elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-6xl mx-auto px-4 relative z-10 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs uppercase tracking-widest">
                        <Crown className="w-4 h-4 fill-amber-400" /> VIP ГИШҮҮНЧЛЭЛ
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
                        Хязгааргүй Бүх 18+ Видеонуудыг Үзэх
                    </h1>
                    <p className="text-sm text-zinc-400 max-w-xl mx-auto font-medium">
                        VIP эрх авснаар манай платформын бүх бичлэгүүдийг 4K Ultra HD чанараар заргүй шууд үзэх боломжтой болно.
                    </p>
                </div>

                {/* VIP Subscription Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={cn(
                                "relative group rounded-3xl p-8 border transition-all duration-500 flex flex-col justify-between h-full",
                                "bg-zinc-900/80 backdrop-blur-2xl border-white/10 hover:border-red-600/50 shadow-2xl",
                                plan.is_recommended && "ring-2 ring-amber-500/50 border-amber-500/30 shadow-amber-500/10"
                            )}
                        >
                            {plan.is_recommended && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[10px] uppercase tracking-widest shadow-lg">
                                    ⭐ Санал болгох
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="space-y-2 text-center border-b border-white/10 pb-6">
                                    <h3 className="text-xl font-black text-white uppercase">{plan.title}</h3>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                                            {(Number(plan.price)).toLocaleString()}₮
                                        </span>
                                        <span className="text-xs text-zinc-400 font-bold uppercase">
                                            / {formatDuration(plan.duration_value, plan.duration_unit)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {plan.features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs font-semibold text-zinc-300">
                                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                className={cn(
                                    "w-full mt-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg",
                                    plan.is_recommended
                                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:bg-amber-400 shadow-amber-500/20"
                                        : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:bg-red-500 shadow-red-600/20"
                                )}
                            >
                                VIP Эрх Авах
                            </button>
                        </div>
                    ))}
                </div>
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
                                            <QrCode className="w-24 h-24 text-[#0a0610]" />
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
