"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ChevronRight, Star } from "lucide-react";
import { RANKS } from "@/lib/leveling";
import { cn } from "@/lib/utils";

interface RanksGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RanksGuide({ isOpen, onClose }: RanksGuideProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] z-[201] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                                    <Star className="w-8 h-8 text-primary fill-primary" />
                                    Цолны Систем
                                </h2>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mt-1">Status & Rank Requirements</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-2x bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Ranks List */}
                        <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar space-y-4">
                            {RANKS.map((rank, index) => {
                                const minLevel = Math.floor(Math.sqrt(rank.minXP / 50)) + 1;

                                return (
                                    <motion.div
                                        key={rank.name}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={cn(
                                            "relative group p-6 rounded-3xl border transition-all duration-500 overflow-hidden",
                                            rank.bgGradient,
                                            rank.border
                                        )}
                                    >
                                        {/* Glow Effect */}
                                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700", rank.glow)} />

                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center bg-black/40 border border-white/10 shadow-2xl")}>
                                                    <rank.icon className={cn("w-8 h-8", rank.iconColor)} />
                                                </div>
                                                <div>
                                                    <h3 className={cn("text-xl font-black uppercase italic tracking-tight", rank.textGradient)}>
                                                        {rank.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Level {minLevel}+</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{rank.minXP.toLocaleString()} XP</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right hidden sm:block">
                                                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center bg-white/5 group-hover:border-primary/50 transition-colors">
                                                    <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Footer Info */}
                        <div className="p-8 bg-black/40 border-t border-white/5">
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] font-medium leading-relaxed text-blue-100/70">
                                    Түвшин ахих тусам шаардагдах XP оноо экспоненциалаар нэмэгдэнэ.
                                    Илүү их бүлэг уншиж, лайк дарж, сэтгэгдэл бичсэнээр та "World-class" зэрэглэлд хүрэх боломжтой.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
