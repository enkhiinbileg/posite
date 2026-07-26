"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Flame, Milestone } from "lucide-react";
import { StrikeConfetti } from "./StrikeConfetti";

interface MilestonePopupProps {
    isOpen: boolean;
    onClose: () => void;
    strikeCount: number;
}

export function MilestonePopup({ isOpen, onClose, strikeCount }: MilestonePopupProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <StrikeConfetti />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm bg-surface-lighter border border-white/10 rounded-3xl p-8 text-center shadow-2xl overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[80px] -z-10" />

                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/20"
                            >
                                <Flame className="w-12 h-12 text-white fill-white" />
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring" }}
                                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-yellow-500 border-4 border-surface-lighter flex items-center justify-center shadow-lg"
                            >
                                <Trophy className="w-5 h-5 text-black" />
                            </motion.div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">
                        {strikeCount} ӨДӨР!
                    </h2>
                    <p className="text-muted text-sm mb-8 leading-relaxed">
                        Гайхалтай! Та {strikeCount} өдөр дараалан идэвхтэй байж чадлаа. <br />
                        Consistency is the key to mastery! 🚀
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Үргэлжлүүлэх
                    </button>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
