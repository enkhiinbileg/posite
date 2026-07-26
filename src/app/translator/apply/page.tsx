'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, ChevronRight, ScrollText,
    CreditCard, User, Sparkles, Building2, Globe2,
    Languages, Wallet, Trophy, ArrowRight, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const STEPS = [
    { id: 'welcome', title: 'Тавтай морил' },
    { id: 'agreement', title: 'Хамтын ажиллагаа' },
    { id: 'info', title: 'Мэдээлэл бүртгүүлэх' },
    { id: 'success', title: 'Амжилттай' }
];

export default function TranslatorApplyPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        bankName: '',
        bankAccount: '',
        bankAccountName: '',
        languages: '',
        experience: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth?redirect=/translator/apply');
                return;
            }
            setUser(user);

            // Check if already a translator
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_translator')
                .eq('id', user.id)
                .single();

            if (profile?.is_translator) {
                toast.info('Та аль хэдийн орчуулагч болсон байна!');
                router.push('/translator/dashboard');
            }
        }
        checkUser();
    }, [router]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bank_name: formData.bankName,
                    bank_account_number: formData.bankAccount,
                    bank_account_name: formData.bankAccountName,
                    is_translator: true,
                    // Additional metadata could be stored if schema allows, e.g. experience
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Орчуулагчаар амжилттай бүртгэгдлээ!');
            handleNext();
        } catch (error: any) {
            toast.error('Алдаа гарлаа: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
            </div>

            <div className="w-full max-w-4xl relative z-10">
                {/* Steps Indicator */}
                <div className="mb-12">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -z-10" />
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex flex-col items-center gap-3 bg-black px-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 border-2 ${index <= currentStep
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110'
                                    : 'bg-black border-white/10 text-muted'
                                    }`}>
                                    {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${index <= currentStep ? 'text-white' : 'text-muted/50'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] min-h-[500px] relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: WELCOME */}
                        {currentStep === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col items-center text-center space-y-8"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-4 rotate-3 hover:rotate-6 transition-transform">
                                    <Globe2 className="w-12 h-12 text-white" />
                                </div>

                                <div className="space-y-4 max-w-2xl">
                                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-gradient-premium">
                                        Дэлхийн контентыг<br />Монголд
                                    </h1>
                                    <p className="text-muted text-lg leading-relaxed font-medium">
                                        Таны орчуулсан бүлэг бүр мөнгө болж хувирах <span className="text-white font-bold">Royalty Pool</span> системд тавтай морил.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-8">
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all text-center group">
                                        <Wallet className="w-8 h-8 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                        <h3 className="text-sm font-black uppercase tracking-wide mb-2">Шударга Орлого</h3>
                                        <p className="text-xs text-muted leading-relaxed">VIP уншилтын тоогоор 50-70%-ийн ашиг хүртэх боломж.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/50 transition-all text-center group">
                                        <Languages className="w-8 h-8 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                        <h3 className="text-sm font-black uppercase tracking-wide mb-2">Хязгааргүй Сонголт</h3>
                                        <p className="text-xs text-muted leading-relaxed">Манга, Манхва, Вэбтүүн гээд хүссэнээ орчуулаарай.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 transition-all text-center group">
                                        <Trophy className="w-8 h-8 text-purple-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                        <h3 className="text-sm font-black uppercase tracking-wide mb-2">Top Creator</h3>
                                        <p className="text-xs text-muted leading-relaxed">Шилдэг орчуулагч нар сард сая саяар нь олох систем.</p>
                                    </div>
                                </div>

                                <button onClick={handleNext} className="mt-8 px-10 py-5 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 group">
                                    Эхлэх <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 2: AGREEMENT */}
                        {currentStep === 1 && (
                            <motion.div
                                key="agreement"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">Хамтын Ажиллагааны Гэрээ</h2>
                                        <p className="text-muted text-sm font-bold mt-1">Миний Бүтээл - Миний Орлого (Royalty Pool Model)</p>
                                    </div>
                                    <ScrollText className="w-8 h-8 text-primary opacity-50" />
                                </div>

                                <div className="bg-black/50 border border-white/10 rounded-3xl p-8 h-[500px] overflow-y-auto custom-scrollbar text-sm text-muted leading-relaxed space-y-8 text-justify">
                                    <div className="space-y-4">
                                        <p className="text-xs text-white/50 uppercase tracking-widest text-center border-b border-white/10 pb-4">Батлав. MyToon Admin</p>
                                        <p>
                                            Энэхүү <strong>ОРЧУУЛАГЧИЙН ХАМТЫН АЖИЛЛАГААНЫ ГЭРЭЭ</strong> (цаашид "Гэрээ" гэх) нь нэг талаас "MyToon" платформ (цаашид "Платформ" гэх), нөгөө талаас Орчуулагч (цаашид "Хамтрагч" гэх) хооронд албан ёсоор байгуулагдаж байна.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">1. Нийтлэг үндэслэл</h4>
                                        <p>
                                            1.1. Хамтрагч нь гадаад хэл дээрх контентыг (Манга, Манхва, Вэбтүүн) Монгол хэл рүү чанарын өндөр түвшинд хөрвүүлэн Платформд байршуулна.<br />
                                            1.2. Платформ нь Хамтрагчийн бүтээлийг уншигчдад хүргэх, борлуулах, орлого хуваарилах дэд бүтцээр хангана.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">2. Орлогын Хуваарилалт (Royalty Pool)</h4>
                                        <p>
                                            2.1. Бид дэлхийн жишигт нийцсэн <strong>"Royalty Pool"</strong> системийг ашиглана. Хамтрагч нь өөрийн орчуулсан бүлгийн <strong>VIP уншилт</strong> тус бүрээс хувь хүртэнэ.<br />
                                            2.2. Орлогын хувь хэмжээ: Нийт цэвэр ашгийн **50% - 70%** (Хамтрагчийн зэрэглэлээс хамаарна).<br />
                                            2.3. Тооцоолол: `(Таны VIP уншилт / Нийт VIP уншилт) × Орчуулгын Сан` аргачлалаар бодитоор тооцогдоно.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">3. Чанарын Стандарт & Үүрэг</h4>
                                        <p>
                                            3.1. <strong>Орчуулга:</strong> Google Translate болон бусад AI хэрэгсэл ашиглахыг зөвшөөрөх ч заавал хүний хяналт (Human Editing) хийгдсэн, найруулга зүйн алдаагүй байх шаардлагатай.<br />
                                            3.2. <strong>Зураг (Cleaning/Typesetting):</strong> Англи/Гадаад текст бүрэн арилсан, Монгол текст нь зургийн уур амьсгалд тохирсон фонтоор бичигдсэн байна. Watermark ашиглахыг хориглоно.<br />
                                            3.3. **Тогтмол байдал:** Идэвхтэй төслүүд долоо хоногт дор хаяж 1 бүлэг шинэчлэгдэх ёстой. 30 хоног шинэчлэгдээгүй төслийг Платформ өөр орчуулагчид шилжүүлэх эрхтэй.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">4. Төлбөр Тооцоо</h4>
                                        <p>
                                            4.1. Орлогыг бодит цагаар (Real-time) Админ самбараас хянах боломжтой.<br />
                                            4.2. Төлбөрийн хүсэлтийг сар бүрийн 1-нээс 5-ны хооронд илгээх ба Платформ 10-ны дотор Хамтрагчийн бүртгэлтэй данс руу шилжүүлнэ.<br />
                                            4.3. Доод татах дүн: 50,000₮.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">5. Оюуны Өмч & Нууцлал</h4>
                                        <p>
                                            5.1. Хамтрагчийн Платформ дээр үүсгэсэн "Монгол хувилбар"-ын түгээх эрхийг Платформ эзэмшинэ.<br />
                                            5.2. Хамтрагч нь Платформын дотоод мэдээлэл, хараахан нийтлэгдээгүй бүлгүүдийг гуравдагч этгээдэд задруулахыг хориглоно.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-primary font-black uppercase tracking-widest text-xs">6. Гэрээ цуцлах</h4>
                                        <p>
                                            6.1. Чанарын шаардлага хангаагүй, бусдын бүтээлийг хуулбарласан, эсвэл ёс зүйн ноцтой зөрчил гаргасан тохиолдолд Платформ гэрээг нэг талын санаачилгаар цуцалж, бүртгэлийг хаах эрхтэй.
                                        </p>
                                    </div>

                                    <div className="border-t border-white/10 pt-6 mt-8">
                                        <div className="flex items-start gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
                                            <div className="min-w-[4px] h-full bg-primary rounded-full" />
                                            <p className="text-xs text-white/80 italic">
                                                Энэхүү гэрээ нь цахим "Click-wrap" хэлбэрээр байгуулагдах бөгөөд "ЗӨВШӨӨРЧ БАЙНА" товчийг дарснаар та дээрх нөхцөлүүдийг бүрэн хүлээн зөвшөөрч, гарын үсэг зурсанд тооцогдоно.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setCurrentStep(0)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-colors text-muted hover:text-white">
                                        Буцах
                                    </button>
                                    <button onClick={handleNext} className="flex-[2] py-4 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        Зөвшөөрч байна
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: INFORMATION */}
                        {currentStep === 2 && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Бүртгэлийн Мэдээлэл</h2>
                                    <p className="text-muted text-sm">Орлогоо хүлээн авах дансаа холбоно уу</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Банкны Нэр</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted z-10" />
                                                <select
                                                    value={formData.bankName}
                                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-10 text-sm font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer"
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
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">▼</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Дансны Дугаар</label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                                <input
                                                    type="number"
                                                    value={formData.bankAccount}
                                                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                                    placeholder="0000000000"
                                                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-all placeholder:text-muted/20"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Данс Эзэмшигчийн Нэр</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                            <input
                                                type="text"
                                                value={formData.bankAccountName}
                                                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                                                placeholder="Овог Нэр"
                                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-all placeholder:text-muted/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
                                        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-white">Мэдээллийн нууцлал</p>
                                            <p className="text-[10px] text-muted leading-relaxed">Таны банкны мэдээлэл зөвхөн орлого шилжүүлэх зорилгоор ашиглагдах бөгөөд гуравдагч этгээдэд дамжуулахгүй.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-colors text-muted hover:text-white">
                                        Буцах
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isLoading || !formData.bankName || !formData.bankAccount || !formData.bankAccountName}
                                        className="flex-[2] py-4 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Бүртгүүлэх'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {currentStep === 3 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center space-y-8 py-12"
                            >
                                <div className="relative">
                                    <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce-slow">
                                        <CheckCircle2 className="w-16 h-16 text-white" />
                                    </div>
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl -z-10 animate-pulse" />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Амжилттай!</h2>
                                    <p className="text-muted text-lg max-w-md mx-auto">
                                        Та албан ёсоор MyToon-ы <span className="text-emerald-500 font-bold">Орчуулагч</span> боллоо.
                                    </p>
                                </div>

                                <div className="grid gap-4 w-full max-w-sm">
                                    <Link href="/admin/imagetrans" className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl">
                                        Infinite Editor руу орох
                                    </Link>
                                    <Link href="/" className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm text-muted hover:text-white transition-colors">
                                        Нүүр хуудас руу буцах
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
