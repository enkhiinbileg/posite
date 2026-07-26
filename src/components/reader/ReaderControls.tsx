"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

interface ReaderControlsProps {
    progress: number;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    isVisible: boolean;
}

export function ReaderControls({ progress, onPrev, onNext, hasPrev, hasNext, isVisible }: ReaderControlsProps) {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollToBottom = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    };

    return (
        <>
            {/* Always-on Minimal Progress Line (Discreet) */}
            {!isVisible && (
                <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-black/20 z-[9998] pointer-events-none pb-safe">
                    <motion.div
                        className="h-full bg-primary/40 shadow-[0_0_8px_rgba(229,9,20,0.4)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Main Floating Controls */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none pb-4 md:pb-8 px-2"
            >
                <div className="bg-[#0D0D0D]/80 backdrop-blur-3xl border border-white/10 rounded-full p-1 sm:p-1.5 flex items-center gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)] pointer-events-auto mx-auto max-w-[calc(100vw-1rem)] sm:max-w-fit">

                    {/* Navigation Group */}
                    <div className="flex items-center bg-white/5 rounded-full p-0.5 sm:p-1">
                        <button
                            onClick={onPrev}
                            disabled={!hasPrev}
                            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 disabled:opacity-5 transition-all active:scale-90 text-white/50 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        <div className="w-px h-3 sm:h-4 bg-white/10 mx-0.5 sm:mx-1" />

                        <button
                            onClick={onNext}
                            disabled={!hasNext}
                            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 disabled:opacity-5 transition-all active:scale-90 text-white/50 hover:text-white"
                        >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Progress Pill */}
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 bg-white/5 rounded-full">
                        <span className="text-[10px] sm:text-[11px] font-bold text-white/80 tabular-nums min-w-[28px] sm:min-w-[32px]">
                            {Math.round(progress)}%
                        </span>
                        <div className="w-16 xs:w-24 sm:w-32 h-1 bg-white/10 rounded-full overflow-hidden relative">
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_rgba(229,9,20,0.5)]"
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {/* Scroll Group */}
                    <div className="flex items-center bg-white/5 rounded-full p-0.5 sm:p-1">
                        <button
                            onClick={scrollToTop}
                            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 text-white/50 hover:text-white"
                        >
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                            onClick={scrollToBottom}
                            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90 text-white/50 hover:text-white"
                        >
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
