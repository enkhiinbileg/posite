"use client";

import { motion } from "framer-motion";
import { Info, Flame, Snowflake, Trophy, Calendar, Zap, Star, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const GUIDES = [
    {
        title: "Persistence (Стрийк)",
        description: "Өдөр бүр вэбтүүн уншиж өөрийн стрийкийг асаагаарай. 1 л өдөр алгасвал стрийк тань устах аюултай!",
        icon: Flame,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        features: ["Улаанбаатар цагаар 00:00-д шинэчлэгдэнэ", "Нэвтрэх эсвэл Бүлэг уншихад идэвхжинэ"]
    },
    {
        title: "Protection (Хөлдөөгч)",
        description: "Strike Freeze буюу хөлдөөгч нь таныг нэг өдөр уншиж амжаагүй үед стрийкийг тань хамгаалж үлдэнэ.",
        icon: Snowflake,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        features: ["7 хоног тутамд 1 хөлдөөгч бэлгэнд авна", "Дээд тал нь 3 хөлдөөгч нөөцлөх боломжтой"]
    },
    {
        title: "Evolution (Хүчирхэгжих)",
        description: "Таны стрийк ихсэх тусам таны Navbar дээрх гал илүү хүчирхэг болж өөрчлөгдөнө.",
        icon: Zap,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        features: ["1-6 хоног: 🔥 Стандарт", "7-29 хоног: ⚡ Цэнхэр аянга", "30+ хоног: 💎 Алмазан эрдэнэ"]
    }
];

export function StrikeGuide() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 py-12">
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20"
                >
                    <Info className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white italic">Гарын авлага</h2>
                <p className="text-muted max-w-lg mx-auto">
                    Стрийк системээ бүрэн ашиглаж, өөрийгөө хэрхэн хөгжүүлэх тухай дэлгэрэнгүй заавар.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GUIDES.map((guide, idx) => (
                    <motion.div
                        key={guide.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group relative rounded-3xl border border-white/5 bg-surface p-8 hover:border-white/10 transition-all flex flex-col"
                    >
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", guide.bg)}>
                            <guide.icon className={cn("w-7 h-7", guide.color)} />
                        </div>

                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-3 italic">{guide.title}</h3>
                        <p className="text-muted text-sm leading-relaxed mb-8 flex-1">{guide.description}</p>

                        <ul className="space-y-3">
                            {guide.features.map(f => (
                                <li key={f} className="flex items-start gap-2 text-[10px] font-bold text-muted/60 uppercase tracking-wide">
                                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>

            {/* Pro Tips Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="rounded-[2.5rem] border border-primary/20 bg-primary/5 p-8 md:p-12 relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Pro Tips</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm mb-1 uppercase tracking-tight">VIP Давуу тал</p>
                                    <p className="text-muted text-xs leading-relaxed">VIP хэрэглэгчид сар бүр 3 "Freeze" бэлгэнд авч, стрийкээ удаан хадгалах боломжтой.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Хуанли ашиглах</p>
                                    <p className="text-muted text-xs leading-relaxed">Профайл хэсэг дэх хуанлигаа тогтмол шалгаж, аль өдрүүдэд амарч, аль өдрүүдэд идэвхтэй байснаа хянах.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/60 rounded-3xl p-8 border border-white/10 relative">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest italic opacity-60">Preview</h4>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                                <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
                                <span className="text-white font-black text-xl italic">14 DAYS STREAK</span>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                <Snowflake className="w-6 h-6 text-blue-400 fill-blue-400" />
                                <span className="text-white font-black text-xl italic text-blue-400">2 FREEZES LEFT</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
