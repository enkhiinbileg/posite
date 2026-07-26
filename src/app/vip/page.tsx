"use client";

import { PricingPlans } from "@/components/subscription/PricingPlans";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronRight, Zap, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
    {
        q: "Төлбөр төлсний дараа хэзээ идэвхжих вэ?",
        a: "QPay-ээр төлсөн тохиолдолд таны эрх шууд (автоматаар) идэвхжинэ. Банкны шилжүүлгээр бол манай модераторууд шалгаад 5-30 минутын дотор идэвхжүүлдэг."
    },
    {
        q: "Би олон удаа сунгаж болох уу?",
        a: "Тиймээ, таны авсан багцууд хоорондоо нэмэгдэж (Stack) сунгагдах болно. Жишээ нь: 1 сарын эрх дээр дахиад 3 сар авбал нийт 4 сар болж сунгагдана."
    },
    {
        q: "18+ контент яаж үзэх вэ?",
        a: "Та 18+ VIP багцыг авснаар вэбсайтын 'Secret' хэсэгт нэвтрэх боломжтой болно. Энэ нь зөвхөн насанд хүрэгчдэд зориулсан тусгай хэсэг юм."
    },
    {
        q: "VIP эрх дуусахад яах вэ?",
        a: "Эрх дуусахад таны профайл дээрх VIP тэмдэг арилж, VIP бүлгүүдийг унших боломжгүй болно. Та хүссэн үедээ дахин сунгах боломжтой."
    }
];

export default function VipPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <main className="min-h-screen w-full bg-[#050505] overflow-x-hidden pt-[10px]">

            {/* Pricing Section */}
            <section className="pb-32">
                <PricingPlans />
            </section>

            {/* FAQ Section - Clean & Understated */}
            <section className="max-w-3xl mx-auto px-4 py-32 pb-60 border-t border-white/5">
                <div className="flex flex-col items-center text-center mb-16 gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                        <HelpCircle className="w-5 h-5 text-white/40" />
                    </div>
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/50">Түгээмэл асуултууд</h2>
                </div>

                <div className="space-y-4">
                    {FAQS.map((faq, i) => (
                        <div key={i} className="border-b border-white/5 last:border-0 pb-4">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className={cn(
                                    "w-full py-4 text-left transition-all duration-500 group",
                                    openFaq === i ? "opacity-100" : "opacity-60 hover:opacity-100"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] font-black uppercase tracking-widest text-white">{faq.q}</span>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 text-white/20 transition-transform duration-500 group-hover:text-primary",
                                        openFaq === i && "rotate-90 text-primary"
                                    )} />
                                </div>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="pt-6 pb-2 text-white/40 text-[11px] font-medium leading-relaxed uppercase tracking-wider">
                                                {faq.a}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}


