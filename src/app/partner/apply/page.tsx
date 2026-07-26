"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Youtube, CheckCircle2, ShieldCheck, Wallet, ArrowRight, User, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
    { id: 'welcome', title: 'Тавтай морил' },
    { id: 'agreement', title: 'Гэрээ' },
    { id: 'info', title: 'Мэдээлэл' },
    { id: 'success', title: 'Амжилттай' }
];

export default function PartnerApplyPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [agreed, setAgreed] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "",
        youtubeChannelName: "",
        youtubeChannelUrl: ""
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth");
                return;
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile?.is_youtuber) {
                router.push("/admin/youtuber");
                return;
            }
            setUser(user);
        };
        checkUser();
    }, []);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const generateReferralCode = async (channelName: string) => {
        let baseCode = channelName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!baseCode) baseCode = "partner";

        let finalCode = baseCode;
        let isUnique = false;
        let counter = 0;

        while (!isUnique) {
            const { data } = await supabase
                .from('profiles')
                .select('referral_code')
                .eq('referral_code', finalCode)
                .single();

            if (!data) {
                isUnique = true;
            } else {
                counter++;
                finalCode = `${baseCode}${counter}`;
            }
        }
        return finalCode;
    };

    const handleSubmit = async () => {
        if (!agreed) {
            toast.error("Та гэрээний нөхцөлийг зөвшөөрөх ёстой.");
            return;
        }

        setLoading(true);
        try {
            const referralCode = await generateReferralCode(formData.youtubeChannelName);

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_youtuber: true,
                    affiliate_tier: 'bronze',
                    referral_code: referralCode,
                    bank_name: formData.bankName,
                    bank_account_number: formData.bankAccountNumber,
                    bank_account_name: formData.bankAccountName,
                    youtube_channel_name: formData.youtubeChannelName,
                    youtube_channel_url: formData.youtubeChannelUrl,
                    agreed_to_terms_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success("Та Ютүбэр хамтрагчаар амжилттай бүртгэгдлээ!");
            handleNext();
        } catch (error: any) {
            toast.error("Алдаа гарлаа: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-red-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-red-600/5 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 lg:py-24">
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-primary mb-4"
                    >
                        <Youtube className="w-3 h-3" />
                        Албан ёсны хамтрагч
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter"
                    >
                        Partner <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">Program</span>
                    </motion.h1>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-16">
                    <div className="flex items-center gap-2 md:gap-4 p-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-xl">
                        {STEPS.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;

                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={cn(
                                        "relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-500",
                                        isActive ? "bg-primary text-white scale-110 shadow-[0_0_20px_rgba(220,38,38,0.4)]" :
                                            isCompleted ? "bg-white/10 text-white" : "bg-transparent text-white/20"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <span className="text-xs md:text-sm font-bold">{index + 1}</span>}

                                        {isActive && (
                                            <motion.div
                                                layoutId="active-step-glow"
                                                className="absolute inset-0 bg-primary/50 blur-xl rounded-full -z-10"
                                            />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "ml-2 md:ml-3 text-[10px] md:text-xs font-bold uppercase tracking-wider hidden md:block transition-colors duration-300",
                                        isActive ? "text-white" : "text-white/20"
                                    )}>
                                        {step.title}
                                    </span>
                                    {index < STEPS.length - 1 && (
                                        <div className="w-4 md:w-8 h-[1px] bg-white/10 mx-2 md:mx-4" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Card */}
                <motion.div
                    layout
                    className="bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/5 rounded-[40px] p-6 md:p-12 shadow-2xl relative overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-12"
                            >
                                <div className="grid md:grid-cols-3 gap-6">
                                    {[
                                        { icon: Wallet, title: "Өндөр Шимтгэл", desc: "Борлуулалт бүрээс 20-30% хувь" },
                                        { icon: ShieldCheck, title: "Албан ёсны эрх", desc: "Контент ашиглах зөвшөөрөл" },
                                        { icon: CheckCircle2, title: "Шуурхай Төлөлт", desc: "Сар бүрийн тогтмол шилжүүлэг" }
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 hover:-translate-y-1"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/5 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight mb-2">{item.title}</h3>
                                            <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleNext}
                                        className="group relative px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                        <span className="relative z-10 group-hover:text-white transition-colors flex items-center gap-2">
                                            Эхлэх <ArrowRight className="w-5 h-5" />
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div
                                key="agreement"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="prose prose-invert max-w-none h-[400px] overflow-y-auto custom-scrollbar p-6 rounded-3xl bg-white/5 border border-white/5">
                                    <h3 className="font-black text-2xl uppercase tracking-tighter text-white mb-6">Хамтын ажиллагааны гэрээ</h3>

                                    <div className="space-y-6 text-sm text-gray-400">
                                        <section>
                                            <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-2">1. Ерөнхий нөхцөл</h4>
                                            <p>Энэхүү гэрээ нь нэг талаас Платформ, нөгөө талаас Хамтрагч нарын хоорондын харилцааг зохицуулна.</p>
                                        </section>

                                        <section>
                                            <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-2">2. Шимтгэл ба Урамшуулал</h4>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>Bronze Tier: 20% шимтгэл</li>
                                                <li>Silver Tier: 25% шимтгэл (&gt;10 хэрэглэгч)</li>
                                                <li>Gold Tier: 30% шимтгэл (&gt;50 хэрэглэгч)</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-2">3. Төлбөр тооцоо</h4>
                                            <p>Төлбөрийг сар бүрийн 1-5-ны өдрүүдэд 50,000₮-с дээш үлдэгдэлтэй тохиолдолд шилжүүлнэ.</p>
                                        </section>

                                        <section>
                                            <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-2">4. Үүрэг хариуцлага</h4>
                                            <p>Хуурамч мэдээлэл тараах, спам хийх зэрэг зохисгүй үйлдэл гаргасан тохиолдолд гэрээг цуцална.</p>
                                        </section>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            id="agree"
                                            checked={agreed}
                                            onChange={(e) => setAgreed(e.target.checked)}
                                            className="peer w-6 h-6 rounded-md border-2 border-red-500/50 bg-transparent text-red-600 focus:ring-offset-0 focus:ring-0 cursor-pointer"
                                        />
                                    </div>
                                    <label htmlFor="agree" className="text-sm font-medium text-white/80 cursor-pointer select-none">
                                        Би гэрээний нөхцөлүүдийг бүрэн уншиж танилцсан бөгөөд зөвшөөрч байна
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={handleBack} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-colors text-muted hover:text-white">
                                        Буцах
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!agreed}
                                        className="flex-[2] py-4 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Зөвшөөрч байна
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Bank Info */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 text-primary mb-2">
                                            <Wallet className="w-5 h-5" />
                                            <h3 className="font-black uppercase tracking-widest text-xs">Банкны мэдээлэл</h3>
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted group-focus-within:text-white transition-colors ml-1">Банкны нэр</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.bankName}
                                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 focus:border-primary/50 py-4 px-6 rounded-2xl text-white outline-none transition-all focus:bg-white/5 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-neutral-900 text-muted">Банкаа сонгоно уу</option>
                                                    {[
                                                        "Хаан Банк",
                                                        "Голомт Банк",
                                                        "Худалдаа Хөгжлийн Банк",
                                                        "Төрийн Банк",
                                                        "Хас Банк",
                                                        "Капитрон Банк",
                                                        "Ариг Банк",
                                                        "Богд Банк",
                                                        "Тээвэр Хөгжлийн Банк",
                                                        "М Банк",
                                                        "Чингис Хаан Банк",
                                                        "Үндэсний Хөрөнгө Оруулалтын Банк"
                                                    ].map((bank) => (
                                                        <option key={bank} value={bank} className="bg-neutral-900 text-white py-2">{bank}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {[
                                            { label: 'Дансны дугаар', key: 'bankAccountNumber', placeholder: 'Дансны дугаар' },
                                            { label: 'Дансны нэр', key: 'bankAccountName', placeholder: 'Дансны эзэмшигчийн нэр' },
                                        ].map((field) => (
                                            <div key={field.key} className="space-y-2 group">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted group-focus-within:text-white transition-colors ml-1">{field.label}</label>
                                                <input
                                                    type="text"
                                                    value={formData[field.key as keyof typeof formData]}
                                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-black/50 border border-white/10 focus:border-primary/50 py-4 px-6 rounded-2xl text-white outline-none transition-all focus:bg-white/5 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder:text-white/20"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Channel Info */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 text-red-500 mb-2">
                                            <Youtube className="w-5 h-5" />
                                            <h3 className="font-black uppercase tracking-widest text-xs">Сувгийн мэдээлэл</h3>
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted group-focus-within:text-white transition-colors ml-1">Сувгийн нэр</label>
                                            <input
                                                type="text"
                                                value={formData.youtubeChannelName}
                                                onChange={(e) => setFormData({ ...formData, youtubeChannelName: e.target.value })}
                                                placeholder="Сувгийн нэр"
                                                className="w-full bg-black/50 border border-white/10 focus:border-red-500/50 py-4 px-6 rounded-2xl text-white outline-none transition-all focus:bg-white/5 focus:shadow-[0_0_20px_rgba(220,38,38,0.1)] placeholder:text-white/20"
                                            />
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted group-focus-within:text-white transition-colors ml-1">Сувгийн холбоос</label>
                                            <input
                                                type="text"
                                                value={formData.youtubeChannelUrl}
                                                onChange={(e) => setFormData({ ...formData, youtubeChannelUrl: e.target.value })}
                                                placeholder="https://youtube.com/@..."
                                                className="w-full bg-black/50 border border-white/10 focus:border-red-500/50 py-4 px-6 rounded-2xl text-white outline-none transition-all focus:bg-white/5 focus:shadow-[0_0_20px_rgba(220,38,38,0.1)] placeholder:text-white/20"
                                            />
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 mt-8">
                                            <Info className="w-5 h-5 text-muted shrink-0" />
                                            <p className="text-xs text-muted leading-relaxed">
                                                Таны Referral код сувгийн нэр дээр үндэслэн автоматаар үүснэ. Давхардахгүй байх үүднээс төгсгөлд нь тоо нэмэгдэж магадгүй.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-8 border-t border-white/5">
                                    <button onClick={handleBack} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-colors text-muted hover:text-white">
                                        Буцах
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !formData.bankAccountNumber || !formData.youtubeChannelName}
                                        className="flex-[2] py-4 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Бүртгүүлэх'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12 }}
                                    className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-black mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)]"
                                >
                                    <CheckCircle2 className="w-12 h-12" />
                                </motion.div>

                                <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Баяр хүргэе!</h2>
                                <p className="text-muted text-lg max-w-md mx-auto mb-12">
                                    Та албан ёсоор манай платформын хамтрагч боллоо. Таны referral код идэвхжсэн.
                                </p>

                                <button
                                    onClick={() => router.push("/admin/youtuber")}
                                    className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95"
                                >
                                    Хяналтын самбар руу шилжих
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
